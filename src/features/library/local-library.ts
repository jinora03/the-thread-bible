import { libraryDataSchema } from '@shared/schemas/library'
import { referenceKey } from '@shared/scripture/reference'
import type { EntityId } from '@shared/types/content'
import type { LibraryData } from '@shared/types/library'
import type { BookId, ScriptureReference } from '@shared/types/scripture'
import { createPersistentStore, usePersistentStore } from '@/lib/persistent-store'

/** The signed-out library, kept in this browser. Imported into an account on sign-in. */
export const emptyLibrary: LibraryData = { bookmarks: [], notes: [], reading: { lastRead: null, lastStudy: null } }

export const localLibraryStore = createPersistentStore<LibraryData>('ttb-library-v2', libraryDataSchema, emptyLibrary)

export function useLocalLibrary() {
  return usePersistentStore(localLibraryStore)
}

const now = () => new Date().toISOString()
const update = localLibraryStore.update

export const localLibrary = {
  toggleBookmark(reference: ScriptureReference): boolean {
    const key = referenceKey(reference)
    const exists = localLibraryStore.getSnapshot().bookmarks.some((bookmark) => referenceKey(bookmark.reference) === key)
    update((state) => ({
      ...state,
      bookmarks: exists
        ? state.bookmarks.filter((bookmark) => referenceKey(bookmark.reference) !== key)
        : [{ id: crypto.randomUUID(), reference, createdAt: now() }, ...state.bookmarks],
    }))
    return !exists
  },
  removeBookmark(id: string) {
    update((state) => ({ ...state, bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id) }))
  },
  addNote(reference: ScriptureReference, text: string) {
    const timestamp = now()
    update((state) => ({ ...state, notes: [{ id: crypto.randomUUID(), reference, text, createdAt: timestamp, updatedAt: timestamp }, ...state.notes] }))
  },
  deleteNote(id: string) {
    update((state) => ({ ...state, notes: state.notes.filter((note) => note.id !== id) }))
  },
  recordReading(bookId: BookId, chapter: number) {
    const { lastRead } = localLibraryStore.getSnapshot().reading
    if (lastRead?.bookId === bookId && lastRead.chapter === chapter) return
    update((state) => ({ ...state, reading: { ...state.reading, lastRead: { bookId, chapter, readAt: now() } } }))
  },
  recordStudy(studyId: EntityId<'study'>, sectionId: string) {
    const { lastStudy } = localLibraryStore.getSnapshot().reading
    if (lastStudy?.studyId === studyId && lastStudy.sectionId === sectionId) return
    update((state) => ({ ...state, reading: { ...state.reading, lastStudy: { studyId, sectionId, updatedAt: now() } } }))
  },
  clear() {
    update(() => emptyLibrary)
  },
  isEmpty(data: LibraryData = localLibraryStore.getSnapshot()) {
    return data.bookmarks.length === 0 && data.notes.length === 0 && !data.reading.lastRead && !data.reading.lastStudy
  },
}
