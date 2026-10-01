import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LibraryData, Note } from '@shared/types/library'
import { queryClient } from '@/app/query-client'
import { LibrarySaveError } from '@/features/library/library-errors'
import { libraryKey, libraryQuery, remoteLibraryFor } from '@/features/library/use-library'

const empty: LibraryData = { bookmarks: [], notes: [], reading: { lastRead: null, lastStudy: null } }
const verse = (n: number) => ({ book: 'john', chapter: 1, verse: n })
const savedNote = (id: string, text: string, n: number): Note => ({
  id,
  reference: verse(n),
  text,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
})

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const failure = () => json({ error: { code: 'internal_error', message: 'boom' } }, 500)

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

/** Routes fetch calls to handlers by "METHOD path"; each handler is used once, in order. */
function stubFetch(routes: Record<string, (() => Response | Promise<Response>)[]>) {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const handler = routes[`${init?.method ?? 'GET'} ${url}`]?.shift()
    if (!handler) return json(empty)
    return handler()
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

let users = 0
const newUser = () => `reader-${++users}`
const notesOf = (userId: string) => queryClient.getQueryData<LibraryData>(libraryKey(userId))?.notes.map((note) => note.text)

afterEach(() => {
  vi.unstubAllGlobals()
  queryClient.clear()
})

describe('account library', () => {
  it('rejects a failed note save and removes only that note', async () => {
    const userId = newUser()
    queryClient.setQueryData(libraryKey(userId), empty)
    stubFetch({ 'POST /api/library/notes': [failure] })

    await expect(remoteLibraryFor(userId).addNote(verse(1), 'Lost?')).rejects.toBeInstanceOf(LibrarySaveError)
    expect(notesOf(userId)).toEqual([])
  })

  it('keeps a successful change when a concurrent one fails', async () => {
    const userId = newUser()
    queryClient.setQueryData(libraryKey(userId), empty)
    const first = deferred<Response>()
    const second = deferred<Response>()
    stubFetch({ 'POST /api/library/notes': [() => first.promise, () => second.promise] })
    const library = remoteLibraryFor(userId)

    const failing = library.addNote(verse(1), 'First')
    const succeeding = library.addNote(verse(2), 'Second')
    expect(notesOf(userId)).toEqual(['Second', 'First'])

    second.resolve(json(savedNote('n2', 'Second', 2)))
    await succeeding
    first.resolve(failure())
    await expect(failing).rejects.toBeInstanceOf(LibrarySaveError)

    // Only the failed note is undone; the saved one stays.
    expect(notesOf(userId)).toEqual(['Second'])
  })

  it('restores a note whose deletion failed, without touching others', async () => {
    const userId = newUser()
    queryClient.setQueryData(libraryKey(userId), { ...empty, notes: [savedNote('a', 'Keep me', 1), savedNote('b', 'Delete me', 2)] })
    stubFetch({ 'DELETE /api/library/notes/a': [failure], 'DELETE /api/library/notes/b': [() => new Response(null, { status: 204 })] })
    const library = remoteLibraryFor(userId)

    const results = await Promise.allSettled([library.deleteNote('a'), library.deleteNote('b')])
    expect(results.map((result) => result.status)).toEqual(['rejected', 'fulfilled'])
    expect(notesOf(userId)).toEqual(['Keep me'])
  })

  it('shows a pending note even when a refetch lands before it is saved', async () => {
    const userId = newUser()
    const save = deferred<Response>()
    stubFetch({ 'POST /api/library/notes': [() => save.promise], 'GET /api/library': [() => json(empty)] })
    queryClient.setQueryData(libraryKey(userId), empty)

    const saving = remoteLibraryFor(userId).addNote(verse(3), 'Pending')
    // A refetch answered from before the save arrives first.
    await queryClient.fetchQuery({ ...libraryQuery(userId), staleTime: 0 })
    expect(notesOf(userId)).toEqual(['Pending'])

    save.resolve(json(savedNote('n3', 'Pending', 3)))
    await saving
    expect(queryClient.getQueryData<LibraryData>(libraryKey(userId))?.notes.map((note) => note.id)).toEqual(['n3'])
  })

  it('drops a late response after sign-out instead of restoring the old account', async () => {
    const previousUser = newUser()
    const nextUser = newUser()
    queryClient.setQueryData(libraryKey(previousUser), empty)
    const save = deferred<Response>()
    stubFetch({ 'POST /api/library/notes': [() => save.promise] })

    const saving = remoteLibraryFor(previousUser).addNote(verse(4), 'Private')
    // The reader signs out and someone else signs in before the save answers.
    queryClient.removeQueries({ queryKey: ['library'] })
    queryClient.setQueryData(libraryKey(nextUser), empty)

    save.resolve(json(savedNote('n4', 'Private', 4)))
    await saving
    expect(queryClient.getQueryData(libraryKey(previousUser))).toBeUndefined()
    expect(notesOf(nextUser)).toEqual([])
  })

  it('removes a bookmark that was still being created', async () => {
    const userId = newUser()
    queryClient.setQueryData(libraryKey(userId), empty)
    const create = deferred<Response>()
    const fetch = stubFetch({
      'POST /api/library/bookmarks': [() => create.promise],
      'DELETE /api/library/bookmarks/b1': [() => new Response(null, { status: 204 })],
    })
    const library = remoteLibraryFor(userId)

    const adding = library.toggleBookmark(verse(5))
    const removing = library.toggleBookmark(verse(5))
    create.resolve(json({ id: 'b1', reference: verse(5), createdAt: '2026-10-01T00:00:00.000Z' }))

    expect(await adding).toBe(true)
    expect(await removing).toBe(false)
    expect(fetch.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`)).toContain('DELETE /api/library/bookmarks/b1')
  })
})
