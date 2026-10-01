import { NotebookText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChapterStepLink, type ChapterTarget } from '@/features/bible/components/chapter-links'

interface MobileReaderBarProps {
  previous: ChapterTarget
  next: ChapterTarget
  onOpenContext: () => void
}

/** Phones: a restrained bottom bar within thumb reach. Scripture keeps the rest of the screen. */
export function MobileReaderBar({ previous, next, onOpenContext }: MobileReaderBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
      <div className="flex h-14 items-center justify-between px-2">
        <ChapterStepLink target={previous} direction="previous" />
        <Button variant="ghost" onClick={onOpenContext} className="gap-2">
          <NotebookText />
          Related &amp; notes
        </Button>
        <ChapterStepLink target={next} direction="next" />
      </div>
    </div>
  )
}
