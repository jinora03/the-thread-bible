import { findBook, getBook } from './books'
import type { BookId, ScriptureReference } from '../types/scripture'

// "1 Corinthians 15:3–4", "Isaiah 52:13–53:12", "Isaiah 52–53", "Genesis 22"
const referencePattern =
  /^((?:[123]\s?)?[a-z][a-z\s]*?)\s*(\d{1,3})(?:\s*:\s*(\d{1,3}))?(?:\s*-\s*(\d{1,3})(?:\s*:\s*(\d{1,3}))?)?$/

// En and em dashes (U+2013, U+2014) in typed or pasted references count as hyphens.
const rangeDashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'g')

/** Parses a human-written reference. Returns `undefined` for anything invalid. */
export function parseReference(input: string): ScriptureReference | undefined {
  const normalized = input
    .toLowerCase()
    .replace(rangeDashes, '-')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const match = referencePattern.exec(normalized)
  if (!match) return undefined

  const [, bookPart = '', chapterPart = '', versePart, rangeA, rangeB] = match
  const book = findBook(bookPart)
  if (!book) return undefined

  const chapter = Number(chapterPart)
  if (chapter < 1 || chapter > book.chapterCount) return undefined

  const reference: ScriptureReference = { book: book.id, chapter }

  if (versePart) {
    reference.verse = Number(versePart)
    if (rangeA && rangeB) {
      reference.endChapter = Number(rangeA)
      reference.endVerse = Number(rangeB)
    } else if (rangeA) {
      reference.endVerse = Number(rangeA)
    }
  } else if (rangeA && !rangeB) {
    reference.endChapter = Number(rangeA)
  }

  if (reference.endChapter !== undefined) {
    if (reference.endChapter < chapter || reference.endChapter > book.chapterCount) return undefined
    if (reference.endChapter === chapter) delete reference.endChapter
  }
  if (reference.endVerse !== undefined && reference.verse !== undefined && reference.endChapter === undefined) {
    if (reference.endVerse < reference.verse) return undefined
    if (reference.endVerse === reference.verse) delete reference.endVerse
  }

  return reference
}

/**
 * Authoring helper for data files: `ref("Romans 8:28")`.
 * Throws immediately on a typo so broken references never reach the UI.
 */
export function ref(input: string): ScriptureReference {
  const reference = parseReference(input)
  if (!reference) throw new Error(`Invalid Scripture reference in data: "${input}"`)
  return reference
}

export function refs(...inputs: string[]): ScriptureReference[] {
  return inputs.map(ref)
}

export function bookName(bookId: BookId): string {
  return getBook(bookId)?.name ?? bookId
}

// One psalm is "Psalm 23"; the book, and a span of psalms, is "Psalms".
const bookLabel = (bookId: BookId, singleChapter: boolean) => (bookId === 'psalms' && singleChapter ? 'Psalm' : bookName(bookId))

/** "Genesis 1", "Psalm 23": a single chapter, as a reader would write it. */
export function formatChapter(bookId: BookId, chapter: number): string {
  return `${bookLabel(bookId, true)} ${chapter}`
}

/** "Genesis 22:8", "Psalm 33:6–9", "Isaiah 52:13–53:12", "Isaiah 52–53", "John 1:1–18". */
export function formatReference(reference: ScriptureReference): string {
  const { chapter, verse, endChapter, endVerse } = reference
  let label = `${bookLabel(reference.book, endChapter === undefined)} ${chapter}`

  if (verse === undefined) {
    if (endChapter !== undefined) label += `–${endChapter}`
    return label
  }

  label += `:${verse}`
  if (endChapter !== undefined) label += `–${endChapter}:${endVerse ?? 1}`
  else if (endVerse !== undefined) label += `–${endVerse}`
  return label
}

export function chapterHref(bookId: BookId, chapter: number): string {
  return `/bible/${bookId}/${chapter}`
}

/** Reader URL, with a verse hash (`#v28` or `#v4-6`) for deep links. */
export function referenceHref(reference: ScriptureReference): string {
  const base = chapterHref(reference.book, reference.chapter)
  if (reference.verse === undefined) return base
  const range =
    reference.endVerse !== undefined && reference.endChapter === undefined ? `-${reference.endVerse}` : ''
  return `${base}#v${reference.verse}${range}`
}

/** Stable string key, useful for React keys and query keys. */
export function referenceKey(reference: ScriptureReference): string {
  const { book, chapter, verse, endChapter, endVerse } = reference
  return [book, chapter, verse ?? '', endChapter ?? '', endVerse ?? ''].join('.')
}

/** Does the reference include any part of the given chapter? */
export function referenceTouchesChapter(reference: ScriptureReference, bookId: BookId, chapter: number): boolean {
  if (reference.book !== bookId) return false
  const lastChapter = reference.endChapter ?? reference.chapter
  return chapter >= reference.chapter && chapter <= lastChapter
}

/** Does the reference include the given verse? Whole-chapter references include every verse. */
export function referenceIncludesVerse(
  reference: ScriptureReference,
  bookId: BookId,
  chapter: number,
  verse: number,
): boolean {
  if (!referenceTouchesChapter(reference, bookId, chapter)) return false
  if (reference.verse === undefined) return true

  const start = chapter === reference.chapter ? reference.verse : 1
  const lastChapter = reference.endChapter ?? reference.chapter
  const end =
    chapter === lastChapter
      ? (reference.endVerse ?? (reference.endChapter === undefined ? reference.verse : Infinity))
      : Infinity
  return verse >= start && verse <= end
}

/** Parses the reader hash: `#v28` → 28–28, `#v4-6` → 4–6. */
export function parseVerseHash(hash: string): { start: number; end: number } | undefined {
  const match = /^#v(\d{1,3})(?:-(\d{1,3}))?$/.exec(hash)
  if (!match) return undefined
  const start = Number(match[1])
  const end = match[2] ? Number(match[2]) : start
  return end >= start ? { start, end } : undefined
}
