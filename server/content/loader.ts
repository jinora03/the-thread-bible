import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { getBook } from '@shared/scripture/books'
import { parseRichText } from '@shared/rich-text'
import {
  basicEntityFileSchema,
  chapterNotesFileSchema,
  connectionsFileSchema,
  doctrineFileSchema,
  homeFileSchema,
  personFileSchema,
  placeFileSchema,
  prophecyFileSchema,
  studyFileSchema,
  threadFileSchema,
} from '@shared/schemas/content'
import type { Connection, Thread } from '@shared/types/connections'
import type { ChapterContext, Entity, EntityId, EntityKind, ReviewInfo } from '@shared/types/content'

/** Folder name → entity kind and the schema its files follow. */
const entityFolders: Record<string, { kind: EntityKind; schema: z.ZodType }> = {
  doctrines: { kind: 'doctrine', schema: doctrineFileSchema },
  prophecies: { kind: 'prophecy', schema: prophecyFileSchema },
  studies: { kind: 'study', schema: studyFileSchema },
  themes: { kind: 'theme', schema: basicEntityFileSchema },
  typology: { kind: 'typology', schema: basicEntityFileSchema },
  people: { kind: 'person', schema: personFileSchema },
  places: { kind: 'place', schema: placeFileSchema },
  events: { kind: 'event', schema: basicEntityFileSchema },
  covenants: { kind: 'covenant', schema: basicEntityFileSchema },
  promises: { kind: 'promise', schema: basicEntityFileSchema },
  symbols: { kind: 'symbol', schema: basicEntityFileSchema },
  genealogies: { kind: 'genealogy', schema: basicEntityFileSchema },
}

export type ContentStage = 'preview' | 'published'

export interface ContentStore {
  stage: ContentStage
  entities: Map<EntityId, Entity>
  connections: Connection[]
  chapterNotes: (ChapterContext & { title: string })[]
  threads: Map<string, Thread>
  home: z.infer<typeof homeFileSchema>
}

export class ContentValidationError extends Error {
  readonly problems: string[]

  constructor(problems: string[]) {
    super(`Content validation failed:\n${problems.map((problem) => `  • ${problem}`).join('\n')}`)
    this.problems = problems
  }
}

// House style: no long dashes (U+2014). See content/GUIDELINES.md.
// Built from its code point so this file itself stays free of the character.
const LONG_DASH_CHAR = String.fromCharCode(0x2014)
const LONG_DASH = new RegExp(LONG_DASH_CHAR)
const LONG_DASH_ADVICE = `avoid the long dash (${LONG_DASH_CHAR}); use a comma, colon, parentheses or a full stop`

/** Every string in a parsed YAML document, with its path (e.g. `article.teaching.0`). */
function stringsIn(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]]
  const join = (key: string | number) => (path ? `${path}.${key}` : String(key))
  if (Array.isArray(value)) return value.flatMap((item, index) => stringsIn(item, join(index)))
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => stringsIn(item, join(key)))
  return []
}

const isVisible = (review: ReviewInfo, stage: ContentStage) => stage === 'preview' || review.status === 'published'

/**
 * Loads, validates and cross-checks every file under `content/`.
 * Throws a single ContentValidationError listing every problem found.
 */
export function loadContent(root: string, stage: ContentStage): ContentStore {
  const problems: string[] = []
  const where = (file: string) => relative(root, file).replace(/\\/g, '/')

  const readYaml = <T>(file: string, schema: z.ZodType<T>): T | undefined => {
    let raw: unknown
    try {
      raw = parse(readFileSync(file, 'utf8'))
    } catch (error) {
      problems.push(`${where(file)}: invalid YAML: ${(error as Error).message}`)
      return undefined
    }
    for (const [path, text] of stringsIn(raw)) {
      if (LONG_DASH.test(text)) problems.push(`${where(file)} → ${path || '(root)'}: ${LONG_DASH_ADVICE}`)
    }
    const result = schema.safeParse(raw)
    if (!result.success) {
      for (const issue of result.error.issues) problems.push(`${where(file)} → ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      return undefined
    }
    return result.data
  }

  const yamlFiles = (folder: string) => {
    const dir = join(root, folder)
    return existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.yaml')).map((name) => join(dir, name)) : []
  }

  // Entities -----------------------------------------------------------------
  const allEntities = new Map<EntityId, Entity>()
  // Files that exist but failed validation: already reported, so links to them are not.
  const invalidIds = new Set<EntityId>()
  for (const [folder, { kind, schema }] of Object.entries(entityFolders)) {
    for (const file of yamlFiles(folder)) {
      const slug = basename(file, '.yaml')
      if (!/^[a-z0-9-]+$/.test(slug)) problems.push(`${where(file)}: file names become URLs, so use lowercase letters, digits and hyphens`)
      const id = `${kind}:${slug}` as EntityId
      const fields = readYaml(file, schema)
      if (!fields) {
        invalidIds.add(id)
        continue
      }
      allEntities.set(id, { ...(fields as object), id, kind, slug } as Entity)
    }
  }

  // Everything else ------------------------------------------------------------
  const connectionFiles = yamlFiles('connections').flatMap((file) => {
    const data = readYaml(file, connectionsFileSchema)
    return data ? [{ file, ...data }] : []
  })
  const noteFiles = yamlFiles('chapter-notes').flatMap((file) => {
    const data = readYaml(file, chapterNotesFileSchema)
    return data ? [{ file, ...data }] : []
  })
  const threadFiles = yamlFiles('threads').flatMap((file) => {
    const data = readYaml(file, threadFileSchema)
    return data ? [{ file, id: basename(file, '.yaml'), ...data }] : []
  })
  const homeFile = join(root, 'site', 'home.yaml')
  const home = existsSync(homeFile) ? readYaml(homeFile, homeFileSchema) : undefined
  if (!home) problems.push('site/home.yaml: missing or invalid')

  // Cross-references -------------------------------------------------------------
  const checkId = (file: string, id: string) => {
    if (!allEntities.has(id as EntityId) && !invalidIds.has(id as EntityId)) problems.push(`${where(file)}: links to "${id}", which does not exist`)
  }
  const checkRichText = (file: string, text: string) => {
    for (const node of parseRichText(text)) if (node.type === 'entity') checkId(file, node.id)
  }
  const richTextIn = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(richTextIn) : value && typeof value === 'object' ? Object.values(value).flatMap(richTextIn) : []

  for (const entity of allEntities.values()) {
    const file = join(root, Object.entries(entityFolders).find(([, meta]) => meta.kind === entity.kind)![0], `${entity.slug}.yaml`)
    for (const id of entity.relatedIds ?? []) checkId(file, id)
    for (const text of richTextIn(entity)) checkRichText(file, text)
    if (entity.kind === 'doctrine') for (const id of entity.article?.furtherStudyIds ?? []) checkId(file, id)
    if (entity.kind === 'prophecy') for (const id of [...(entity.detail?.themeIds ?? []), ...(entity.detail?.relatedStudyIds ?? [])]) checkId(file, id)
    if (entity.threadId && !threadFiles.some((thread) => thread.id === entity.threadId)) {
      problems.push(`${where(file)}: threadId "${entity.threadId}" has no file in threads/`)
    }
  }
  for (const { file, connections } of connectionFiles) {
    for (const connection of connections) {
      for (const endpoint of [connection.source, connection.target]) if (endpoint.type === 'entity') checkId(file, endpoint.id)
    }
  }
  const connectionIds = connectionFiles.flatMap(({ connections }) => connections.map((connection) => connection.id))
  for (const id of new Set(connectionIds.filter((id, index) => connectionIds.indexOf(id) !== index))) {
    problems.push(`connections/: the id "${id}" is used more than once`)
  }
  for (const note of noteFiles) {
    const book = getBook(note.book)
    if (!book) problems.push(`${where(note.file)}: unknown book "${note.book}"`)
    else if (note.chapter > book.chapterCount) problems.push(`${where(note.file)}: ${book.name} has ${book.chapterCount} chapters`)
    for (const id of note.relatedIds) checkId(note.file, id)
    checkRichText(note.file, note.overview)
  }
  if (home) {
    checkId(homeFile, home.featuredStudyId)
    for (const id of home.themeIds) checkId(homeFile, id)
    if (!threadFiles.some((thread) => thread.id === home.featuredThreadId)) problems.push(`site/home.yaml: unknown thread "${home.featuredThreadId}"`)
  }

  if (problems.length > 0) throw new ContentValidationError(problems)

  // Stage filtering: in production only published content is served.
  const entities = new Map([...allEntities].filter(([, entity]) => isVisible(entity.review, stage)))
  const visibleEndpoint = (endpoint: Connection['source']) => endpoint.type === 'scripture' || entities.has(endpoint.id)

  return {
    stage,
    entities,
    connections: connectionFiles
      .filter(({ review }) => isVisible(review, stage))
      .flatMap(({ connections }) => connections as Connection[])
      .filter((connection) => visibleEndpoint(connection.source) && visibleEndpoint(connection.target)),
    chapterNotes: noteFiles
      .filter(({ review }) => isVisible(review, stage))
      .map(({ file: _file, book, ...note }) => ({ ...note, bookId: book })),
    threads: new Map(
      threadFiles.filter(({ review }) => isVisible(review, stage)).map(({ id, title, steps }) => [id, { id, title, steps }]),
    ),
    home: home!,
  }
}
