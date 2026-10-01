import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { chapterNotesQuery } from '@/services/content'
import { chapterHref, formatChapter } from '@shared/scripture/reference'
import type { BibleBook } from '@shared/types/scripture'

interface ChapterGridProps {
  book: BibleBook
  currentChapter?: number
  columns?: number
  /** Called after a chapter link is activated (e.g. to close a popover). */
  onNavigate?: () => void
  className?: string
}

const keyOffsets: Record<string, (columns: number) => number> = {
  ArrowRight: () => 1,
  ArrowLeft: () => -1,
  ArrowDown: (columns) => columns,
  ArrowUp: (columns) => -columns,
}

/**
 * Chapter numbers as a grid of links. One tab stop; arrow keys move between
 * chapters, Home/End jump to the first/last. Chapters with study notes are marked.
 */
export function ChapterGrid({ book, currentChapter, columns = 6, onNavigate, className }: ChapterGridProps) {
  const chapters = Array.from({ length: book.chapterCount }, (_, index) => index + 1)
  const tabStop = currentChapter ?? 1
  const { data: notes } = useQuery(chapterNotesQuery())
  const annotated = new Set(notes?.filter((note) => note.bookId === book.id).map((note) => note.chapter))

  const onKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
    const list = event.currentTarget.closest('ol')
    if (!list) return
    const links = [...list.querySelectorAll<HTMLAnchorElement>('a')]
    const index = links.indexOf(event.currentTarget)

    let next: number | undefined
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = links.length - 1
    else if (keyOffsets[event.key]) next = index + keyOffsets[event.key]!(columns)
    if (next === undefined) return

    event.preventDefault()
    links[Math.max(0, Math.min(links.length - 1, next))]?.focus()
  }

  return (
    <ol
      aria-label={`Chapters of ${book.name}`}
      className={cn('grid gap-1', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {chapters.map((chapter) => {
        const isCurrent = chapter === currentChapter
        const hasNotes = annotated.has(chapter)
        return (
          <li key={chapter}>
            <Link
              to={chapterHref(book.id, chapter)}
              onClick={onNavigate}
              onKeyDown={onKeyDown}
              tabIndex={chapter === tabStop ? 0 : -1}
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={`${formatChapter(book.id, chapter)}${hasNotes ? ', has study notes' : ''}`}
              className={cn(
                'relative flex h-10 items-center justify-center rounded-md text-sm tabular-nums transition-colors',
                isCurrent
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'text-foreground hover:bg-accent',
              )}
            >
              {chapter}
              {hasNotes && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full',
                    isCurrent ? 'bg-primary-foreground' : 'bg-thread',
                  )}
                />
              )}
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
