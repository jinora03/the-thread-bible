import { Bookmark, BookmarkMinus, Copy, Link2, NotebookPen, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { copyPassage, sharePassage } from '@/features/bible/verse-actions'
import { formatReference } from '@shared/scripture/reference'
import type { ScriptureReference, Verse } from '@shared/types/scripture'

interface SelectionBarProps {
  reference: ScriptureReference
  verses: Verse[]
  translationAbbreviation: string
  bookmarked: boolean
  onToggleBookmark: () => void
  onAddNote: () => void
  onShowReferences: () => void
  onClear: () => void
}

/**
 * Actions for the selected verses. Appears above the reading area whenever a
 * verse or range is selected (the selection lives in the URL, e.g. #v28-30).
 */
export function SelectionBar({
  reference,
  verses,
  translationAbbreviation,
  bookmarked,
  onToggleBookmark,
  onAddNote,
  onShowReferences,
  onClear,
}: SelectionBarProps) {
  const label = formatReference(reference)
  const actions = [
    { label: bookmarked ? 'Remove bookmark' : 'Bookmark', icon: bookmarked ? BookmarkMinus : Bookmark, onClick: onToggleBookmark },
    { label: 'Add note', icon: NotebookPen, onClick: onAddNote },
    { label: 'Copy', icon: Copy, onClick: () => copyPassage(reference, verses, translationAbbreviation) },
    { label: 'Share', icon: Share2, onClick: () => sharePassage(reference, verses) },
    { label: 'Cross-references', icon: Link2, onClick: onShowReferences },
  ]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3 md:bottom-6">
      <section
        aria-label={`Selected: ${label}`}
        className="pointer-events-auto flex max-w-full items-center gap-1 rounded-lg border bg-popover py-1 pr-1 pl-3.5 shadow-overlay"
      >
        <p className="mr-1 truncate text-sm font-medium" aria-live="polite">
          {label}
        </p>
        <div
          role="toolbar"
          tabIndex={-1}
          aria-label="Actions for the selection"
          onKeyDown={(event) => event.key === 'Escape' && onClear()}
          className="flex items-center"
        >
          {actions.map(({ label: actionLabel, icon: Icon, onClick }) => (
            <Tooltip key={actionLabel}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onClick} aria-label={`${actionLabel}: ${label}`}>
                  <Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{actionLabel}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onClear} aria-label="Clear selection">
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear selection (Esc)</TooltipContent>
        </Tooltip>
      </section>
    </div>
  )
}
