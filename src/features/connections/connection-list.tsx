import { EntityLink } from '@/components/content/entity-link'
import { BasisLabel } from '@/components/content/interpretive-label'
import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { connectionTypeLabels } from '@/config/connections'
import { formatReference } from '@shared/scripture/reference'
import { cn } from '@/lib/utils'
import type { ConnectionEndpoint, ConnectionView } from '@shared/types/connections'

export function EndpointLink({ endpoint, className }: { endpoint: ConnectionEndpoint; className?: string }) {
  if (endpoint.type === 'scripture') {
    return (
      <ScriptureReference reference={endpoint.reference} mode="preview" className={className}>
        {formatReference(endpoint.reference)}
      </ScriptureReference>
    )
  }
  return <EntityLink id={endpoint.id} className={cn('text-reference', className)} />
}

interface ConnectionListProps {
  views: ConnectionView[]
  /** Show where the connection starts too, useful when listing connections for a whole chapter. */
  showOrigin?: boolean
  density?: 'comfortable' | 'compact'
  className?: string
}

/**
 * Connections as a quiet list: type, destination, a one-line description,
 * and how firmly the link is grounded.
 */
export function ConnectionList({ views, showOrigin = false, density = 'comfortable', className }: ConnectionListProps) {
  // A type label on every row is noise when the whole list shares one type.
  const showType = new Set(views.map(({ connection }) => connection.type)).size > 1

  return (
    <ul className={cn(density === 'compact' ? 'space-y-4' : 'divide-y', className)}>
      {views.map(({ connection, here, there }) => (
        <li key={connection.id} className={cn(density === 'comfortable' && 'py-4 first:pt-0')}>
          {showType && <p className="eyebrow mb-1 text-[0.6875rem]">{connectionTypeLabels[connection.type]}</p>}
          <p className={cn(density === 'compact' ? 'text-sm' : 'text-[0.9375rem]')}>
            {showOrigin && here.type === 'scripture' && (
              <>
                <span className="text-muted-foreground">{formatReference(here.reference)}</span>
                <span aria-hidden="true" className="mx-1.5 text-thread">
                  →
                </span>
                <span className="sr-only">connects to </span>
              </>
            )}
            <EndpointLink endpoint={there} className="font-medium" />
          </p>
          {connection.description && (
            <p className="mt-1 text-sm leading-relaxed text-pretty text-muted-foreground">{connection.description}</p>
          )}
          <BasisLabel basis={connection.basis} className="mt-1.5" />
        </li>
      ))}
    </ul>
  )
}
