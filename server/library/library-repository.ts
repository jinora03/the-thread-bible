import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { referenceKey } from '@shared/scripture/reference'
import type { EntityId } from '@shared/types/content'
import type { Bookmark, LibraryData, Note, ReadingState } from '@shared/types/library'
import type { ScriptureReference } from '@shared/types/scripture'
import type { DrizzleDb } from '../db/client'
import { bookmarks, notes, readingState } from '../db/schema'

const toColumns = (reference: ScriptureReference) => ({
  book: reference.book,
  chapter: reference.chapter,
  verse: reference.verse ?? null,
  endChapter: reference.endChapter ?? null,
  endVerse: reference.endVerse ?? null,
  referenceKey: referenceKey(reference),
})

const fromColumns = (row: {
  book: string
  chapter: number
  verse: number | null
  endChapter: number | null
  endVerse: number | null
}): ScriptureReference => {
  const reference: ScriptureReference = { book: row.book, chapter: row.chapter }
  if (row.verse !== null) reference.verse = row.verse
  if (row.endChapter !== null) reference.endChapter = row.endChapter
  if (row.endVerse !== null) reference.endVerse = row.endVerse
  return reference
}

/** A signed-in reader's library. Every query is scoped to `userId`. */
export function createLibraryRepository(db: DrizzleDb) {
  const now = () => new Date().toISOString()

  const reading = (userId: string): ReadingState => {
    const row = db.select().from(readingState).where(eq(readingState.userId, userId)).get()
    return {
      lastRead: row?.lastBook && row.lastChapter && row.lastReadAt ? { bookId: row.lastBook, chapter: row.lastChapter, readAt: row.lastReadAt } : null,
      lastStudy:
        row?.lastStudyId && row.lastStudySection && row.lastStudyAt
          ? { studyId: row.lastStudyId as EntityId<'study'>, sectionId: row.lastStudySection, updatedAt: row.lastStudyAt }
          : null,
    }
  }

  const repository = {
    get(userId: string): LibraryData {
      return {
        bookmarks: db
          .select()
          .from(bookmarks)
          .where(eq(bookmarks.userId, userId))
          .orderBy(desc(bookmarks.createdAt))
          .all()
          .map((row): Bookmark => ({ id: row.id, reference: fromColumns(row), createdAt: row.createdAt })),
        notes: db
          .select()
          .from(notes)
          .where(eq(notes.userId, userId))
          .orderBy(desc(notes.createdAt))
          .all()
          .map((row): Note => ({ id: row.id, reference: fromColumns(row), text: row.text, createdAt: row.createdAt, updatedAt: row.updatedAt })),
        reading: reading(userId),
      }
    },

    /** Idempotent: bookmarking the same passage twice returns the existing bookmark. */
    addBookmark(userId: string, reference: ScriptureReference, createdAt = now()): Bookmark {
      const columns = toColumns(reference)
      const existing = db
        .select()
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.referenceKey, columns.referenceKey)))
        .get()
      if (existing) return { id: existing.id, reference: fromColumns(existing), createdAt: existing.createdAt }
      const id = randomUUID()
      db.insert(bookmarks).values({ id, userId, ...columns, createdAt }).run()
      return { id, reference, createdAt }
    },

    removeBookmark(userId: string, id: string): boolean {
      return db.delete(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId))).run().changes > 0
    },

    addNote(userId: string, reference: ScriptureReference, text: string, createdAt = now()): Note {
      const id = randomUUID()
      db.insert(notes).values({ id, userId, ...toColumns(reference), text, createdAt, updatedAt: createdAt }).run()
      return { id, reference, text, createdAt, updatedAt: createdAt }
    },

    updateNote(userId: string, id: string, text: string): Note | undefined {
      const updatedAt = now()
      const row = db.update(notes).set({ text, updatedAt }).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning().get()
      return row ? { id: row.id, reference: fromColumns(row), text: row.text, createdAt: row.createdAt, updatedAt: row.updatedAt } : undefined
    },

    deleteNote(userId: string, id: string): boolean {
      return db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).run().changes > 0
    },

    updateReading(
      userId: string,
      update: { lastRead?: { bookId: string; chapter: number }; lastStudy?: { studyId: string; sectionId: string } },
    ): ReadingState {
      const timestamp = now()
      const values = {
        ...(update.lastRead ? { lastBook: update.lastRead.bookId, lastChapter: update.lastRead.chapter, lastReadAt: timestamp } : {}),
        ...(update.lastStudy ? { lastStudyId: update.lastStudy.studyId, lastStudySection: update.lastStudy.sectionId, lastStudyAt: timestamp } : {}),
      }
      if (Object.keys(values).length > 0) {
        db.insert(readingState).values({ userId, ...values }).onConflictDoUpdate({ target: readingState.userId, set: values }).run()
      }
      return reading(userId)
    },

    /** Merges a browser library into the account (first sign-in). Keeps the newer reading state. */
    import(userId: string, data: LibraryData): LibraryData {
      db.transaction(() => {
        for (const bookmark of data.bookmarks) repository.addBookmark(userId, bookmark.reference, bookmark.createdAt)
        const existingNotes = repository.get(userId).notes
        for (const note of data.notes) {
          const duplicate = existingNotes.some((existing) => existing.text === note.text && referenceKey(existing.reference) === referenceKey(note.reference))
          if (!duplicate) repository.addNote(userId, note.reference, note.text, note.createdAt)
        }
        const current = reading(userId)
        if (data.reading.lastRead && (!current.lastRead || data.reading.lastRead.readAt > current.lastRead.readAt)) {
          repository.updateReading(userId, { lastRead: data.reading.lastRead })
        }
        if (data.reading.lastStudy && (!current.lastStudy || data.reading.lastStudy.updatedAt > current.lastStudy.updatedAt)) {
          repository.updateReading(userId, { lastStudy: data.reading.lastStudy })
        }
      })
      return repository.get(userId)
    },
  }
  return repository
}

export type LibraryRepository = ReturnType<typeof createLibraryRepository>
