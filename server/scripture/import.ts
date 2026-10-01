import type Database from 'better-sqlite3'
import { bookIndex, getBookByUsfm } from '@shared/scripture/books'
import { parseUsfmBook } from './usfm'

export interface ImportReport {
  verses: number
  /** Books whose chapter count differs from the canon (usually a damaged source). */
  problems: string[]
}

/**
 * Replaces one translation's verses with the given USFM books (one source string
 * per book). Files that are not canonical books (front matter, glossaries,
 * apocrypha) are skipped. Call `rebuildSearchIndex` afterwards.
 */
export function importUsfmBooks(sqlite: Database.Database, translationId: string, sources: Iterable<string>): ImportReport {
  const insert = sqlite.prepare(`
    INSERT INTO verses (translation_id, book_id, book_order, chapter, verse, text, paragraph, poetry, heading, superscription)
    VALUES (@translationId, @bookId, @bookOrder, @chapter, @verse, @text, @paragraph, @poetry, @heading, @superscription)
  `)
  const report: ImportReport = { verses: 0, problems: [] }

  sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM verses WHERE translation_id = ?').run(translationId)
    for (const source of sources) {
      const parsed = parseUsfmBook(source)
      const book = getBookByUsfm(parsed.usfm)
      if (!book) continue

      if (parsed.chapters.size !== book.chapterCount) {
        report.problems.push(`${book.name}: ${parsed.chapters.size} chapters (expected ${book.chapterCount})`)
      }
      for (const [chapter, verses] of parsed.chapters) {
        for (const verse of verses) {
          insert.run({
            translationId,
            bookId: book.id,
            bookOrder: bookIndex(book.id),
            chapter,
            verse: verse.number,
            text: verse.text,
            paragraph: verse.paragraph ? 1 : 0,
            poetry: verse.poetry ? 1 : 0,
            heading: verse.heading ?? null,
            superscription: verse.superscription ?? null,
          })
          report.verses++
        }
      }
    }
  })()

  return report
}

/** Rebuilds the external-content FTS index from the verses table. */
export function rebuildSearchIndex(sqlite: Database.Database) {
  sqlite.exec("INSERT INTO verses_fts(verses_fts) VALUES('rebuild')")
  sqlite.exec("INSERT INTO verses_fts(verses_fts) VALUES('optimize')")
}
