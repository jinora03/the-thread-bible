import { Link } from 'react-router'
import { ScriptureText } from '@/components/scripture/scripture-text'
import { VerseNumber } from '@/components/scripture/verse-number'
import { Skeleton } from '@/components/ui/skeleton'
import { usePassage, useTranslation } from '@/hooks/use-scripture'
import { isNotFound } from '@/services/api-client'
import { formatReference, referenceHref } from '@shared/scripture/reference'
import { cn } from '@/lib/utils'
import type { ScriptureReference } from '@shared/types/scripture'

interface ScripturePassageProps {
  reference: ScriptureReference
  /** `lg` for featured quotations, `md` for passages inside articles. */
  size?: 'md' | 'lg'
  className?: string
}

/**
 * A quoted passage, resolved through the translation layer.
 * Renders as a figure with the reference and translation as its caption.
 */
export function ScripturePassage({ reference, size = 'md', className }: ScripturePassageProps) {
  const { data: passage, isPending, isError, error, refetch } = usePassage(reference)
  const translation = useTranslation()
  const label = formatReference(reference)

  return (
    <figure className={cn('min-w-0', className)}>
      {isPending ? (
        <PassageSkeleton />
      ) : isError && isNotFound(error) ? (
        <p className="text-sm text-muted-foreground">{label} isn’t available in the {translation.name}.</p>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">
          The text of {label} could not be loaded.{' '}
          <button type="button" onClick={() => refetch()} className="link-quiet text-reference">
            Try again
          </button>
        </p>
      ) : passage ? (
        <blockquote cite={referenceHref(reference)}>
          {passage.segments.map((segment) => (
            <ScriptureText
              key={segment.chapter}
              verses={segment.verses}
              className={cn(
                size === 'lg' && '[--scripture-leading:1.6] [--scripture-size:1.375rem] sm:[--scripture-size:1.625rem]',
                passage.segments.length > 1 && 'not-first:mt-[0.9em]',
              )}
              renderVerseMarker={(verse) => {
                const isOnlyVerse = passage.segments.length === 1 && segment.verses.length === 1
                if (isOnlyVerse) return null
                const isSegmentStart = verse === segment.verses[0] && passage.segments.length > 1
                return (
                  <VerseNumber
                    number={verse.number}
                    label={isSegmentStart ? `${segment.chapter}:${verse.number}` : undefined}
                  />
                )
              }}
            />
          ))}
        </blockquote>
      ) : null}
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
        <Link to={referenceHref(reference)} className="font-medium text-reference link-quiet">
          {label}
        </Link>
        <span aria-hidden="true">·</span>
        <abbr title={translation.name} className="no-underline">
          {translation.abbreviation}
        </abbr>
      </figcaption>
      {passage?.copyright && <p className="mt-1 text-xs text-muted-foreground">{passage.copyright}</p>}
    </figure>
  )
}

function PassageSkeleton() {
  return (
    <div className="space-y-3 py-1" role="status" aria-label="Loading passage">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[92%]" />
      <Skeleton className="h-4 w-[68%]" />
    </div>
  )
}
