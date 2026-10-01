import { connectionBasisLabels } from '@/config/connections'
import { cn } from '@/lib/utils'
import type { ConnectionBasis } from '@shared/types/connections'

export type SourceKind = 'scripture' | 'context' | 'interpretation' | 'editorial'

const sourceLabels: Record<SourceKind, { label: string; className: string }> = {
  scripture: { label: 'Scripture', className: 'text-muted-foreground' },
  context: { label: 'Historical context', className: 'text-context' },
  interpretation: { label: 'Interpretation', className: 'text-reference' },
  editorial: { label: 'Editorial note', className: 'text-muted-foreground' },
}

/**
 * Labels what kind of content follows, so readers can always tell Scripture
 * from context from interpretation. The text carries the meaning; color only reinforces it.
 */
export function SourceLabel({ kind, className }: { kind: SourceKind; className?: string }) {
  const { label, className: tone } = sourceLabels[kind]
  return <p className={cn('eyebrow', tone, className)}>{label}</p>
}

const basisMarker: Record<ConnectionBasis, string> = {
  stated: 'bg-thread',
  supported: 'border-[1.5px] border-thread',
  suggested: 'border-[1.5px] border-dashed border-muted-foreground',
}

/** How firmly a connection is grounded: a shape and a text label, never color alone. */
export function BasisLabel({ basis, className }: { basis: ConnectionBasis; className?: string }) {
  const { label, description } = connectionBasisLabels[basis]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)} title={description}>
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', basisMarker[basis])} />
      {label}
    </span>
  )
}
