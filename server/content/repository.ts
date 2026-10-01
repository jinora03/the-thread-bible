import { parseRichText } from '@shared/rich-text'
import { referenceIncludesVerse, referenceKey, referenceTouchesChapter } from '@shared/scripture/reference'
import type {
  ChapterNotesIndexEntry,
  ChapterStudyResponse,
  CollectionResponse,
  EntityPreview,
  EntityResponse,
  ExploreResponse,
  HomeResponse,
} from '@shared/types/api'
import type { Connection, ConnectionEndpoint, ConnectionView, ParallelGroup } from '@shared/types/connections'
import type { Entity, EntityId, EntityKind, EntitySummary } from '@shared/types/content'
import type { BookId, ScriptureReference } from '@shared/types/scripture'
import type { ContentStore } from './loader'

/** Read-side queries over the loaded content. Pure functions of the store. */
export function createContentRepository(store: ContentStore) {
  const summary = (entity: Entity): EntitySummary => ({
    id: entity.id,
    kind: entity.kind,
    slug: entity.slug,
    title: entity.title,
    summary: entity.summary,
    reviewStatus: entity.review.status,
    subtitle: entity.kind === 'person' ? entity.role : entity.kind === 'place' ? entity.region : undefined,
  })

  const preview = (entity: Entity): EntityPreview => ({
    ...summary(entity),
    keyReferences: entity.keyReferences,
    hasDetail:
      (entity.kind === 'doctrine' && Boolean(entity.article)) ||
      (entity.kind === 'prophecy' && Boolean(entity.detail)) ||
      (entity.kind === 'study' && Boolean(entity.sections?.length)),
    category: entity.kind === 'doctrine' ? entity.category : undefined,
    passage: entity.kind === 'prophecy' ? entity.passage : undefined,
    classification: entity.kind === 'prophecy' ? entity.classification : undefined,
    readingMinutes: entity.kind === 'study' ? entity.readingMinutes : undefined,
    sections: entity.kind === 'study' ? entity.sections?.map(({ id, title }) => ({ id, title })) : undefined,
  })

  const summaries = (ids: Iterable<EntityId>) =>
    [...new Set(ids)].flatMap((id) => {
      const entity = store.entities.get(id)
      return entity ? [summary(entity)] : []
    })

  // Connections ------------------------------------------------------------------
  const orient = (connection: Connection, matchesSource: boolean): ConnectionView =>
    matchesSource
      ? { connection, here: connection.source, there: connection.target, direction: 'outgoing' }
      : { connection, here: connection.target, there: connection.source, direction: 'incoming' }

  const isEntity = (endpoint: ConnectionEndpoint, id: EntityId) => endpoint.type === 'entity' && endpoint.id === id
  const touchesChapter = (endpoint: ConnectionEndpoint, bookId: BookId, chapter: number) =>
    endpoint.type === 'scripture' && referenceTouchesChapter(endpoint.reference, bookId, chapter)

  const connectionsForEntity = (id: EntityId) =>
    store.connections.flatMap((connection) =>
      isEntity(connection.source, id) ? [orient(connection, true)] : isEntity(connection.target, id) ? [orient(connection, false)] : [],
    )

  const connectionsInChapter = (bookId: BookId, chapter: number) =>
    store.connections.flatMap((connection) =>
      touchesChapter(connection.source, bookId, chapter)
        ? [orient(connection, true)]
        : touchesChapter(connection.target, bookId, chapter)
          ? [orient(connection, false)]
          : [],
    )

  /** Groups a passage's outgoing Scripture-to-Scripture connections by the verse they start from. */
  const parallelsFromPassage = (passage: ScriptureReference): ParallelGroup[] => {
    const groups = new Map<string, ParallelGroup>()
    for (let chapter = passage.chapter; chapter <= (passage.endChapter ?? passage.chapter); chapter++) {
      for (const view of connectionsInChapter(passage.book, chapter)) {
        const { connection, here, there } = view
        if (view.direction !== 'outgoing' || here.type !== 'scripture' || there.type !== 'scripture') continue
        if (!referenceIncludesVerse(passage, passage.book, here.reference.chapter, here.reference.verse ?? 1)) continue
        const start = { book: here.reference.book, chapter: here.reference.chapter, verse: here.reference.verse }
        const key = referenceKey(start)
        const group: ParallelGroup = groups.get(key) ?? { source: start, label: connection.description ?? '', views: [] }
        group.views.push(view)
        groups.set(key, group)
      }
    }
    return [...groups.values()].sort((a, b) => a.source.chapter - b.source.chapter || (a.source.verse ?? 0) - (b.source.verse ?? 0))
  }

  /** Every entity id an entity refers to, anywhere, so the page can render all its links. */
  const referencedIds = (entity: Entity, views: ConnectionView[]): EntityId[] => {
    const ids: EntityId[] = [...(entity.relatedIds ?? [])]
    const collect = (value: unknown) => {
      if (typeof value === 'string') {
        for (const node of parseRichText(value)) {
          if (node.type === 'entity') ids.push(node.id)
        }
      } else if (Array.isArray(value)) {
        value.forEach(collect)
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach(collect)
      }
    }
    collect(entity)
    if (entity.kind === 'doctrine') ids.push(...(entity.article?.furtherStudyIds ?? []))
    if (entity.kind === 'prophecy') ids.push(...(entity.detail?.themeIds ?? []), ...(entity.detail?.relatedStudyIds ?? []))
    for (const { there } of views) if (there.type === 'entity') ids.push(there.id)
    return ids.filter((id) => id !== entity.id)
  }

  const chaptersMentioning = (id: EntityId) =>
    store.chapterNotes.filter((note) => note.relatedIds.includes(id)).map(({ bookId, chapter }) => ({ bookId, chapter }))

  return {
    summary,
    summaries,

    getEntity(kind: EntityKind, slug: string): EntityResponse | undefined {
      const entity = store.entities.get(`${kind}:${slug}`)
      if (!entity) return undefined
      const connections = connectionsForEntity(entity.id)
      return {
        entity,
        related: summaries(referencedIds(entity, connections)),
        connections,
        chapters: chaptersMentioning(entity.id),
        parallels: entity.kind === 'prophecy' ? parallelsFromPassage(entity.passage) : undefined,
        thread: entity.threadId ? store.threads.get(entity.threadId) : undefined,
      }
    },

    listCollection(kind: EntityKind): CollectionResponse {
      const items = [...store.entities.values()]
        .filter((entity) => entity.kind === kind)
        .map(preview)
        .sort((a, b) => a.title.replace(/^The /, '').localeCompare(b.title.replace(/^The /, '')))
      return { kind, items }
    },

    getChapterStudy(bookId: BookId, chapter: number): ChapterStudyResponse {
      const context = store.chapterNotes.find((note) => note.bookId === bookId && note.chapter === chapter) ?? null
      const connections = connectionsInChapter(bookId, chapter)
      const ids = [
        ...(context?.relatedIds ?? []),
        ...connections.flatMap(({ there }) => (there.type === 'entity' ? [there.id] : [])),
        ...(context ? parseRichText(context.overview).flatMap((node) => (node.type === 'entity' ? [node.id] : [])) : []),
      ]
      return { context, related: summaries(ids), connections }
    },

    chapterNotesIndex(): ChapterNotesIndexEntry[] {
      return store.chapterNotes.map(({ bookId, chapter, title, review }) => ({ bookId, chapter, title, reviewStatus: review.status }))
    },

    home(): HomeResponse {
      const { home } = store
      const featured = store.entities.get(home.featuredStudyId)
      return {
        todaysScripture: home.todaysScripture,
        featuredStudy: featured ? preview(featured) : null,
        themes: summaries(home.themeIds),
        thread: store.threads.get(home.featuredThreadId) ?? null,
        searchSuggestions: home.searchSuggestions,
      }
    },

    explore(): ExploreResponse {
      const byKind = new Map<EntityKind, Entity[]>()
      for (const entity of store.entities.values()) byKind.set(entity.kind, [...(byKind.get(entity.kind) ?? []), entity])
      return {
        collections: [...byKind].map(([kind, entities]) => ({ kind, count: entities.length, samples: entities.slice(0, 3).map(summary) })),
      }
    },

    allEntities: () => [...store.entities.values()],
  }
}

export type ContentRepository = ReturnType<typeof createContentRepository>
