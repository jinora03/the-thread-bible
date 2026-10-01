import type { ReviewInfo, ReviewStatus } from '@shared/types/content'
import { cn } from '@/lib/utils'

const statusLabels: Record<ReviewStatus, string> = {
  draft: 'Draft',
  'in-review': 'In review',
  published: 'Reviewed',
}

/**
 * Editorial status, stated plainly. Unpublished entries are only visible in
 * preview; published entries list who reviewed them.
 */
export function ReviewNotice({ review, className }: { review: ReviewInfo; className?: string }) {
  if (review.status === 'published') {
    const names = review.reviewers.map((reviewer) => `${reviewer.name} (${reviewer.role})`).join(', ')
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Reviewed by {names}. Written by {review.authors.join(', ')}.
      </p>
    )
  }
  return (
    <p className={cn('flex items-start gap-2.5 rounded-md bg-surface-subtle px-3.5 py-2.5 text-sm text-muted-foreground', className)}>
      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full border border-muted-foreground" />
      <span>
        <span className="font-medium text-foreground">{statusLabels[review.status]}.</span>{' '}
        {review.note ?? 'This entry has not yet completed editorial and theological review.'}
      </span>
    </p>
  )
}

export function ReviewStatusLabel({ status }: { status: ReviewStatus }) {
  if (status === 'published') return null
  return <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>
}
