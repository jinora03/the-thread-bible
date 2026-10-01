import { Heading } from '@/components/typography/heading'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  /** Metadata line above the title, e.g. a `MetadataRow`. */
  eyebrow?: React.ReactNode
  description?: React.ReactNode
  variant?: 'display' | 'title'
  children?: React.ReactNode
  className?: string
}

/** The single h1 of a page, with its eyebrow and lede. */
export function PageHeader({
  title,
  eyebrow,
  description,
  variant = 'title',
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('max-w-[48rem]', className)}>
      {eyebrow && <div className="mb-4">{eyebrow}</div>}
      <Heading level={1} variant={variant}>
        {title}
      </Heading>
      {description && (
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </header>
  )
}
