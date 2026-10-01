import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { ScriptureText } from '@/components/scripture/scripture-text'
import { VerseNumber } from '@/components/scripture/verse-number'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { usePassage, useTranslation } from '@/hooks/use-scripture'
import { isNotFound } from '@/services/api-client'
import { formatReference, referenceHref } from '@shared/scripture/reference'
import { cn } from '@/lib/utils'
import type { ScriptureReference as Reference } from '@shared/types/scripture'

interface ScriptureReferenceProps {
  reference: Reference
  /** Visible text; defaults to the formatted reference. */
  children?: React.ReactNode
  /**
   * `link` navigates to the reader (lists, captions).
   * `preview` opens the passage in a popover without leaving the page (inline in prose).
   */
  mode?: 'link' | 'preview'
  className?: string
}

const referenceClassName = 'text-reference link-quiet decoration-reference/40'

export function ScriptureReference({ reference, children, mode = 'link', className }: ScriptureReferenceProps) {
  const label = children ?? formatReference(reference)

  if (mode === 'link') {
    return (
      <Link to={referenceHref(reference)} className={cn(referenceClassName, className)}>
        {label}
      </Link>
    )
  }

  return (
    <Popover>
      <PopoverTrigger className={cn(referenceClassName, 'cursor-pointer', className)}>
        {label}
        <span className="sr-only"> (show passage)</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
        <ReferencePreview reference={reference} />
      </PopoverContent>
    </Popover>
  )
}

function ReferencePreview({ reference }: { reference: Reference }) {
  const { data: passage, isPending, isError, error } = usePassage(reference)
  const translation = useTranslation()
  const label = formatReference(reference)

  return (
    <div>
      <p className="eyebrow border-b px-4 pt-3 pb-2.5">
        {label} <span className="text-border">·</span> {translation.abbreviation}
      </p>
      <div className="max-h-64 overflow-y-auto px-4 py-3">
        {isPending ? (
          <div className="space-y-2.5" role="status" aria-label="Loading passage">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        ) : isError || !passage ? (
          <p className="text-sm text-muted-foreground">
            {isNotFound(error)
              ? `${label} isn’t available in the ${translation.name}.`
              : `The text of ${label} could not be loaded. Check your connection and try again.`}
          </p>
        ) : (
          passage.segments.map((segment) => (
            <ScriptureText
              key={segment.chapter}
              verses={segment.verses}
              className="[--scripture-leading:1.7] [--scripture-size:1rem] not-first:mt-3"
              renderVerseMarker={(verse) =>
                segment.verses.length > 1 || passage.segments.length > 1 ? (
                  <VerseNumber number={verse.number} />
                ) : null
              }
            />
          ))
        )}
      </div>
      <div className="border-t px-4 py-2.5">
        <Link
          to={referenceHref(reference)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-reference hover:underline"
        >
          Read in context
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
