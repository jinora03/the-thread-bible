import { PanelRight, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BookSelector } from '@/features/bible/components/book-selector'
import { ChapterSelector } from '@/features/bible/components/chapter-selector'
import { ChapterStepLink, type ChapterTarget } from '@/features/bible/components/chapter-links'
import { ReaderSettings } from '@/features/bible/components/reader-settings'
import { ReadingModeToggle } from '@/features/bible/components/reading-mode-toggle'
import { TranslationSwitcher } from '@/features/bible/components/translation-switcher'
import type { BibleBook } from '@shared/types/scripture'

interface ReaderToolbarProps {
  book: BibleBook
  chapter: number
  previous: ChapterTarget
  next: ChapterTarget
  contextPanelOpen: boolean
  onToggleContextPanel: () => void
  onOpenContextSheet: () => void
}

/**
 * Sticky reader controls. Book and chapter are always visible; secondary
 * settings sit behind a single "display" button.
 */
export function ReaderToolbar({
  book,
  chapter,
  previous,
  next,
  contextPanelOpen,
  onToggleContextPanel,
  onOpenContextSheet,
}: ReaderToolbarProps) {
  return (
    <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-14 max-w-[100rem] items-center gap-1 px-2 sm:px-4">
        <ChapterStepLink target={previous} direction="previous" className="hidden md:inline-flex" />
        <nav aria-label="Book and chapter" className="flex min-w-0 items-center">
          <BookSelector currentBook={book} currentChapter={chapter} className="max-w-[11rem] sm:max-w-none" />
          <ChapterSelector book={book} currentChapter={chapter} />
        </nav>
        <ChapterStepLink target={next} direction="next" className="hidden md:inline-flex" />

        <div className="ml-auto flex items-center gap-1">
          <ReadingModeToggle className="mr-1 hidden md:inline-flex" />
          <TranslationSwitcher />
          <ReaderSettings />

          {/* Tablet: the study panel opens as a sheet. */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenContextSheet}
            aria-label="Open study panel"
            className="hidden md:inline-flex lg:hidden"
          >
            <PanelRightOpen />
          </Button>

          {/* Desktop: the study panel is a collapsible column. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleContextPanel}
                aria-pressed={contextPanelOpen}
                aria-label="Study panel"
                className="hidden lg:inline-flex"
              >
                <PanelRight />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{contextPanelOpen ? 'Hide study panel' : 'Show study panel'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
