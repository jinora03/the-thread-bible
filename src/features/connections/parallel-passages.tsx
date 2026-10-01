import { BasisLabel } from '@/components/content/interpretive-label'
import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { connectionTypeLabels } from '@/config/connections'
import { EndpointLink } from '@/features/connections/connection-list'
import { formatReference } from '@shared/scripture/reference'
import type { ParallelGroup } from '@shared/types/connections'

interface ParallelPassagesProps {
  groups: ParallelGroup[]
  sourceTitle: string
  targetTitle: string
}

/**
 * Side-by-side comparison: a phrase in the source passage and the New
 * Testament passages that take it up. Stacks on small screens with visible labels.
 */
export function ParallelPassages({ groups, sourceTitle, targetTitle }: ParallelPassagesProps) {
  return (
    <div>
      <div aria-hidden="true" className="eyebrow hidden grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 border-b pb-3 md:grid">
        <span>{sourceTitle}</span>
        <span>{targetTitle}</span>
      </div>
      <ol className="divide-y">
        {groups.map((group) => (
          <li
            key={formatReference(group.source)}
            className="grid gap-4 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10"
          >
            <div>
              <p className="sr-only">{sourceTitle}:</p>
              <p className="font-serif text-lg leading-snug text-balance">{group.label}</p>
              <ScriptureReference reference={group.source} mode="preview" className="mt-1 inline-block text-sm" />
            </div>
            <div className="border-l-2 border-thread/60 pl-4 md:border-l-0 md:pl-0">
              <p className="eyebrow mb-2 md:sr-only">{targetTitle}</p>
              <ul className="space-y-3">
                {group.views.map(({ connection, there }) => (
                  <li key={connection.id}>
                    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <EndpointLink endpoint={there} className="font-medium" />
                      <span className="text-xs text-muted-foreground">{connectionTypeLabels[connection.type]}</span>
                      <BasisLabel basis={connection.basis} />
                    </p>
                    {connection.description && connection.description !== group.label && (
                      <p className="mt-1 text-sm leading-relaxed text-pretty text-muted-foreground">
                        {connection.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
