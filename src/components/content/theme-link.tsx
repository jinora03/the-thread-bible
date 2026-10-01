import { Link } from 'react-router'
import { entityHref } from '@/lib/entity-href'
import { cn } from '@/lib/utils'
import type { EntitySummary } from '@shared/types/content'

interface ThemeLinkProps {
  theme: EntitySummary
  /** Show the one-line summary under the name (index lists). */
  showSummary?: boolean
  className?: string
}

/** A theme as typography, not a pill: serif name, optional one-line summary. */
export function ThemeLink({ theme, showSummary = false, className }: ThemeLinkProps) {
  return (
    <Link to={entityHref(theme)} className={cn('group block', className)}>
      <span className="font-serif text-xl text-foreground decoration-thread decoration-1 underline-offset-[0.25em] group-hover:underline">
        {theme.title}
      </span>
      {showSummary && (
        <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {theme.summary}
        </span>
      )}
    </Link>
  )
}
