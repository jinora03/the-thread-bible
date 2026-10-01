import type { z } from 'zod'
import { bookmarkSchema, lastReadSchema, lastStudySchema, libraryDataSchema, noteSchema } from '@shared/schemas/library'
import { referenceKey } from '@shared/scripture/reference'
import type { EntityId } from '@shared/types/content'
import type { LibraryData, ReadingState } from '@shared/types/library'
import type { BookId, ScriptureReference } from '@shared/types/scripture'
import { LibrarySaveError } from '@/features/library/library-errors'
import { createPersistentStore, usePersistentStore } from '@/lib/persistent-store'

/** The signed-out library, kept in this browser. Imported into an account on sign-in. */
export const emptyLibrary: LibraryData = { bookmarks: [], notes: [], reading: { lastRead: null, lastStudy: null } }

const STORAGE_KEY = 'ttb-library-v2'
/** Items that could not be read are kept here, never silently discarded. */
const SET_ASIDE_KEY = `${STORAGE_KEY}-set-aside`

const now = () => new Date().toISOString()
const isTimestamp = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value)) && /^\d{4}-\d\d-\d\dT/.test(value)

/** Validates one stored item, repairing unreadable timestamps rather than losing the item. */
function salvage<T>(schema: z.ZodType<T>, item: unknown, timestampFields: string[]): T | undefined {
  const parsed = schema.safeParse(item)
  if (parsed.success) return parsed.data
  if (!item || typeof item !== 'object') return undefined
  const repaired: Record<string, unknown> = { ...(item as Record<string, unknown>) }
  for (const field of timestampFields) if (!isTimestamp(repaired[field])) repaired[field] = now()
  const retried = schema.safeParse(repaired)
  return retried.success ? retried.data : undefined
}

/**
 * Recovers what it can from a stored library that failed validation, item by
 * item. Anything unrecoverable is copied to SET_ASIDE_KEY so the reader can
 * download it from the Library page; the rest of their library survives.
 */
function recoverLibrary(raw: unknown): LibraryData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const stored = raw as Partial<Record<'bookmarks' | 'notes' | 'reading', unknown>>
  const setAside: unknown[] = []

  const list = <T>(value: unknown, schema: z.ZodType<T>, timestampFields: string[]): T[] => {
    if (!Array.isArray(value)) {
      if (value !== undefined) setAside.push(value)
      return []
    }
    return value.flatMap((item) => {
      const kept = salvage(schema, item, timestampFields)
      if (!kept) setAside.push(item)
      return kept ? [kept] : []
    })
  }

  const reading = (stored.reading ?? {}) as Partial<Record<keyof ReadingState, unknown>>
  const recovered: LibraryData = {
    bookmarks: list(stored.bookmarks, bookmarkSchema, ['createdAt']),
    notes: list(stored.notes, noteSchema, ['createdAt', 'updatedAt']),
    reading: {
      lastRead: reading.lastRead ? (salvage(lastReadSchema, reading.lastRead, ['readAt']) ?? null) : null,
      lastStudy: reading.lastStudy ? (salvage(lastStudySchema, reading.lastStudy, ['updatedAt']) ?? null) : null,
    },
  }

  if (setAside.length > 0) {
    try {
      const previous = readSetAside()
      localStorage.setItem(SET_ASIDE_KEY, JSON.stringify([...previous, ...setAside]))
    } catch {
      // Storage refused the backup; keep the original entry untouched instead.
      return undefined
    }
    console.warn(`[library] ${setAside.length} saved item(s) could not be read and were set aside.`)
  }
  if (!libraryDataSchema.safeParse(recovered).success) return undefined
  try {
    // Store the cleaned library so the same items are not set aside again on the next load.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recovered))
  } catch {
    // Harmless: recovery simply runs again next time.
  }
  return recovered
}

function readSetAside(): unknown[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SET_ASIDE_KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export const localLibraryStore = createPersistentStore<LibraryData>(STORAGE_KEY, libraryDataSchema, emptyLibrary, { recover: recoverLibrary })

export function useLocalLibrary() {
  return usePersistentStore(localLibraryStore)
}

/** Saves a change in this browser, or rejects when storage refuses it (nothing changes then). */
function save(updater: (state: LibraryData) => LibraryData) {
  if (!localLibraryStore.update(updater)) throw new LibrarySaveError('browser')
}

const sameReading = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export const localLibrary = {
  async toggleBookmark(reference: ScriptureReference): Promise<boolean> {
    const key = referenceKey(reference)
    const exists = localLibraryStore.getSnapshot().bookmarks.some((bookmark) => referenceKey(bookmark.reference) === key)
    save((state) => ({
      ...state,
      bookmarks: exists
        ? state.bookmarks.filter((bookmark) => referenceKey(bookmark.reference) !== key)
        : [{ id: crypto.randomUUID(), reference, createdAt: now() }, ...state.bookmarks],
    }))
    return !exists
  },
  async removeBookmark(id: string): Promise<void> {
    save((state) => ({ ...state, bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id) }))
  },
  async addNote(reference: ScriptureReference, text: string): Promise<void> {
    const timestamp = now()
    save((state) => ({ ...state, notes: [{ id: crypto.randomUUID(), reference, text, createdAt: timestamp, updatedAt: timestamp }, ...state.notes] }))
  },
  async deleteNote(id: string): Promise<void> {
    save((state) => ({ ...state, notes: state.notes.filter((note) => note.id !== id) }))
  },
  /** Progress is best effort: if storage refuses it, nothing is lost but the bookmark of where you were. */
  recordReading(bookId: BookId, chapter: number) {
    const { lastRead } = localLibraryStore.getSnapshot().reading
    if (lastRead?.bookId === bookId && lastRead.chapter === chapter) return
    localLibraryStore.update((state) => ({ ...state, reading: { ...state.reading, lastRead: { bookId, chapter, readAt: now() } } }))
  },
  recordStudy(studyId: EntityId<'study'>, sectionId: string) {
    const { lastStudy } = localLibraryStore.getSnapshot().reading
    if (lastStudy?.studyId === studyId && lastStudy.sectionId === sectionId) return
    localLibraryStore.update((state) => ({ ...state, reading: { ...state.reading, lastStudy: { studyId, sectionId, updatedAt: now() } } }))
  },
  /**
   * After a successful import: removes exactly what was sent, so anything
   * saved here while the import was in flight stays to be imported next.
   */
  removeImported(sent: LibraryData) {
    const bookmarkIds = new Set(sent.bookmarks.map((bookmark) => bookmark.id))
    const noteIds = new Set(sent.notes.map((note) => note.id))
    localLibraryStore.update((state) => ({
      bookmarks: state.bookmarks.filter((bookmark) => !bookmarkIds.has(bookmark.id)),
      notes: state.notes.filter((note) => !noteIds.has(note.id)),
      reading: {
        lastRead: sameReading(state.reading.lastRead, sent.reading.lastRead) ? null : state.reading.lastRead,
        lastStudy: sameReading(state.reading.lastStudy, sent.reading.lastStudy) ? null : state.reading.lastStudy,
      },
    }))
  },
  isEmpty(data: LibraryData = localLibraryStore.getSnapshot()) {
    return data.bookmarks.length === 0 && data.notes.length === 0 && !data.reading.lastRead && !data.reading.lastStudy
  },
}

/** Items set aside because they could not be read, so the Library page can offer them for download. */
export const setAsideItems = {
  count: () => readSetAside().length,
  download() {
    const blob = new Blob([JSON.stringify(readSetAside(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = Object.assign(document.createElement('a'), { href: url, download: 'thread-bible-unreadable-items.json' })
    link.click()
    URL.revokeObjectURL(url)
  },
  dismiss() {
    try {
      localStorage.removeItem(SET_ASIDE_KEY)
    } catch {
      // Nothing to do; the notice simply stays.
    }
  },
}
