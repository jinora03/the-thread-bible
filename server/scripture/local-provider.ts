import type Database from 'better-sqlite3'
import { books } from '@shared/scripture/books'
import type { Chapter, Translation, Verse } from '@shared/types/scripture'
import { MATCH_END, MATCH_START, toFtsQuery, toSegments } from '../search/fts'
import type { ScriptureProvider } from './provider'
import { localTranslations } from './sources'

interface VerseRow {
  verse: number
  text: string
  paragraph: number
  poetry: number
  heading: string | null
  superscription: string | null
}

const firstNewTestamentBook = books.findIndex((book) => book.testament === 'new')

/** Public-domain translations imported into our own SQLite database. */
export function createLocalProvider(sqlite: Database.Database): ScriptureProvider {
  const chapterQuery = sqlite.prepare<[string, string, number], VerseRow>(
    `SELECT verse, text, paragraph, poetry, heading, superscription
     FROM verses WHERE translation_id = ? AND book_id = ? AND chapter = ? ORDER BY verse`,
  )
  const countQuery = sqlite.prepare<[string], { n: number }>('SELECT count(*) AS n FROM verses WHERE translation_id = ?')

  // Only offer translations that have actually been imported.
  const available = localTranslations
    .filter((translation) => (countQuery.get(translation.id)?.n ?? 0) > 0)
    .map(({ sourceUrl: _url, sourceFile: _file, ...translation }): Translation => translation)
  const ids = new Set(available.map((translation) => translation.id))

  return {
    translations: async () => available,

    async getChapter(translationId, bookId, chapter) {
      if (!ids.has(translationId)) return null
      const rows = chapterQuery.all(translationId, bookId, chapter)
      if (rows.length === 0) return null
      const verses = rows.map((row): Verse => {
        const verse: Verse = { number: row.verse, text: row.text }
        if (row.paragraph) verse.paragraph = true
        if (row.poetry) verse.poetry = true
        if (row.heading) verse.heading = row.heading
        if (row.superscription) verse.superscription = row.superscription
        return verse
      })
      return { translationId, bookId, chapter, verses } satisfies Chapter
    },

    async searchVerses(translationId, query, { testament, limit, offset }) {
      const match = toFtsQuery(query)
      if (!match || !ids.has(translationId)) return { total: 0, hits: [] }

      const testamentFilter =
        testament === 'old' ? 'AND v.book_order < @nt' : testament === 'new' ? 'AND v.book_order >= @nt' : ''
      const params = { match, translationId, nt: firstNewTestamentBook, limit, offset }

      const total =
        sqlite
          .prepare<typeof params, { n: number }>(
            `SELECT count(*) AS n FROM verses_fts JOIN verses v ON v.id = verses_fts.rowid
             WHERE verses_fts MATCH @match AND v.translation_id = @translationId ${testamentFilter}`,
          )
          .get(params)?.n ?? 0

      const rows = sqlite
        .prepare<typeof params, { book_id: string; chapter: number; verse: number; snippet: string }>(
          `SELECT v.book_id, v.chapter, v.verse,
                  snippet(verses_fts, 0, '${MATCH_START}', '${MATCH_END}', '…', 28) AS snippet
           FROM verses_fts JOIN verses v ON v.id = verses_fts.rowid
           WHERE verses_fts MATCH @match AND v.translation_id = @translationId ${testamentFilter}
           ORDER BY rank, v.book_order, v.chapter, v.verse
           LIMIT @limit OFFSET @offset`,
        )
        .all(params)

      return {
        total,
        hits: rows.map((row) => ({
          reference: { book: row.book_id, chapter: row.chapter, verse: row.verse },
          snippet: toSegments(row.snippet),
        })),
      }
    },
  }
}
