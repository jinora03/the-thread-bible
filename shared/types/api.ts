import type { ConnectionView, ParallelGroup, Thread } from './connections'
import type { ChapterContext, Entity, EntityKind, EntitySummary, ReviewStatus } from './content'
import type { BookId, ScriptureReference } from './scripture'

/** Error body returned by every API route. */
export interface ApiErrorBody {
  error: { code: string; message: string }
}

/** Everything a card in a collection needs, without the full article. */
export interface EntityPreview extends EntitySummary {
  keyReferences: ScriptureReference[]
  /** True when the full article/detail/sections exist. */
  hasDetail: boolean
  category?: string
  passage?: ScriptureReference
  classification?: string[]
  readingMinutes?: number
  sections?: { id: string; title: string }[]
}

export interface EntityResponse<E extends Entity = Entity> {
  entity: E
  /** Every entity this one links to, so links render without further requests. */
  related: EntitySummary[]
  connections: ConnectionView[]
  /** Chapters whose study notes reference this entity. */
  chapters: { bookId: BookId; chapter: number }[]
  /** Prophecies: grouped Scripture-to-Scripture parallels from the passage. */
  parallels?: ParallelGroup[]
  /** Studies: the thread the study follows. */
  thread?: Thread
}

export interface CollectionResponse {
  kind: EntityKind
  items: EntityPreview[]
}

export interface ChapterStudyResponse {
  context: ChapterContext | null
  related: EntitySummary[]
  connections: ConnectionView[]
}

export interface ChapterNotesIndexEntry {
  bookId: BookId
  chapter: number
  title: string
  reviewStatus: ReviewStatus
}

export interface HomeResponse {
  todaysScripture: ScriptureReference
  featuredStudy: EntityPreview | null
  themes: EntitySummary[]
  thread: Thread | null
  searchSuggestions: string[]
}

export interface ExploreResponse {
  collections: { kind: EntityKind; count: number; samples: EntitySummary[] }[]
}
