import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LibraryData } from '@shared/types/library'
import { queryClient } from '@/app/query-client'
import { localLibrary } from '@/features/library/local-library'
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

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
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

afterEach(() => {
  vi.unstubAllGlobals()
  queryClient.clear()
})

describe('LibrarySync', () => {
  it('keeps the imported library when an earlier library request answers late', async () => {
    localLibrary.toggleBookmark(reference)

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
})
