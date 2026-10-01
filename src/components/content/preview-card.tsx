import { Link } from 'react-router'
import { Heading, type HeadingLevel } from '@/components/typography/heading'
import { cn } from '@/lib/utils'

interface PreviewCardProps {
  href: string
  title: string
  headingLevel: HeadingLevel
  eyebrow?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

/**
 * The one card in the system, for independent, selectable objects only
 * (a doctrine, prophecy or study). Hairline border, no shadow; the whole card
 * is clickable through a stretched title link, so there are no nested links.
 */
export function PreviewCard({ href, title, headingLevel, eyebrow, children, footer, className }: PreviewCardProps) {
  return (
    <div
      className={cn(
        'group relative flex w-full flex-col rounded-lg border bg-surface/50 p-5 transition-colors hover:border-input/50 hover:bg-surface has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring sm:p-6',
        className,
      )}
    >
      {eyebrow && <div className="mb-3">{eyebrow}</div>}
      <Heading level={headingLevel} variant="subsection">
        <Link to={href} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
          {title}
        </Link>
      </Heading>
      {children && <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>}
      {footer && <div className="mt-auto pt-4 text-xs text-muted-foreground">{footer}</div>}
    </div>
  )
}
