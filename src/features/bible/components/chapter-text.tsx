import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { ScriptureText } from '@/components/scripture/scripture-text'
import { connectionTypeLabels } from '@/config/connections'
import { VerseActionsMenu } from '@/features/bible/components/verse-actions-menu'
import { referencesForVerse } from '@/features/bible/study-notes'
import { isBookmarked } from '@/features/library/use-library'
import { formatReference, referenceIncludesVerse } from '@shared/scripture/reference'
import type { ChapterStudyResponse } from '@shared/types/api'
import type { LibraryData } from '@shared/types/library'
import type { BibleBook, Chapter, ReadingMode, ScriptureReference as Reference, Verse } from '@shared/types/scripture'

interface ChapterTextProps {
  book: BibleBook
  chapter: Chapter
  mode: ReadingMode
  selection?: { start: number; end: number }
  translationAbbreviation: string
  study?: ChapterStudyResponse
  library: LibraryData
  onToggleBookmark: (reference: Reference) => void
  onAddNote: (reference: Reference) => void
  onShowReferences: (verse: number) => void
  onSelect: (verse: number) => void
  onExtendSelection: (verse: number) => void
}

export function ChapterText({
  book,
  chapter,
  mode,
  selection,
  translationAbbreviation,
  study,
  library,
  onToggleBookmark,
  onAddNote,
  onShowReferences,
  onSelect,
  onExtendSelection,
}: ChapterTextProps) {
  const verseReference = (verse: Verse): Reference => ({ book: book.id, chapter: chapter.chapter, verse: verse.number })

  return (
    <ScriptureText
      verses={chapter.verses}
      mode={mode}
      highlight={selection}
      idPrefix="v"
      showHeadings
      renderVerseMarker={(verse) => {
        const reference = verseReference(verse)
        return (
          <VerseActionsMenu
            reference={reference}
            verse={verse}
            mode={mode}
            translationAbbreviation={translationAbbreviation}
            bookmarked={isBookmarked(library, reference)}
            hasNote={library.notes.some((note) => referenceIncludesVerse(note.reference, book.id, chapter.chapter, verse.number))}
            selected={selection !== undefined && verse.number >= selection.start && verse.number <= selection.end}
            hasSelection={selection !== undefined}
            onToggleBookmark={() => onToggleBookmark(reference)}
            onAddNote={() => onAddNote(reference)}
            onShowReferences={() => onShowReferences(verse.number)}
            onSelect={() => onSelect(verse.number)}
            onExtendSelection={() => onExtendSelection(verse.number)}
          />
        )
      }}
      renderVerseAnnotations={(verse) => <VerseAnnotations study={study} book={book} chapter={chapter.chapter} verse={verse.number} />}
    />
  )
}

/** Study mode: a single quiet line of references under each verse that has them. */
function VerseAnnotations({ study, book, chapter, verse }: { study?: ChapterStudyResponse; book: BibleBook; chapter: number; verse: number }) {
  const { connections, plain } = referencesForVerse(study, book.id, chapter, verse)
  if (plain.length === 0 && connections.length === 0) return null

  return (
    <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-sans text-[0.8125rem] leading-relaxed text-muted-foreground">
      <span aria-hidden="true" className="text-thread">
        ↳
      </span>
      <span className="sr-only">References for verse {verse}:</span>
      {plain.map((reference) => (
        <ScriptureReference key={formatReference(reference)} reference={reference} mode="preview" />
      ))}
      {connections.map(({ connection, there }) =>
        there.type === 'scripture' ? (
          <span key={connection.id}>
            <ScriptureReference reference={there.reference} mode="preview" />{' '}
            <span className="text-xs">({connectionTypeLabels[connection.type].toLowerCase()})</span>
          </span>
        ) : null,
      )}
    </p>
  )
}
