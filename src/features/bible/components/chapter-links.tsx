import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { chapterHref, formatChapter } from '@shared/scripture/reference'
import { cn } from '@/lib/utils'
import type { BibleBook } from '@shared/types/scripture'

export type ChapterTarget = { book: BibleBook; chapter: number } | undefined

/** Icon link to the previous/next chapter; renders a disabled button at either end of the canon. */
export function ChapterStepLink({
  target,
  direction,
  className,
}: {
  target: ChapterTarget
  direction: 'previous' | 'next'
  className?: string
}) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight
  if (!target) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label={`No ${direction} chapter`} className={className}>
        <Icon />
      </Button>
    )
  }
  const label = `${direction === 'previous' ? 'Previous' : 'Next'} chapter: ${formatChapter(target.book.id, target.chapter)}`
  return (
    <Button asChild variant="ghost" size="icon" className={className}>
      <Link to={chapterHref(target.book.id, target.chapter)} aria-label={label} title={label}>
        <Icon />
      </Link>
    </Button>
  )
}

/** End-of-chapter pagination: the natural way to keep reading. */
export function ChapterPagination({ previous, next }: { previous: ChapterTarget; next: ChapterTarget }) {
  return (
    <nav aria-label="Chapter navigation" className="mt-16 grid grid-cols-2 gap-4 border-t pt-6">
      {previous ? (
        <Link to={chapterHref(previous.book.id, previous.chapter)} className="group">
          <span className="eyebrow">Previous</span>
          <span className="mt-1 flex items-center gap-1 font-serif text-lg group-hover:text-primary dark:group-hover:text-reference">
            <ChevronLeft aria-hidden="true" className="size-4 text-muted-foreground" />
            {formatChapter(previous.book.id, previous.chapter)}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={chapterHref(next.book.id, next.chapter)} className={cn('group text-right')}>
          <span className="eyebrow">Next</span>
          <span className="mt-1 flex items-center justify-end gap-1 font-serif text-lg group-hover:text-primary dark:group-hover:text-reference">
            {formatChapter(next.book.id, next.chapter)}
            <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
          </span>
        </Link>
      )}
    </nav>
  )
}
