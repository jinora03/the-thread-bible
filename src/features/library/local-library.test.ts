import { afterEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'ttb-library-v2'
const SET_ASIDE_KEY = `${STORAGE_KEY}-set-aside`
const at = '2026-10-01T00:00:00.000Z'

/** The store reads localStorage when its module loads, so each test gets a fresh copy. */
async function loadLibrary() {
  vi.resetModules()
  return import('@/features/library/local-library')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('browser library', () => {
  it('rejects a save the browser refuses, and changes nothing', async () => {
    const { localLibrary, localLibraryStore } = await loadLibrary()
    const { LibrarySaveError } = await import('@/features/library/library-errors')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    await expect(localLibrary.addNote({ book: 'john', chapter: 3, verse: 16 }, 'For God so loved')).rejects.toBeInstanceOf(LibrarySaveError)
    expect(localLibraryStore.getSnapshot().notes).toEqual([])
  })

  it('keeps readable items when one is corrupt, and sets the bad one aside', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        bookmarks: [{ id: 'b1', reference: { book: 'john', chapter: 3, verse: 16 }, createdAt: at }],
        notes: [
          { id: 'n1', reference: { book: 'john', chapter: 1, verse: 1 }, text: 'Kept', createdAt: at, updatedAt: at },
          { id: 'n2', reference: { book: 'john', chapter: 1, verse: 2 }, text: 'Bad date', createdAt: 'yesterday', updatedAt: at },
          { id: 'n3', reference: { book: 'nowhere', chapter: 1 }, text: 'Unknown book', createdAt: at, updatedAt: at },
        ],
        reading: { lastRead: null, lastStudy: null },
      }),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { localLibraryStore, setAsideItems } = await loadLibrary()

    const library = localLibraryStore.getSnapshot()
    expect(library.bookmarks).toHaveLength(1)
    // A bad timestamp is repaired; an unknown book cannot be, so that note is set aside, not deleted.
    expect(library.notes.map((note) => note.text)).toEqual(['Kept', 'Bad date'])
    expect(setAsideItems.count()).toBe(1)
    expect(JSON.parse(localStorage.getItem(SET_ASIDE_KEY)!)[0].text).toBe('Unknown book')

    // The cleaned library was stored, so loading again does not set the item aside twice.
    const reloaded = await loadLibrary()
    expect(reloaded.localLibraryStore.getSnapshot().notes).toHaveLength(2)
    expect(reloaded.setAsideItems.count()).toBe(1)
  })

  it('after an import, removes only what was sent', async () => {
    const { localLibrary, localLibraryStore } = await loadLibrary()
    await localLibrary.addNote({ book: 'john', chapter: 1, verse: 1 }, 'Sent')
    localLibrary.recordReading('john', 1)
    const sent = localLibraryStore.getSnapshot()

    // Saved while the import was in flight.
    await localLibrary.toggleBookmark({ book: 'john', chapter: 1, verse: 29 })
    localLibrary.removeImported(sent)

    const remaining = localLibraryStore.getSnapshot()
    expect(remaining.notes).toEqual([])
    expect(remaining.reading.lastRead).toBeNull()
    expect(remaining.bookmarks.map((bookmark) => bookmark.reference.verse)).toEqual([29])
  })
})
