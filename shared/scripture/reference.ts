import { findBook, getBook } from './books'
import type { BookId, ScriptureReference } from '../types/scripture'

// "1 Corinthians 15:3–4", "Isaiah 52:13–53:12", "Isaiah 52–53", "Genesis 22"
const referencePattern =
  /^((?:[123]\s?)?[a-z][a-z\s]*?)\s*(\d{1,3})(?:\s*:\s*(\d{1,3}))?(?:\s*-\s*(\d{1,3})(?:\s*:\s*(\d{1,3}))?)?$/

// En and em dashes (U+2013, U+2014) in typed or pasted references count as hyphens.
const rangeDashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'g')

/** No chapter has more verses than Psalm 119 (176). Exact counts depend on the translation. */
export const MAX_VERSES_IN_CHAPTER = 176

const isWhole = (value: number | undefined, min: number, max: number) =>
  value === undefined || (Number.isInteger(value) && value >= min && value <= max)

/**
 * Why a structured reference is invalid, or undefined if it is valid: an
 * unknown book, a chapter outside the book, a verse below 1 or above any
 * chapter's length, or a range that ends before it starts or mixes forms.
 * Whether a verse exists in a particular translation is checked separately,
 * against the translation's text.
 */
export function referenceProblem(reference: ScriptureReference): string | undefined {
  const book = getBook(reference.book)
  if (!book) return `"${reference.book}" is not a book of the Bible`
  const { chapter, verse, endChapter, endVerse } = reference
  if (!isWhole(chapter, 1, book.chapterCount)) return `${book.name} has ${book.chapterCount} chapters`
  if (!isWhole(endChapter, chapter + 1, book.chapterCount)) return `The range must end after chapter ${chapter} and within ${book.name}`
  if (!isWhole(verse, 1, MAX_VERSES_IN_CHAPTER) || !isWhole(endVerse, 1, MAX_VERSES_IN_CHAPTER)) return 'Verse numbers start at 1'
  if (verse === undefined && endVerse !== undefined) return 'A range ending at a verse must start at a verse'
  if (verse !== undefined && endChapter !== undefined && endVerse === undefined) return 'A range from a verse must end at a verse'
  if (verse !== undefined && endVerse !== undefined && endChapter === undefined && endVerse < verse) return 'The range ends before it starts'
  return undefined
}

/**
 * Parses a human-written reference. Returns `undefined` for anything invalid
 * or ambiguous, rather than guessing: "John 3-4:5" is rejected, not read as John 3.
 */
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

  const reference: ScriptureReference = { book: book.id, chapter: Number(chapterPart) }

  if (versePart) {
    reference.verse = Number(versePart)
    if (rangeA && rangeB) {
      reference.endChapter = Number(rangeA)
      reference.endVerse = Number(rangeB)
    } else if (rangeA) {
      reference.endVerse = Number(rangeA)
    }
  } else if (rangeA && rangeB) {
    // "John 3-4:5": a chapter cannot run to a verse.
    return undefined
  } else if (rangeA) {
    reference.endChapter = Number(rangeA)
  }

  // Collapse ranges that end where they start: "John 1:29-29" is John 1:29.
  if (reference.endChapter === reference.chapter) {
    delete reference.endChapter
    if (reference.verse === undefined) delete reference.endVerse
  }
  if (reference.endChapter === undefined && reference.endVerse !== undefined && reference.endVerse === reference.verse) delete reference.endVerse

  return referenceProblem(reference) ? undefined : reference
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
