import { Bookmark, BookmarkMinus, Copy, Link2, ListPlus, NotebookPen, Share2, TextSelect } from 'lucide-react'
import { verseNumberClassName } from '@/components/scripture/verse-number'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { copyPassage, copyReference, sharePassage } from '@/features/bible/verse-actions'
import { cn } from '@/lib/utils'
import { formatReference } from '@shared/scripture/reference'
import type { ReadingMode, ScriptureReference, Verse } from '@shared/types/scripture'

interface VerseActionsMenuProps {
  reference: ScriptureReference
  verse: Verse
  mode: ReadingMode
  translationAbbreviation: string
  bookmarked: boolean
  hasNote: boolean
  /** Whether this verse is inside the current selection, and whether one exists. */
  selected: boolean
  hasSelection: boolean
  onToggleBookmark: () => void
  onAddNote: () => void
  onShowReferences: () => void
  onSelect: () => void
  onExtendSelection: () => void
}

/**
 * The verse number is the entry point for verse actions. It stays visually a
 * quiet numeral; the enlarged hit area keeps it comfortable to tap.
 * Shift-click extends the current selection without opening the menu.
 */
export function VerseActionsMenu({
  reference,
  verse,
  mode,
  translationAbbreviation,
  bookmarked,
  hasNote,
  selected,
  hasSelection,
  onToggleBookmark,
  onAddNote,
  onShowReferences,
  onSelect,
  onExtendSelection,
}: VerseActionsMenuProps) {
  const label = formatReference(reference)
  const status = [selected && 'selected', bookmarked && 'bookmarked', hasNote && 'has a note'].filter(Boolean).join(', ')

  const trigger = (
    <DropdownMenuTrigger
      data-verse-trigger={verse.number}
      aria-label={`Verse ${verse.number} options${status ? `, ${status}` : ''}`}
      onPointerDown={(event) => {
        if (!event.shiftKey) return
        // Shift-click: extend the selection instead of opening the menu.
        event.preventDefault()
        onExtendSelection()
      }}
      className={cn(
        verseNumberClassName,
        'relative cursor-pointer rounded-sm transition-colors before:absolute before:-inset-x-2 before:-inset-y-2.5 hover:text-primary data-[state=open]:text-primary dark:hover:text-reference',
        (bookmarked || hasNote) && 'text-primary underline decoration-thread decoration-2 underline-offset-2 dark:text-reference',
        mode === 'study' && 'text-[0.72em] before:-inset-3',
      )}
    >
      {verse.number}
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu modal={false}>
      {mode === 'reading' ? <sup className="mr-[0.2em]">{trigger}</sup> : trigger}
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {hasSelection && !selected ? (
          <DropdownMenuItem onSelect={onExtendSelection}>
            <ListPlus />
            Extend selection to here
          </DropdownMenuItem>
        ) : (
          !selected && (
            <DropdownMenuItem onSelect={onSelect}>
              <TextSelect />
              Select verse
            </DropdownMenuItem>
          )
        )}
        <DropdownMenuItem onSelect={onToggleBookmark}>
          {bookmarked ? <BookmarkMinus /> : <Bookmark />}
          {bookmarked ? 'Remove bookmark' : 'Bookmark'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddNote}>
          <NotebookPen />
          Add note…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onShowReferences}>
          <Link2 />
          Cross-references
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => copyPassage(reference, [verse], translationAbbreviation)}>
          <Copy />
          Copy verse
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copyReference(reference)}>
          <Copy />
          Copy reference
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => sharePassage(reference, [verse])}>
          <Share2 />
          Share…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
