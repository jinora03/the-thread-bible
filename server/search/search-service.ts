import Database from 'better-sqlite3'
import { richTextToPlain } from '@shared/rich-text'
import { goToHits } from '@shared/scripture/go-to'
import { referenceKey } from '@shared/scripture/reference'
import type { Entity, EntityKind } from '@shared/types/content'
import type { SearchFilter, SearchGroup, SearchGroupId, SearchHit, SearchParams, SearchResponse } from '@shared/types/search'
import type { ContentRepository } from '../content/repository'
import type { ScriptureRegistry } from '../scripture/registry'
import { DEFAULT_TRANSLATION_ID } from '../scripture/registry'
import { highlightTerms, MATCH_END, MATCH_START, toFtsQuery, toSegments } from './fts'

export const groupLabels: Record<SearchGroupId, string> = {
  reference: 'Go to',
  scripture: 'Scripture',
  theme: 'Topics',
  doctrine: 'Doctrines',
  prophecy: 'Prophecy',
  study: 'Studies',
  'people-places': 'People & Places',
  more: 'Typology, Covenants & Events',
}

const entityGroups: Exclude<SearchGroupId, 'reference' | 'scripture'>[] = ['theme', 'doctrine', 'prophecy', 'study', 'people-places', 'more']

function groupForKind(kind: EntityKind): SearchGroupId {
  if (kind === 'theme' || kind === 'doctrine' || kind === 'prophecy' || kind === 'study') return kind
  if (kind === 'person' || kind === 'place') return 'people-places'
  return 'more'
}

/** All prose of an entity as plain text, for the full-text index. */
function bodyText(entity: Entity): string {
  const strings: string[] = []
  const collect = (value: unknown, key = '') => {
    if (typeof value === 'string' && !['id', 'slug', 'kind', 'status'].includes(key)) strings.push(richTextToPlain(value))
    else if (Array.isArray(value)) value.forEach((item) => collect(item, key))
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) collect(v, k)
  }
  const { title: _title, summary: _summary, tags: _tags, review: _review, keyReferences: _refs, relatedIds: _related, ...rest } = entity
  collect(rest)
  return strings.join(' ')
}

/**
 * Library content lives in an in-memory FTS5 index rebuilt from the content
 * files on start-up, so it can never drift from what is published.
 */
function buildContentIndex(entities: Entity[]) {
  const index = new Database(':memory:')
  index.exec(`CREATE VIRTUAL TABLE entities_fts USING fts5(
    id UNINDEXED, group_id UNINDEXED, title, tags, summary, body,
    tokenize = 'porter unicode61 remove_diacritics 2'
  )`)
  const insert = index.prepare('INSERT INTO entities_fts (id, group_id, title, tags, summary, body) VALUES (?, ?, ?, ?, ?, ?)')
  index.transaction(() => {
    for (const entity of entities) {
      insert.run(entity.id, groupForKind(entity.kind), entity.title, (entity.tags ?? []).join(' '), richTextToPlain(entity.summary), bodyText(entity))
    }
  })()
  return index
}

export function createSearchService(content: ContentRepository, scripture: ScriptureRegistry) {
  const index = buildContentIndex(content.allEntities())
  const entitiesById = new Map(content.allEntities().map((entity) => [entity.id, entity]))

  // Title matches matter most, then tags, summary and body (bm25 column weights).
  const entityQuery = index.prepare<{ match: string; group: string | null; limit: number; offset: number }, { id: string; summary_snippet: string }>(
    `SELECT id, snippet(entities_fts, 4, '${MATCH_START}', '${MATCH_END}', '…', 24) AS summary_snippet
     FROM entities_fts
     WHERE entities_fts MATCH @match AND (@group IS NULL OR group_id = @group)
     ORDER BY bm25(entities_fts, 0, 0, 10, 5, 2, 1)
     LIMIT @limit OFFSET @offset`,
  )
  const entityCounts = index.prepare<{ match: string }, { group_id: SearchGroupId; n: number }>(
    'SELECT group_id, count(*) AS n FROM entities_fts WHERE entities_fts MATCH @match GROUP BY group_id',
  )

  const entityHits = (match: string, query: string, group: SearchGroupId, limit: number, offset: number): SearchHit[] =>
    entityQuery.all({ match, group, limit, offset }).flatMap((row) => {
      const entity = entitiesById.get(row.id as Entity['id'])
      if (!entity) return []
      const snippet = toSegments(row.summary_snippet)
      return [
        {
          type: 'entity',
          id: entity.id,
          entity: content.summary(entity),
          title: highlightTerms(entity.title, query),
          snippet: snippet.some((segment) => segment.match) ? snippet : highlightTerms(richTextToPlain(entity.summary), query),
        },
      ]
    })

  return {
    async search({ q, filter = 'all', testament, translation, limit, offset = 0 }: SearchParams): Promise<SearchResponse> {
      const query = q.trim()
      const translationId = (await scripture.translation(translation ?? '')) ? translation! : DEFAULT_TRANSLATION_ID
      const empty: SearchResponse = { query, filter, translationId, groups: [], facets: {} }
      if (!query) return empty

      const match = toFtsQuery(query)
      const perGroup = limit ?? (filter === 'all' ? 4 : 20)
      const groups: SearchGroup[] = []

      const references = goToHits(query)
      if (references.length > 0 && offset === 0) groups.push({ id: 'reference', label: groupLabels.reference, total: references.length, hits: references })
      if (!match) return { ...empty, groups }

      const counts = new Map(entityCounts.all({ match }).map((row) => [row.group_id, row.n]))
      const verses = await scripture.searchVerses(translationId, query, {
        testament,
        limit: filter === 'all' || filter === 'scripture' ? perGroup : 0,
        offset: filter === 'scripture' ? offset : 0,
      })

      const facets: SearchResponse['facets'] = { scripture: verses.total }
      for (const group of entityGroups) facets[group] = counts.get(group) ?? 0

      const include = (group: Exclude<SearchFilter, 'all'>) => filter === 'all' || filter === group
      if (include('scripture') && verses.total > 0) {
        groups.push({
          id: 'scripture',
          label: groupLabels.scripture,
          total: verses.total,
          hits: verses.hits.map((hit) => ({ type: 'verse', id: `verse-${referenceKey(hit.reference)}`, reference: hit.reference, snippet: hit.snippet })),
        })
      }
      for (const group of entityGroups) {
        const total = counts.get(group) ?? 0
        if (!include(group) || total === 0) continue
        groups.push({ id: group, label: groupLabels[group], total, hits: entityHits(match, query, group, perGroup, filter === group ? offset : 0) })
      }

      return { query, filter, translationId, groups, facets }
    },
  }
}

export type SearchService = ReturnType<typeof createSearchService>
