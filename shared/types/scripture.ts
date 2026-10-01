export type Testament = 'old' | 'new'

export type BookGroup =
  | 'pentateuch'
  | 'historical'
  | 'wisdom'
  | 'major-prophets'
  | 'minor-prophets'
  | 'gospels'
  | 'acts'
  | 'pauline-epistles'
  | 'general-epistles'
  | 'apocalyptic'

/** URL-safe book identifier, e.g. `genesis`, `1-corinthians`, `song-of-solomon`. */
export type BookId = string

export interface BibleBook {
  id: BookId
  name: string
  /** Standard USFM book code (GEN, 1CO…), used by importers and external APIs. */
  usfm: string
  /** Common abbreviations used for search and reference parsing (lowercase). */
  abbreviations: string[]
  testament: Testament
  group: BookGroup
  chapterCount: number
}

export interface Translation {
  id: string
  name: string
  abbreviation: string
  language: string
  /** Short licence statement shown next to Scripture text. */
  license: string
  attribution: string
  /** Where the text comes from: our own database, or a licensed API. */
  source: 'local' | 'api-bible'
  /** Whether full-text search is available for this translation. */
  searchable: boolean
}

export interface Verse {
  number: number
  /** Verse text. Poetry keeps its line breaks as `\n`. */
  text: string
  /** Marks the first verse of a new paragraph in reading mode. */
  paragraph?: boolean
  /** A section heading printed before this verse (supplied by the translation's editors). */
  heading?: string
  /** A psalm title ("A Psalm of David"): part of the text itself, unlike headings. */
  superscription?: string
  /** Set on verses formatted as poetic lines. */
  poetry?: boolean
}

export interface Chapter {
  translationId: string
  bookId: BookId
  chapter: number
  verses: Verse[]
  /** Copyright line required by the source for this text, if any. */
  copyright?: string
}

/**
 * A structured Scripture reference. Every field after `chapter` is optional:
 * - `{ book, chapter }` → whole chapter
 * - `{ book, chapter, verse }` → single verse
 * - `{ book, chapter, verse, endVerse }` → range within a chapter
 * - `{ book, chapter, verse, endChapter, endVerse }` → range across chapters
 */
export interface ScriptureReference {
  book: BookId
  chapter: number
  verse?: number
  endChapter?: number
  endVerse?: number
}

export interface Passage {
  reference: ScriptureReference
  translationId: string
  /** Verses grouped by chapter, so cross-chapter passages render correctly. */
  segments: { chapter: number; verses: Verse[] }[]
  copyright?: string
}

export type ReadingMode = 'reading' | 'study'
