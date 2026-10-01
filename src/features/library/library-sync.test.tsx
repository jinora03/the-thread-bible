import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LibraryData } from '@shared/types/library'
import { queryClient } from '@/app/query-client'
import { localLibrary, localLibraryStore } from '@/features/library/local-library'
import { LibrarySync } from '@/features/library/library-sync'
import { useLibrary } from '@/features/library/use-library'

vi.mock('@/services/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'reader-1' } }, isPending: false }),
}))

const reference = { book: 'romans', chapter: 8, verse: 28 }
const emptyAccount: LibraryData = { bookmarks: [], notes: [], reading: { lastRead: null, lastStudy: null } }
const mergedAccount: LibraryData = {
  ...emptyAccount,
  bookmarks: [{ id: 'b1', reference, createdAt: '2026-10-01T00:00:00.000Z' }],
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const delay = (ms: number, signal?: AbortSignal | null) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })

function BookmarkCount() {
  const { data } = useLibrary()
  return <p>{data.bookmarks.length} bookmarks</p>
}

function renderSync() {
  return render(
    <QueryClientProvider client={queryClient}>
      <LibrarySync />
      <BookmarkCount />
      <Toaster />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  queryClient.clear()
  localLibraryStore.update(() => emptyAccount)
})

describe('LibrarySync', () => {
  it('keeps the imported library when an earlier library request answers late', async () => {
    await localLibrary.toggleBookmark(reference)

    // The library GET was answered from before the import, but its reply lands last.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/library/import') return json(mergedAccount)
        if (url === '/api/library') {
          await delay(100, init?.signal)
          return json(emptyAccount)
        }
        return new Response(null, { status: 404 })
      }),
    )

    render(
      <QueryClientProvider client={queryClient}>
        <LibrarySync />
        <BookmarkCount />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText('1 bookmarks')).toBeInTheDocument())
    await delay(200)
    expect(screen.getByText('1 bookmarks')).toBeInTheDocument()
    expect(localLibrary.isEmpty()).toBe(true)
  })

  it('keeps everything in the browser when an import fails, and retries on request', async () => {
    await localLibrary.toggleBookmark(reference)
    let attempts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/library/import') return ++attempts === 1 ? json({ error: { code: 'internal_error', message: 'down' } }, 500) : json(mergedAccount)
        return json(emptyAccount)
      }),
    )
    renderSync()

    const retry = await screen.findByRole('button', { name: 'Try again' })
    expect(localLibraryStore.getSnapshot().bookmarks).toHaveLength(1)
    expect(attempts).toBe(1)

    await userEvent.click(retry)
    await waitFor(() => expect(localLibrary.isEmpty()).toBe(true))
    expect(attempts).toBe(2)
    await waitFor(() => expect(screen.getByText('1 bookmarks')).toBeInTheDocument())
  })

  it('moves a note saved during the import in a second import, without resending the first', async () => {
    await localLibrary.toggleBookmark(reference)
    const bodies: LibraryData[] = []
    let releaseFirst!: () => void
    const firstReply = new Promise<void>((resolve) => (releaseFirst = resolve))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url !== '/api/library/import') return json(emptyAccount)
        bodies.push(JSON.parse(String(init?.body)) as LibraryData)
        if (bodies.length === 1) await firstReply
        return json(mergedAccount)
      }),
    )
    renderSync()

    await waitFor(() => expect(bodies).toHaveLength(1))
    await localLibrary.addNote({ book: 'romans', chapter: 8, verse: 1 }, 'Written mid-import')
    releaseFirst()

    await waitFor(() => expect(bodies).toHaveLength(2))
    expect(bodies[1]!.bookmarks).toEqual([])
    expect(bodies[1]!.notes.map((note) => note.text)).toEqual(['Written mid-import'])
    await waitFor(() => expect(localLibrary.isEmpty()).toBe(true))
  })
})
