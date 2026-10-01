import type { BibleBook, BookGroup, BookId, Testament } from '../types/scripture'

type BookRow = [id: string, name: string, usfm: string, chapterCount: number, abbreviations: string[]]

/** Protestant canon, in canonical order, grouped the way study Bibles present it. */
const canon: { testament: Testament; group: BookGroup; books: BookRow[] }[] = [
  {
    testament: 'old',
    group: 'pentateuch',
    books: [
      ['genesis', 'Genesis', 'GEN', 50, ['gen', 'ge', 'gn']],
      ['exodus', 'Exodus', 'EXO', 40, ['exod', 'exo', 'ex']],
      ['leviticus', 'Leviticus', 'LEV', 27, ['lev', 'le', 'lv']],
      ['numbers', 'Numbers', 'NUM', 36, ['num', 'nu', 'nm']],
      ['deuteronomy', 'Deuteronomy', 'DEU', 34, ['deut', 'deu', 'dt']],
    ],
  },
  {
    testament: 'old',
    group: 'historical',
    books: [
      ['joshua', 'Joshua', 'JOS', 24, ['josh', 'jos']],
      ['judges', 'Judges', 'JDG', 21, ['judg', 'jdg']],
      ['ruth', 'Ruth', 'RUT', 4, ['rth', 'ru']],
      ['1-samuel', '1 Samuel', '1SA', 31, ['1sam', '1sa', '1 sam']],
      ['2-samuel', '2 Samuel', '2SA', 24, ['2sam', '2sa', '2 sam']],
      ['1-kings', '1 Kings', '1KI', 22, ['1kgs', '1ki', '1 kgs']],
      ['2-kings', '2 Kings', '2KI', 25, ['2kgs', '2ki', '2 kgs']],
      ['1-chronicles', '1 Chronicles', '1CH', 29, ['1chr', '1ch', '1 chr']],
      ['2-chronicles', '2 Chronicles', '2CH', 36, ['2chr', '2ch', '2 chr']],
      ['ezra', 'Ezra', 'EZR', 10, ['ezr']],
      ['nehemiah', 'Nehemiah', 'NEH', 13, ['neh', 'ne']],
      ['esther', 'Esther', 'EST', 10, ['esth', 'est']],
    ],
  },
  {
    testament: 'old',
    group: 'wisdom',
    books: [
      ['job', 'Job', 'JOB', 42, ['jb']],
      ['psalms', 'Psalms', 'PSA', 150, ['psalm', 'ps', 'psa', 'pss']],
      ['proverbs', 'Proverbs', 'PRO', 31, ['prov', 'pro', 'pr']],
      ['ecclesiastes', 'Ecclesiastes', 'ECC', 12, ['eccl', 'ecc', 'qoh']],
      ['song-of-solomon', 'Song of Solomon', 'SNG', 8, ['song', 'sos', 'song of songs', 'canticles']],
    ],
  },
  {
    testament: 'old',
    group: 'major-prophets',
    books: [
      ['isaiah', 'Isaiah', 'ISA', 66, ['isa', 'is']],
      ['jeremiah', 'Jeremiah', 'JER', 52, ['jer', 'je']],
      ['lamentations', 'Lamentations', 'LAM', 5, ['lam', 'la']],
      ['ezekiel', 'Ezekiel', 'EZK', 48, ['ezek', 'eze', 'ezk']],
      ['daniel', 'Daniel', 'DAN', 12, ['dan', 'da', 'dn']],
    ],
  },
  {
    testament: 'old',
    group: 'minor-prophets',
    books: [
      ['hosea', 'Hosea', 'HOS', 14, ['hos', 'ho']],
      ['joel', 'Joel', 'JOL', 3, ['jl']],
      ['amos', 'Amos', 'AMO', 9, ['am']],
      ['obadiah', 'Obadiah', 'OBA', 1, ['obad', 'ob']],
      ['jonah', 'Jonah', 'JON', 4, ['jon']],
      ['micah', 'Micah', 'MIC', 7, ['mic', 'mi']],
      ['nahum', 'Nahum', 'NAM', 3, ['nah', 'na']],
      ['habakkuk', 'Habakkuk', 'HAB', 3, ['hab', 'hb']],
      ['zephaniah', 'Zephaniah', 'ZEP', 3, ['zeph', 'zep']],
      ['haggai', 'Haggai', 'HAG', 2, ['hag', 'hg']],
      ['zechariah', 'Zechariah', 'ZEC', 14, ['zech', 'zec']],
      ['malachi', 'Malachi', 'MAL', 4, ['mal', 'ml']],
    ],
  },
  {
    testament: 'new',
    group: 'gospels',
    books: [
      ['matthew', 'Matthew', 'MAT', 28, ['matt', 'mat', 'mt']],
      ['mark', 'Mark', 'MRK', 16, ['mrk', 'mk', 'mr']],
      ['luke', 'Luke', 'LUK', 24, ['luk', 'lk']],
      ['john', 'John', 'JHN', 21, ['jhn', 'jn']],
    ],
  },
  {
    testament: 'new',
    group: 'acts',
    books: [['acts', 'Acts', 'ACT', 28, ['act', 'ac']]],
  },
  {
    testament: 'new',
    group: 'pauline-epistles',
    books: [
      ['romans', 'Romans', 'ROM', 16, ['rom', 'ro', 'rm']],
      ['1-corinthians', '1 Corinthians', '1CO', 16, ['1cor', '1co', '1 cor']],
      ['2-corinthians', '2 Corinthians', '2CO', 13, ['2cor', '2co', '2 cor']],
      ['galatians', 'Galatians', 'GAL', 6, ['gal', 'ga']],
      ['ephesians', 'Ephesians', 'EPH', 6, ['eph', 'ephes']],
      ['philippians', 'Philippians', 'PHP', 4, ['phil', 'php', 'pp']],
      ['colossians', 'Colossians', 'COL', 4, ['col', 'co']],
      ['1-thessalonians', '1 Thessalonians', '1TH', 5, ['1thess', '1th', '1 thess']],
      ['2-thessalonians', '2 Thessalonians', '2TH', 3, ['2thess', '2th', '2 thess']],
      ['1-timothy', '1 Timothy', '1TI', 6, ['1tim', '1ti', '1 tim']],
      ['2-timothy', '2 Timothy', '2TI', 4, ['2tim', '2ti', '2 tim']],
      ['titus', 'Titus', 'TIT', 3, ['tit', 'ti']],
      ['philemon', 'Philemon', 'PHM', 1, ['phlm', 'phm', 'philem']],
    ],
  },
  {
    testament: 'new',
    group: 'general-epistles',
    books: [
      ['hebrews', 'Hebrews', 'HEB', 13, ['heb']],
      ['james', 'James', 'JAS', 5, ['jas', 'jm']],
      ['1-peter', '1 Peter', '1PE', 5, ['1pet', '1pe', '1 pet', '1pt']],
      ['2-peter', '2 Peter', '2PE', 3, ['2pet', '2pe', '2 pet', '2pt']],
      ['1-john', '1 John', '1JN', 5, ['1jn', '1jo', '1 jn']],
      ['2-john', '2 John', '2JN', 1, ['2jn', '2jo', '2 jn']],
      ['3-john', '3 John', '3JN', 1, ['3jn', '3jo', '3 jn']],
      ['jude', 'Jude', 'JUD', 1, ['jud', 'jd']],
    ],
  },
  {
    testament: 'new',
    group: 'apocalyptic',
    books: [['revelation', 'Revelation', 'REV', 22, ['rev', 're', 'apocalypse']]],
  },
]

export const bookGroupLabels: Record<BookGroup, string> = {
  pentateuch: 'Pentateuch',
  historical: 'Historical Books',
  wisdom: 'Wisdom & Poetry',
  'major-prophets': 'Major Prophets',
  'minor-prophets': 'Minor Prophets',
  gospels: 'Gospels',
  acts: 'History',
  'pauline-epistles': 'Pauline Epistles',
  'general-epistles': 'General Epistles',
  apocalyptic: 'Prophecy',
}

export const testamentLabels: Record<Testament, string> = {
  old: 'Old Testament',
  new: 'New Testament',
}

export const books: BibleBook[] = canon.flatMap(({ testament, group, books: rows }) =>
  rows.map(([id, name, usfm, chapterCount, abbreviations]) => ({
    id,
    name,
    usfm,
    chapterCount,
    abbreviations,
    testament,
    group,
  })),
)

export const bookGroups = canon.map(({ testament, group, books: rows }) => ({
  testament,
  group,
  label: bookGroupLabels[group],
  bookIds: rows.map(([id]) => id),
}))

const booksById = new Map(books.map((book) => [book.id, book]))
const booksByUsfm = new Map(books.map((book) => [book.usfm, book]))
const bookOrder = new Map(books.map((book, index) => [book.id, index]))

const normalize = (value: string) => value.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()

/** Every accepted spelling of every book, mapped to its id. */
const bookAliases = new Map<string, BookId>()
for (const book of books) {
  for (const spelling of [book.name, book.id.replace(/-/g, ' '), ...book.abbreviations]) {
    const normalized = normalize(spelling)
    bookAliases.set(normalized, book.id)
    bookAliases.set(normalized.replace(/\s/g, ''), book.id)
  }
}

export function getBook(id: BookId): BibleBook | undefined {
  return booksById.get(id)
}

export function getBookByUsfm(code: string): BibleBook | undefined {
  return booksByUsfm.get(code.toUpperCase())
}

/** Canonical position, for sorting references (Genesis = 0). */
export function bookIndex(id: BookId): number {
  return bookOrder.get(id) ?? Number.MAX_SAFE_INTEGER
}

/**
 * Resolves user input ("1 cor", "Jn", "psalm", "gene") to a book.
 * Exact aliases win; otherwise an unambiguous name prefix (3+ letters) is accepted.
 */
export function findBook(input: string): BibleBook | undefined {
  const query = normalize(input)
  if (!query) return undefined

  const exact = bookAliases.get(query) ?? bookAliases.get(query.replace(/\s/g, ''))
  if (exact) return booksById.get(exact)

  if (query.replace(/[^a-z]/g, '').length < 3) return undefined
  const matches = books.filter((book) => normalize(book.name).startsWith(query))
  return matches.length === 1 ? matches[0] : undefined
}

export function getAdjacentChapter(
  book: BibleBook,
  chapter: number,
  direction: 'previous' | 'next',
): { book: BibleBook; chapter: number } | undefined {
  const index = bookIndex(book.id)
  if (direction === 'next') {
    if (chapter < book.chapterCount) return { book, chapter: chapter + 1 }
    const nextBook = books[index + 1]
    return nextBook ? { book: nextBook, chapter: 1 } : undefined
  }
  if (chapter > 1) return { book, chapter: chapter - 1 }
  const previousBook = books[index - 1]
  return previousBook ? { book: previousBook, chapter: previousBook.chapterCount } : undefined
}
