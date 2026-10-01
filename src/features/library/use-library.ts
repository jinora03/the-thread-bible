import { queryOptions, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { referenceKey } from '@shared/scripture/reference'
import type { EntityId } from '@shared/types/content'
import type { Bookmark, LibraryData, Note, ReadingState } from '@shared/types/library'
import type { BookId, ScriptureReference } from '@shared/types/scripture'
import { queryClient } from '@/app/query-client'
import { emptyLibrary, localLibrary, useLocalLibrary } from '@/features/library/local-library'
import { api } from '@/services/api-client'
import { useSession } from '@/services/auth-client'

export const libraryQuery = () =>
  queryOptions({
    queryKey: ['library'],
    queryFn: ({ signal }) => api.get<LibraryData>('/library', undefined, signal),
    staleTime: 30_000,
  })

const key = libraryQuery().queryKey
const current = () => queryClient.getQueryData<LibraryData>(key) ?? emptyLibrary
const setCurrent = (updater: (data: LibraryData) => LibraryData) => queryClient.setQueryData<LibraryData>(key, (data) => updater(data ?? emptyLibrary))

/** Applies an optimistic change, then reconciles with the server (or rolls back). */
async function optimistic<T>(apply: (data: LibraryData) => LibraryData, request: () => Promise<T>, reconcile?: (data: LibraryData, result: T) => LibraryData) {
  // An in-flight load would otherwise land afterwards and undo the change on screen.
  // If one was cancelled, reload once the change is saved so nothing goes missing.
  const interrupted = queryClient.isFetching({ queryKey: key }) > 0
  await queryClient.cancelQueries({ queryKey: key })
  const previous = current()
  setCurrent(apply)
  try {
    const result = await request()
    if (reconcile) setCurrent((data) => reconcile(data, result))
    return result
  } catch (error) {
    queryClient.setQueryData(key, previous)
    toast.error('That change couldn’t be saved to your account. Please try again.')
    throw error
  } finally {
    if (interrupted) void queryClient.invalidateQueries({ queryKey: key })
  }
}

const remoteLibrary = {
  toggleBookmark(reference: ScriptureReference): boolean {
    const referenceId = referenceKey(reference)
    const existing = current().bookmarks.find((bookmark) => referenceKey(bookmark.reference) === referenceId)
    if (existing) {
      void optimistic(
        (data) => ({ ...data, bookmarks: data.bookmarks.filter((bookmark) => bookmark.id !== existing.id) }),
        () => api.delete(`/library/bookmarks/${existing.id}`),
      ).catch(() => {})
      return false
    }
    const temporary: Bookmark = { id: `pending-${crypto.randomUUID()}`, reference, createdAt: new Date().toISOString() }
    void optimistic(
      (data) => ({ ...data, bookmarks: [temporary, ...data.bookmarks] }),
      () => api.post<Bookmark>('/library/bookmarks', { reference }),
      (data, saved) => ({ ...data, bookmarks: data.bookmarks.map((bookmark) => (bookmark.id === temporary.id ? saved : bookmark)) }),
    ).catch(() => {})
    return true
  },
  removeBookmark(id: string) {
    void optimistic(
      (data) => ({ ...data, bookmarks: data.bookmarks.filter((bookmark) => bookmark.id !== id) }),
      () => api.delete(`/library/bookmarks/${id}`),
    ).catch(() => {})
  },
  addNote(reference: ScriptureReference, text: string) {
    const timestamp = new Date().toISOString()
    const temporary: Note = { id: `pending-${crypto.randomUUID()}`, reference, text, createdAt: timestamp, updatedAt: timestamp }
    void optimistic(
      (data) => ({ ...data, notes: [temporary, ...data.notes] }),
      () => api.post<Note>('/library/notes', { reference, text }),
      (data, saved) => ({ ...data, notes: data.notes.map((note) => (note.id === temporary.id ? saved : note)) }),
    ).catch(() => {})
  },
  deleteNote(id: string) {
    void optimistic(
      (data) => ({ ...data, notes: data.notes.filter((note) => note.id !== id) }),
      () => api.delete(`/library/notes/${id}`),
    ).catch(() => {})
  },
  recordReading(bookId: BookId, chapter: number) {
    const { lastRead } = current().reading
    if (lastRead?.bookId === bookId && lastRead.chapter === chapter) return
    void api.put<ReadingState>('/library/reading', { lastRead: { bookId, chapter } }).then((reading) => setCurrent((data) => ({ ...data, reading })))
  },
  recordStudy(studyId: EntityId<'study'>, sectionId: string) {
    const { lastStudy } = current().reading
    if (lastStudy?.studyId === studyId && lastStudy.sectionId === sectionId) return
    void api.put<ReadingState>('/library/reading', { lastStudy: { studyId, sectionId } }).then((reading) => setCurrent((data) => ({ ...data, reading })))
  },
}

export type LibraryActions = typeof remoteLibrary

// Until the session is known, automatic progress tracking waits. Written to this
// browser, it would look like signed-out activity and be imported on every load.
// Callers re-run when `actions` changes, so progress is recorded once it resolves.
const sessionPendingLibrary = {
  ...(localLibrary as LibraryActions),
  recordReading: () => {},
  recordStudy: () => {},
} satisfies LibraryActions

/**
 * The reader's library, wherever it lives: in the account when signed in,
 * in this browser otherwise. Components use one API either way.
 */
export function useLibrary() {
  const session = useSession()
  const signedIn = Boolean(session.data?.user)
  const local = useLocalLibrary()
  const remote = useQuery({ ...libraryQuery(), enabled: signedIn })

  return {
    data: signedIn ? (remote.data ?? emptyLibrary) : local,
    isSynced: signedIn,
    isLoading: session.isPending || (signedIn && remote.isPending),
    user: session.data?.user ?? null,
    actions: session.isPending ? sessionPendingLibrary : ((signedIn ? remoteLibrary : localLibrary) as LibraryActions),
  }
}

export function isBookmarked(data: LibraryData, reference: ScriptureReference) {
  const referenceId = referenceKey(reference)
  return data.bookmarks.some((bookmark) => referenceKey(bookmark.reference) === referenceId)
}
