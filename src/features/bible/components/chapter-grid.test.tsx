import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { chapterNotesQuery } from '@/services/content'
import { getBook } from '@shared/scripture/books'
import { ChapterGrid } from './chapter-grid'

const romans = getBook('romans')!

function renderGrid(currentChapter?: number) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(chapterNotesQuery().queryKey, [
    { bookId: 'romans', chapter: 8, title: 'Romans 8', reviewStatus: 'in-review' },
  ])
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChapterGrid book={romans} currentChapter={currentChapter} columns={4} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const focusedChapter = () => document.activeElement?.textContent

describe('ChapterGrid', () => {
  it('links every chapter and marks the current one', () => {
    renderGrid(8)
    expect(screen.getAllByRole('link')).toHaveLength(16)
    const current = screen.getByRole('link', { current: 'page' })
    expect(current).toHaveAttribute('href', '/bible/romans/8')
  })

  it('announces chapters that have study notes', () => {
    renderGrid()
    expect(screen.getByRole('link', { name: 'Romans 8, has study notes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Romans 9' })).toBeInTheDocument()
  })

  it('is a single tab stop on the current chapter', async () => {
    renderGrid(5)
    await userEvent.tab()
    expect(focusedChapter()).toBe('5')
    await userEvent.tab()
    expect(document.activeElement).toBe(document.body)
  })

  it('moves focus with arrow keys, Home and End', async () => {
    renderGrid(5)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}')
    expect(focusedChapter()).toBe('6')
    await userEvent.keyboard('{ArrowDown}')
    expect(focusedChapter()).toBe('10')
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}')
    expect(focusedChapter()).toBe('1')
    await userEvent.keyboard('{ArrowLeft}')
    expect(focusedChapter()).toBe('1')
    await userEvent.keyboard('{End}')
    expect(focusedChapter()).toBe('16')
    await userEvent.keyboard('{Home}')
    expect(focusedChapter()).toBe('1')
  })
})
