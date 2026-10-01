import type Database from 'better-sqlite3'
import { formatChapter } from '@shared/scripture/reference'
import type { ScriptureReference } from '@shared/types/scripture'

/**
 * Which verses exist, from the Scripture imported into the database. The
 * parser only knows the canon (books and chapter counts); verse counts vary
 * slightly between translations, so they come from the text itself.
 */
export function createVerseIndex(sqlite: Database.Database) {
  const longest = sqlite.prepare<[string, number], { n: number | null }>('SELECT max(verse) AS n FROM verses WHERE book_id = ? AND chapter = ?')
  const inTranslation = sqlite.prepare<[string, string, number, number], { found: number }>(
    'SELECT 1 AS found FROM verses WHERE translation_id = ? AND book_id = ? AND chapter = ? AND verse = ?',
  )
  const translations = sqlite.prepare<[], { id: string }>('SELECT DISTINCT translation_id AS id FROM verses')
  const counts = new Map<string, number | undefined>()

  /** Verses in the chapter in the longest local translation; undefined if that chapter has no text here. */
  const versesIn = (bookId: string, chapter: number) => {
    const key = `${bookId}.${chapter}`
    if (!counts.has(key)) counts.set(key, longest.get(bookId, chapter)?.n ?? undefined)
    return counts.get(key)
  }

  const endpoints = (reference: ScriptureReference) =>
    [
      reference.verse !== undefined && { chapter: reference.chapter, verse: reference.verse },
      reference.endVerse !== undefined && { chapter: reference.endChapter ?? reference.chapter, verse: reference.endVerse },
    ].filter((point): point is { chapter: number; verse: number } => Boolean(point))

  return {
    versesIn,

    /** Imported translation ids (empty until `npm run setup` has run). */
    translations: () => translations.all().map((row) => row.id),

    /**
     * Why the reference points past the end of a chapter, or undefined. A
     * chapter with no imported text cannot be checked and is not reported.
     */
    problem(reference: ScriptureReference): string | undefined {
      for (const { chapter, verse } of endpoints(reference)) {
        const count = versesIn(reference.book, chapter)
        if (count !== undefined && verse > count) return `${formatChapter(reference.book, chapter)} has ${count} verses`
      }
      return undefined
    },

    /** Translations that lack a verse the reference starts or ends on (some omit verses others include). */
    missingIn(reference: ScriptureReference): string[] {
      const points = endpoints(reference)
      return this.translations().filter((translationId) =>
        points.some(({ chapter, verse }) => !inTranslation.get(translationId, reference.book, chapter, verse)),
      )
    },
  }
}

export type VerseIndex = ReturnType<typeof createVerseIndex>
