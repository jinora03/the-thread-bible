import type { EntitySummary } from './content'
import type { ScriptureReference, Testament } from './scripture'

export type SearchGroupId =
  | 'reference'
  | 'scripture'
  | 'theme'
  | 'doctrine'
  | 'prophecy'
  | 'study'
  | 'people-places'
  | 'more'

/** Filters offered to the reader; `reference` results always appear when a query parses. */
export type SearchFilter = 'all' | Exclude<SearchGroupId, 'reference'>

/** Highlighted text as plain segments, rendered with <mark>, never as HTML. */
export interface HighlightSegment {
  text: string
  match: boolean
}

export type SearchHit =
  | { type: 'reference'; id: string; reference: ScriptureReference }
  | { type: 'book'; id: string; bookId: string; name: string; chapterCount: number }
  | { type: 'verse'; id: string; reference: ScriptureReference; snippet: HighlightSegment[] }
  | { type: 'entity'; id: string; entity: EntitySummary; title: HighlightSegment[]; snippet: HighlightSegment[] }

export interface SearchGroup {
  id: SearchGroupId
  label: string
  /** Total matches in this group (may exceed the hits returned). */
  total: number
  hits: SearchHit[]
}

export interface SearchParams {
  q: string
  filter?: SearchFilter
  testament?: Testament
  translation?: string
  limit?: number
  offset?: number
}

export interface SearchResponse {
  query: string
  filter: SearchFilter
  translationId: string
  groups: SearchGroup[]
  /** Match counts per group for the unfiltered query, for filter chips. */
  facets: Partial<Record<SearchGroupId, number>>
}
