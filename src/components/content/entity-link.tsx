import { Link } from 'react-router'
import { entityHref } from '@/lib/entity-href'
import { cn } from '@/lib/utils'
import { useEntitySummary } from '@/services/content'
import type { EntityId } from '@shared/types/content'

interface EntityLinkProps {
  id: EntityId
  children?: React.ReactNode
  className?: string
}

/**
 * Link to any library entity by id. The title normally comes from the page's
 * own response (seeded into the cache); if the entry isn't published, the
 * label renders as plain text rather than a broken link.
 * Underlined on hover only; pass `link-quiet` for links inside running prose.
 */
export function EntityLink({ id, children, className }: EntityLinkProps) {
  const { data: summary } = useEntitySummary(id)
  if (!summary) return <span className={className}>{children ?? id.split(':')[1]?.replace(/-/g, ' ')}</span>

  return (
    <Link to={entityHref(summary)} className={cn('hover:underline', className)}>
      {children ?? summary.title}
    </Link>
  )
}
