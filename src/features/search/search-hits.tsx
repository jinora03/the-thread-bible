import { cn } from '@/lib/utils'
import type { HighlightSegment, SearchHit } from '@shared/types/search'

/** Matched terms as <mark>; everything is text, never HTML. */
export function Highlighted({ segments, className }: { segments: HighlightSegment[]; className?: string }) {
  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark key={index} className="rounded-[2px] bg-highlight px-px text-inherit">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  )
}

/** The body line of a hit: verse text in Scripture serif, summaries in sans. */
export function HitSnippet({ hit, className }: { hit: SearchHit; className?: string }) {
  if (hit.type === 'verse') return <Highlighted segments={hit.snippet} className={cn('font-serif text-scripture', className)} />
  if (hit.type === 'entity') return <Highlighted segments={hit.snippet} className={className} />
  return null
}
