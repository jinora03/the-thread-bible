import { describe, expect, it } from 'vitest'
import { books, findBook, getAdjacentChapter, getBook } from './books'
import {
  formatChapter,
  formatReference,
  parseReference,
  parseVerseHash,
  referenceHref,
  referenceIncludesVerse,
  referenceTouchesChapter,
} from './reference'

describe('parseReference', () => {
  it.each([
    ['John 3:16', { book: 'john', chapter: 3, verse: 16 }],
    ['1 Corinthians 15:3–4', { book: '1-corinthians', chapter: 15, verse: 3, endVerse: 4 }],
    ['1cor 15:3-4', { book: '1-corinthians', chapter: 15, verse: 3, endVerse: 4 }],
    ['Isaiah 52:13–53:12', { book: 'isaiah', chapter: 52, verse: 13, endChapter: 53, endVerse: 12 }],
    ['Isaiah 52–53', { book: 'isaiah', chapter: 52, endChapter: 53 }],
    ['Genesis 22', { book: 'genesis', chapter: 22 }],
    ['  jn   1 : 29 ', { book: 'john', chapter: 1, verse: 29 }],
    ['Ps. 23:1', { book: 'psalms', chapter: 23, verse: 1 }],
  ])('parses %s', (input, expected) => {
    expect(parseReference(input)).toEqual(expected)
  })

  it('accepts any dash in pasted ranges', () => {
    const expected = { book: 'isaiah', chapter: 52, verse: 13, endChapter: 53, endVerse: 12 }
    for (const dash of ['-', String.fromCharCode(0x2013), String.fromCharCode(0x2014)]) {
      expect(parseReference(`Isaiah 52:13${dash}53:12`)).toEqual(expected)
    }
  })

  it('collapses degenerate ranges', () => {
    expect(parseReference('John 1:29-29')).toEqual({ book: 'john', chapter: 1, verse: 29 })
    expect(parseReference('Isaiah 53-53')).toEqual({ book: 'isaiah', chapter: 53 })
  })

  it.each(['', 'John', 'Hezekiah 1:1', 'Jude 2', 'Romans 17:1', 'John 1:5-3', 'Isaiah 53-52', 'Genesis 1:1; 2:1'])(
    'rejects %j',
    (input) => {
      expect(parseReference(input)).toBeUndefined()
    },
  )

  // The client sends formatReference() output to the API, which parses it back.
  it('round-trips formatReference for every book', () => {
    for (const book of books) {
      const lastChapter = book.chapterCount
      const cases = [
        { book: book.id, chapter: 1 },
        { book: book.id, chapter: lastChapter, verse: 1, endVerse: 2 },
        ...(lastChapter > 1 ? [{ book: book.id, chapter: 1, verse: 3, endChapter: 2, endVerse: 4 }] : []),
      ]
      for (const reference of cases) expect(parseReference(formatReference(reference)), formatReference(reference)).toEqual(reference)
    }
  })
})

describe('formatReference', () => {
  it('uses book names and en dashes', () => {
    expect(formatReference({ book: '1-corinthians', chapter: 15, verse: 3, endVerse: 4 })).toBe('1 Corinthians 15:3–4')
    expect(formatReference({ book: 'isaiah', chapter: 52, verse: 13, endChapter: 53, endVerse: 12 })).toBe('Isaiah 52:13–53:12')
    expect(formatReference({ book: 'isaiah', chapter: 52, endChapter: 53 })).toBe('Isaiah 52–53')
  })

  it('writes one psalm as "Psalm", and a span as "Psalms"', () => {
    expect(formatReference({ book: 'psalms', chapter: 33, verse: 6, endVerse: 9 })).toBe('Psalm 33:6–9')
    expect(formatReference({ book: 'psalms', chapter: 23 })).toBe('Psalm 23')
    expect(formatReference({ book: 'psalms', chapter: 1, endChapter: 2 })).toBe('Psalms 1–2')
    expect(formatChapter('psalms', 119)).toBe('Psalm 119')
    expect(formatChapter('romans', 8)).toBe('Romans 8')
  })
})

describe('reference geometry', () => {
  const servantSong = { book: 'isaiah', chapter: 52, verse: 13, endChapter: 53, endVerse: 12 } as const

  it('knows which chapters a reference touches', () => {
    expect(referenceTouchesChapter(servantSong, 'isaiah', 52)).toBe(true)
    expect(referenceTouchesChapter(servantSong, 'isaiah', 53)).toBe(true)
    expect(referenceTouchesChapter(servantSong, 'isaiah', 54)).toBe(false)
    expect(referenceTouchesChapter(servantSong, 'john', 52)).toBe(false)
  })

  it('knows which verses a reference includes', () => {
    expect(referenceIncludesVerse(servantSong, 'isaiah', 52, 12)).toBe(false)
    expect(referenceIncludesVerse(servantSong, 'isaiah', 52, 15)).toBe(true)
    expect(referenceIncludesVerse(servantSong, 'isaiah', 53, 12)).toBe(true)
    expect(referenceIncludesVerse(servantSong, 'isaiah', 53, 13)).toBe(false)
    expect(referenceIncludesVerse({ book: 'john', chapter: 1, verse: 29 }, 'john', 1, 30)).toBe(false)
    expect(referenceIncludesVerse({ book: 'john', chapter: 1 }, 'john', 1, 51)).toBe(true)
  })

  it('builds reader links with verse hashes', () => {
    expect(referenceHref({ book: 'isaiah', chapter: 53, verse: 4, endVerse: 6 })).toBe('/bible/isaiah/53#v4-6')
    expect(referenceHref({ book: 'john', chapter: 1, verse: 29 })).toBe('/bible/john/1#v29')
    expect(referenceHref(servantSong)).toBe('/bible/isaiah/52#v13')
  })

  it('parses verse hashes', () => {
    expect(parseVerseHash('#v28')).toEqual({ start: 28, end: 28 })
    expect(parseVerseHash('#v4-6')).toEqual({ start: 4, end: 6 })
    expect(parseVerseHash('#v6-4')).toBeUndefined()
    expect(parseVerseHash('#top')).toBeUndefined()
  })
})

describe('books', () => {
  it('has the 66-book Protestant canon', () => {
    expect(books).toHaveLength(66)
    expect(books.filter((book) => book.testament === 'new')).toHaveLength(27)
  })

  it.each([
    ['1 cor', '1-corinthians'],
    ['Jn', 'john'],
    ['psalm', 'psalms'],
    ['gene', 'genesis'],
    ['song of songs', 'song-of-solomon'],
  ])('finds %j', (input, id) => {
    expect(findBook(input)?.id).toBe(id)
  })

  it('refuses ambiguous prefixes', () => {
    expect(findBook('jo')).toBeUndefined() // Job, Joel, John, Jonah, Joshua…
  })

  it('walks across book boundaries', () => {
    const malachi = getBook('malachi')!
    expect(getAdjacentChapter(malachi, 4, 'next')).toMatchObject({ book: { id: 'matthew' }, chapter: 1 })
    expect(getAdjacentChapter(getBook('matthew')!, 1, 'previous')).toMatchObject({ book: { id: 'malachi' }, chapter: 4 })
    expect(getAdjacentChapter(getBook('genesis')!, 1, 'previous')).toBeUndefined()
    expect(getAdjacentChapter(getBook('revelation')!, 22, 'next')).toBeUndefined()
  })
})
