import { queryOptions, useQuery } from '@tanstack/react-query'
import { referenceKey } from '@shared/scripture/reference'
import type { EntityId } from '@shared/types/content'
import type { Bookmark, LibraryData, Note, ReadingState } from '@shared/types/library'
import type { BookId, ScriptureReference } from '@shared/types/scripture'
import { queryClient } from '@/app/query-client'
import { LibrarySaveError } from '@/features/library/library-errors'
import { emptyLibrary, localLibrary, localLibraryStore, useLocalLibrary } from '@/features/library/local-library'
import { api, isNotFound } from '@/services/api-client'
import { useSession } from '@/services/auth-client'

/** What every library supports, in this browser or in an account. Saves resolve only once they are stored. */
export interface LibraryActions {
  /** Resolves true when the passage is now bookmarked, false when the bookmark was removed. */
  toggleBookmark(reference: ScriptureReference): Promise<boolean>
  removeBookmark(id: string): Promise<void>
  addNote(reference: ScriptureReference, text: string): Promise<void>
  deleteNote(id: string): Promise<void>
  /** Progress tracking is best effort and never interrupts reading. */
  recordReading(bookId: BookId, chapter: number): void
  recordStudy(studyId: EntityId<'study'>, sectionId: string): void
}

/** Each account's library is cached under its own key, so one reader's data can never appear in another's view. */
export const libraryKey = (userId: string) => ['library', userId] as const

export const libraryQuery = (userId: string) =>
  queryOptions({
    queryKey: libraryKey(userId),
    queryFn: async ({ signal }) => withPending(userId, await api.get<LibraryData>('/library', undefined, signal)),
    staleTime: 30_000,
  })

// Changes sent to an account but not yet confirmed. Any library response that
// lands meanwhile (a refetch, an import) is shown with them applied, so a
// response computed before a change was saved can't make it flicker away.
interface PendingChanges {
  bookmarks: Map<string, Bookmark>
  notes: Map<string, Note>
  removed: Set<string>
}
const pendingByUser = new Map<string, PendingChanges>()
const pendingFor = (userId: string) => {
  let changes = pendingByUser.get(userId)
  if (!changes) pendingByUser.set(userId, (changes = { bookmarks: new Map(), notes: new Map(), removed: new Set() }))
  return changes
}

const noteKey = (note: Note) => `${referenceKey(note.reference)}\n${note.text}`

export function withPending(userId: string, data: LibraryData): LibraryData {
  const changes = pendingByUser.get(userId)
  if (!changes) return data
  const bookmarks = data.bookmarks.filter((bookmark) => !changes.removed.has(bookmark.id))
  const notes = data.notes.filter((note) => !changes.removed.has(note.id))
  const savedBookmarks = new Set(bookmarks.map((bookmark) => referenceKey(bookmark.reference)))
  const savedNotes = new Set(notes.map(noteKey))
  return {
    ...data,
    bookmarks: [...[...changes.bookmarks.values()].filter((bookmark) => !savedBookmarks.has(referenceKey(bookmark.reference))), ...bookmarks],
    notes: [...[...changes.notes.values()].filter((note) => !savedNotes.has(noteKey(note))), ...notes],
  }
}

/**
 * Updates an account's cached library, but only while that cache exists.
 * It is removed on sign-out, so a response that arrives later is dropped
 * instead of bringing the old account's data back.
 */
function updateCache(userId: string, updater: (data: LibraryData) => LibraryData) {
  const key = libraryKey(userId)
  if (queryClient.getQueryData(key) === undefined) return
  queryClient.setQueryData<LibraryData>(key, (data) => (data ? updater(data) : data))
}

/** Replaces a temporary item with the saved one (or drops it, if the saved one is already listed). */
function confirmItem<T extends { id: string }>(items: T[], temporaryId: string, saved: T): T[] {
  if (items.some((item) => item.id === saved.id)) return items.filter((item) => item.id !== temporaryId)
  return items.some((item) => item.id === temporaryId) ? items.map((item) => (item.id === temporaryId ? saved : item)) : [saved, ...items]
}

function restoreItem<T extends { id: string }>(items: T[], item: T, index: number): T[] {
  if (items.some((existing) => existing.id === item.id)) return items
  return [...items.slice(0, index), item, ...items.slice(index)]
}

/**
 * Runs one change against the account. On failure only that change is undone,
 * so a failed request can never erase another change that succeeded. Afterwards
 * the library is refetched, so the newest server state always wins.
 */
async function change<T>(
  userId: string,
  steps: { apply: () => void; request: () => Promise<T>; confirm: (result: T) => void; revert: () => void },
): Promise<T> {
  steps.apply()
  try {
    const result = await steps.request()
    steps.confirm(result)
    return result
  } catch (cause) {
    steps.revert()
    throw new LibrarySaveError('account', { cause })
  } finally {
    void queryClient.invalidateQueries({ queryKey: libraryKey(userId) })
  }
}

/** Deleting something already gone is a success. */
const deleteRequest = (path: string) => () =>
  api.delete(path).catch((error: unknown) => {
    if (!isNotFound(error)) throw error
  })

const PENDING_PREFIX = 'pending-'
const now = () => new Date().toISOString()

function createRemoteLibrary(userId: string): LibraryActions {
  const changes = pendingFor(userId)
  const current = () => withPending(userId, queryClient.getQueryData<LibraryData>(libraryKey(userId)) ?? emptyLibrary)
  // A bookmark still being created can be removed only once its real id is known.
  const bookmarksInFlight = new Map<string, Promise<string | undefined>>()

  const addBookmark = (reference: ScriptureReference) => {
    const temporary: Bookmark = { id: `${PENDING_PREFIX}${crypto.randomUUID()}`, reference, createdAt: now() }
    const saved = change(userId, {
      apply: () => {
        changes.bookmarks.set(temporary.id, temporary)
        updateCache(userId, (data) => ({ ...data, bookmarks: [temporary, ...data.bookmarks] }))
      },
      request: () => api.post<Bookmark>('/library/bookmarks', { reference }),
      confirm: (bookmark) => {
        changes.bookmarks.delete(temporary.id)
        updateCache(userId, (data) => ({ ...data, bookmarks: confirmItem(data.bookmarks, temporary.id, bookmark) }))
      },
      revert: () => {
        changes.bookmarks.delete(temporary.id)
        updateCache(userId, (data) => ({ ...data, bookmarks: data.bookmarks.filter((bookmark) => bookmark.id !== temporary.id) }))
      },
    })
    bookmarksInFlight.set(
      temporary.id,
      saved.then(
        (bookmark) => bookmark.id,
        () => undefined,
      ),
    )
    void saved.finally(() => bookmarksInFlight.delete(temporary.id)).catch(() => {})
    return saved
  }

  const removeBookmark = (id: string) => {
    const before = current().bookmarks
    const index = before.findIndex((bookmark) => bookmark.id === id)
    const removed = before[index]
    return change(userId, {
      apply: () => {
        changes.removed.add(id)
        updateCache(userId, (data) => ({ ...data, bookmarks: data.bookmarks.filter((bookmark) => bookmark.id !== id) }))
      },
      request: deleteRequest(`/library/bookmarks/${id}`),
      confirm: () => changes.removed.delete(id),
      revert: () => {
        changes.removed.delete(id)
        if (removed) updateCache(userId, (data) => ({ ...data, bookmarks: restoreItem(data.bookmarks, removed, index) }))
      },
    })
  }

  return {
    async toggleBookmark(reference) {
      const existing = current().bookmarks.find((bookmark) => referenceKey(bookmark.reference) === referenceKey(reference))
      if (!existing) {
        await addBookmark(reference)
        return true
      }
      const id = existing.id.startsWith(PENDING_PREFIX) ? await bookmarksInFlight.get(existing.id) : existing.id
      if (id) await removeBookmark(id)
      return false
    },

    async removeBookmark(id) {
      await removeBookmark(id)
    },

    async addNote(reference, text) {
      const timestamp = now()
      const temporary: Note = { id: `${PENDING_PREFIX}${crypto.randomUUID()}`, reference, text, createdAt: timestamp, updatedAt: timestamp }
      await change(userId, {
        apply: () => {
          changes.notes.set(temporary.id, temporary)
          updateCache(userId, (data) => ({ ...data, notes: [temporary, ...data.notes] }))
        },
        request: () => api.post<Note>('/library/notes', { reference, text }),
        confirm: (note) => {
          changes.notes.delete(temporary.id)
          updateCache(userId, (data) => ({ ...data, notes: confirmItem(data.notes, temporary.id, note) }))
        },
        revert: () => {
          changes.notes.delete(temporary.id)
          updateCache(userId, (data) => ({ ...data, notes: data.notes.filter((note) => note.id !== temporary.id) }))
        },
      })
    },

    async deleteNote(id) {
      const before = current().notes
      const index = before.findIndex((note) => note.id === id)
      const removed = before[index]
      await change(userId, {
        apply: () => {
          changes.removed.add(id)
          updateCache(userId, (data) => ({ ...data, notes: data.notes.filter((note) => note.id !== id) }))
        },
        request: deleteRequest(`/library/notes/${id}`),
        confirm: () => changes.removed.delete(id),
        revert: () => {
          changes.removed.delete(id)
          if (removed) updateCache(userId, (data) => ({ ...data, notes: restoreItem(data.notes, removed, index) }))
        },
      })
    },

    recordReading(bookId, chapter) {
      const { lastRead } = current().reading
      if (lastRead?.bookId === bookId && lastRead.chapter === chapter) return
      api
        .put<ReadingState>('/library/reading', { lastRead: { bookId, chapter } })
        .then((reading) => updateCache(userId, (data) => ({ ...data, reading })))
        .catch(() => {})
    },

    recordStudy(studyId, sectionId) {
      const { lastStudy } = current().reading
      if (lastStudy?.studyId === studyId && lastStudy.sectionId === sectionId) return
      api
        .put<ReadingState>('/library/reading', { lastStudy: { studyId, sectionId } })
        .then((reading) => updateCache(userId, (data) => ({ ...data, reading })))
        .catch(() => {})
    },
  }
}

// One stable set of actions per account, so effects that depend on them do not re-run needlessly.
const remoteLibraries = new Map<string, LibraryActions>()
export function remoteLibraryFor(userId: string): LibraryActions {
  let actions = remoteLibraries.get(userId)
  if (!actions) remoteLibraries.set(userId, (actions = createRemoteLibrary(userId)))
  return actions
}

/**
 * Moves the browser library into an account. Only what was sent is removed
 * from the browser afterwards, so anything saved meanwhile is kept for the next
 * import. The merged library is shown only if that account is still signed in.
 */
export async function importLocalLibrary(userId: string, isCurrentUser: () => boolean): Promise<LibraryData | undefined> {
  const sent = localLibraryStore.getSnapshot()
  if (localLibrary.isEmpty(sent)) return undefined
  const merged = await api.post<LibraryData>('/library/import', sent)
  localLibrary.removeImported(sent)
  if (isCurrentUser()) {
    // A library request sent before the import could otherwise answer later and overwrite this.
    await queryClient.cancelQueries({ queryKey: libraryKey(userId) })
    queryClient.setQueryData(libraryKey(userId), withPending(userId, merged))
  }
  return merged
}

// Until the session is known, automatic progress tracking waits. Written to this
// browser, it would look like signed-out activity and be imported on every load.
// Callers re-run when `actions` changes, so progress is recorded once it resolves.
const sessionPendingLibrary: LibraryActions = {
  ...localLibrary,
  recordReading: () => {},
  recordStudy: () => {},
}

/**
 * The reader's library, wherever it lives: in the account when signed in,
 * in this browser otherwise. Components use one API either way.
 */
export function useLibrary() {
  const session = useSession()
  const userId = session.data?.user.id
  const local = useLocalLibrary()
  const remote = useQuery({ ...libraryQuery(userId ?? ''), enabled: Boolean(userId) })

  return {
    data: userId ? (remote.data ?? emptyLibrary) : local,
    isSynced: Boolean(userId),
    isLoading: session.isPending || (Boolean(userId) && remote.isPending),
    user: session.data?.user ?? null,
    actions: session.isPending ? sessionPendingLibrary : userId ? remoteLibraryFor(userId) : localLibrary,
  }
}

export function isBookmarked(data: LibraryData, reference: ScriptureReference) {
  const referenceId = referenceKey(reference)
  return data.bookmarks.some((bookmark) => referenceKey(bookmark.reference) === referenceId)
}
