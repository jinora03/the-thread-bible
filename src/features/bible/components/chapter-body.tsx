import type { UseQueryResult } from '@tanstack/react-query'
import { EmptyState } from '@/components/content/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { setReaderPreference } from '@/hooks/reader-preferences'
import { isNotFound } from '@/services/api-client'
import type { Chapter } from '@shared/types/scripture'

interface ChapterBodyProps {
  chapterLabel: string
  translationName: string
  result: UseQueryResult<Chapter>
  render: (chapter: Chapter) => React.ReactNode
}

/** Loading, error and "not in this translation" states around the chapter text. */
export function ChapterBody({ chapterLabel, translationName, result, render }: ChapterBodyProps) {
  if (result.isPending) return <ChapterSkeleton />

  if (result.isError) {
    // A licensed translation may not include every book (e.g. a New Testament only edition).
    if (isNotFound(result.error)) {
      return (
        <EmptyState
          headingLevel={2}
          title={`${chapterLabel} isn’t available in the ${translationName}`}
          description="This translation doesn’t include this chapter. Switch to another translation to keep reading here."
          action={<Button onClick={() => setReaderPreference('translationId', 'kjv')}>Read in the King James Version</Button>}
        />
      )
    }
    return (
      <EmptyState
        headingLevel={2}
        title={`${chapterLabel} couldn’t be loaded`}
        description="The text didn’t arrive from the server. This is usually a brief connection problem."
        action={<Button onClick={() => result.refetch()}>Try again</Button>}
      />
    )
  }

  return render(result.data)
}

function ChapterSkeleton() {
  return (
    <div role="status" aria-label="Loading chapter" className="space-y-4">
      {['w-full', 'w-[96%]', 'w-[88%]', 'w-full', 'w-[72%]', 'w-full', 'w-[93%]', 'w-[60%]'].map((width, index) => (
        <Skeleton key={index} className={`h-5 ${width}`} />
      ))}
    </div>
  )
}
