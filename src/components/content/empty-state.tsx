import { Heading, type HeadingLevel } from '@/components/typography/heading'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description: React.ReactNode
  /** Recovery actions: links or buttons that move the reader forward. */
  action?: React.ReactNode
  /** `page` when the state is the whole page (renders the h1); `inline` inside a section. */
  size?: 'page' | 'inline'
  headingLevel?: HeadingLevel
  eyebrow?: React.ReactNode
  className?: string
}

/**
 * Explains what is missing and why, and offers a way on.
 * Avoid generic copy: say which chapter, which collection, which search.
 */
export function EmptyState({
  title,
  description,
  action,
  size = 'inline',
  headingLevel = size === 'page' ? 1 : 3,
  eyebrow,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        size === 'page' ? 'max-w-[40rem] py-8 sm:py-16' : 'rounded-lg bg-surface-subtle/60 px-5 py-6 sm:px-6',
        className,
      )}
    >
      {eyebrow && <div className="mb-3">{eyebrow}</div>}
      <Heading level={headingLevel} variant={size === 'page' ? 'title' : 'item'}>
        {title}
      </Heading>
      <div
        className={cn(
          'text-pretty text-muted-foreground',
          size === 'page' ? 'mt-4 max-w-[56ch] text-lg leading-relaxed' : 'mt-1.5 max-w-[60ch] text-sm leading-relaxed',
        )}
      >
        {description}
      </div>
      {action && (
        <div className={cn('flex flex-wrap items-center gap-3', size === 'page' ? 'mt-8' : 'mt-4')}>{action}</div>
      )}
    </div>
  )
}
