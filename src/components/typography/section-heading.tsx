import { Heading, type HeadingLevel } from '@/components/typography/heading'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  title: React.ReactNode
  level?: HeadingLevel
  variant?: 'section' | 'subsection' | 'label'
  id?: string
  /** Small label above the title, e.g. a `SourceLabel`. */
  eyebrow?: React.ReactNode
  description?: React.ReactNode
  /** A secondary link or action aligned to the heading, e.g. "View all". */
  action?: React.ReactNode
  className?: string
}

export function SectionHeading({
  title,
  level = 2,
  variant = 'section',
  id,
  eyebrow,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('flex items-end justify-between gap-6', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <Heading level={level} variant={variant} id={id} className="scroll-mt-24">
          {title}
        </Heading>
        {description && <p className="mt-2 max-w-[60ch] text-pretty text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0 pb-0.5">{action}</div>}
    </div>
  )
}
