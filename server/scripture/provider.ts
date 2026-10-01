import type { HighlightSegment } from '@shared/types/search'
import type { BookId, Chapter, ScriptureReference, Testament, Translation } from '@shared/types/scripture'

export interface VerseSearchOptions {
  testament?: Testament
  limit: number
  offset: number
}

export interface VerseSearchResult {
  total: number
  hits: { reference: ScriptureReference; snippet: HighlightSegment[] }[]
}

/**
 * One source of Scripture text. The registry combines several (our own
 * database, API.Bible) behind a single translation list.
 */
export interface ScriptureProvider {
  translations(): Promise<Translation[]>
  getChapter(translationId: string, bookId: BookId, chapter: number): Promise<Chapter | null>
  /** `query` is the reader's raw query; each provider applies its own syntax. */
  searchVerses(translationId: string, query: string, options: VerseSearchOptions): Promise<VerseSearchResult>
}
