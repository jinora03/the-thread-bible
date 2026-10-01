import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { formatReference } from '@shared/scripture/reference'
import { cn } from '@/lib/utils'
import type { Thread } from '@shared/types/connections'

interface ConnectionThreadProps {
  thread: Thread
  /** `responsive` runs horizontally on large screens; `vertical` always stacks (narrow columns). */
  orientation?: 'responsive' | 'vertical'
  headingLevel?: 3 | 4
}

/**
 * The signature motif: a single gold thread through ordered passages.
 * An ordered list, so the sequence is also conveyed to assistive technology.
 */
export function ConnectionThread({ thread, orientation = 'responsive', headingLevel = 3 }: ConnectionThreadProps) {
  const horizontal = orientation === 'responsive'
  const StepHeading = `h${headingLevel}` as const
  const columns = thread.steps.length

  return (
    <div className="relative" style={horizontal ? ({ '--steps': columns } as React.CSSProperties) : undefined}>
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-2 bottom-2 left-[7px] w-px bg-thread/70',
          horizontal &&
            'lg:top-[7px] lg:right-[calc((100%-(var(--steps)-1)*1rem)/var(--steps))] lg:bottom-auto lg:left-0 lg:h-px lg:w-auto',
        )}
      />
      <ol className={cn('grid gap-8', horizontal && 'lg:grid-cols-[repeat(var(--steps),minmax(0,1fr))] lg:gap-4')}>
      {thread.steps.map((step) => (
        <li
          key={formatReference(step.reference)}
          className={cn('relative pl-9', horizontal && 'lg:pt-9 lg:pl-0')}
        >
          <span
            aria-hidden="true"
            className={cn('absolute top-1 left-0 size-[15px] rounded-full border-2 border-thread bg-background', horizontal && 'lg:top-0')}
          />
          <p className="eyebrow">{step.label}</p>
          <StepHeading className="mt-1 font-serif text-lg leading-snug text-balance">{step.title}</StepHeading>
          <ScriptureReference reference={step.reference} mode="preview" className="mt-1 inline-block text-sm" />
        </li>
      ))}
      </ol>
    </div>
  )
}
