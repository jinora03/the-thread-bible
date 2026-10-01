import { BasisLabel } from '@/components/content/interpretive-label'
import { connectionBasisLabels } from '@/config/connections'
import type { ConnectionBasis } from '@shared/types/connections'

const order: ConnectionBasis[] = ['stated', 'supported', 'suggested']

/** Explains the three basis labels, so no connection is mistaken for more (or less) than it is. */
export function BasisLegend() {
  return (
    <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
      {order.map((basis) => (
        <div key={basis}>
          <dt>
            <BasisLabel basis={basis} className="text-foreground" />
          </dt>
          <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{connectionBasisLabels[basis].description}</dd>
        </div>
      ))}
    </dl>
  )
}
