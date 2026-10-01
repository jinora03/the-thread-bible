import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { EmptyState } from '@/components/content/empty-state'
import { ContextSidebar } from '@/components/layout/context-sidebar'
import { PageContainer } from '@/components/layout/page-container'
import { ReadingLayout } from '@/components/layout/reading-layout'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { pageTitle } from '@/config/site'
import { ChapterBody } from '@/features/bible/components/chapter-body'
import { ChapterContextPanel, type ContextTab } from '@/features/bible/components/chapter-context-panel'
import { ChapterPagination } from '@/features/bible/components/chapter-links'
import { ChapterText } from '@/features/bible/components/chapter-text'
import { MobileReaderBar } from '@/features/bible/components/mobile-reader-bar'
import { NoteDialog } from '@/features/bible/components/note-dialog'
import { ReaderNavigation } from '@/features/bible/components/reader-navigation'
import { ReaderToolbar } from '@/features/bible/components/reader-toolbar'
import { SelectionBar } from '@/features/bible/components/selection-bar'
import { setReaderPreference, useReaderPreferences } from '@/hooks/reader-preferences'
import { withSaveFeedback } from '@/features/library/library-errors'
import { isBookmarked, useLibrary } from '@/features/library/use-library'
import { chapterStudyQuery } from '@/services/content'
import { useChapter, useTranslation } from '@/hooks/use-scripture'
import { getAdjacentChapter, getBook } from '@shared/scripture/books'
import { chapterHref, formatChapter, formatReference, parseVerseHash } from '@shared/scripture/reference'
import type { BibleBook, ScriptureReference as Reference } from '@shared/types/scripture'

const chapterParamSchema = z.coerce.number().int().positive()

/** Validates the route, then renders one reader per chapter (keyed, so state resets between chapters). */
export function ReaderPage() {
  const { bookId = '', chapter: chapterParam } = useParams()
  const book = getBook(bookId)
  const chapter = chapterParamSchema.safeParse(chapterParam)

  if (!book) {
    return (
      <PageContainer width="article">
        <title>{pageTitle('Book not found')}</title>
        <EmptyState
          size="page"
          title="We couldn’t find that book"
          description={`“${bookId}” isn’t a book of the Bible we recognize. Book addresses use full names, such as /bible/genesis/1 or /bible/1-corinthians/15.`}
          action={
            <Button asChild>
              <Link to="/bible">Browse all books</Link>
            </Button>
          }
        />
      </PageContainer>
    )
  }

  if (!chapter.success || chapter.data > book.chapterCount) {
    return (
      <PageContainer width="article">
        <title>{pageTitle(`${book.name}: chapter not found`)}</title>
        <EmptyState
          size="page"
          title={`${book.name} has ${book.chapterCount} ${book.chapterCount === 1 ? 'chapter' : 'chapters'}`}
          description={`There is no chapter “${chapterParam}” in ${book.name}. Start at the beginning, or go to the last chapter.`}
          action={
            <>
              <Button asChild>
                <Link to={chapterHref(book.id, 1)}>{formatChapter(book.id, 1)}</Link>
              </Button>
              {book.chapterCount > 1 && (
                <Button asChild variant="outline">
                  <Link to={chapterHref(book.id, book.chapterCount)}>
                    {formatChapter(book.id, book.chapterCount)}
                  </Link>
                </Button>
              )}
            </>
          }
        />
      </PageContainer>
    )
  }

  return <ChapterReader key={`${book.id}-${chapter.data}`} book={book} chapter={chapter.data} />
}

function isLargeScreen() {
  return window.matchMedia('(min-width: 1024px)').matches
}

function ChapterReader({ book, chapter }: { book: BibleBook; chapter: number }) {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const preferences = useReaderPreferences()
  const translation = useTranslation()
  const chapterResult = useChapter(book.id, chapter)
  const studyResult = useQuery(chapterStudyQuery(book.id, chapter))
  const library = useLibrary()

  // The selection lives in the URL hash (#v28 or #v28-30): shareable, and it survives reloads.
  const selection = parseVerseHash(hash)
  const [panelTab, setPanelTab] = useState<ContextTab>(selection ? 'references' : 'related')
  const [sheet, setSheet] = useState<{ open: boolean; side: 'right' | 'bottom' }>({ open: false, side: 'bottom' })
  const [noteTarget, setNoteTarget] = useState<Reference | null>(null)
  // Remembered separately: the target is cleared before the dialog finishes closing.
  const noteReturnVerse = useRef<number | undefined>(undefined)

  const previous = getAdjacentChapter(book, chapter, 'previous')
  const next = getAdjacentChapter(book, chapter, 'next')
  const chapterLabel = formatChapter(book.id, chapter)
  const { recordReading } = library.actions

  useEffect(() => {
    if (chapterResult.data) recordReading(book.id, chapter)
  }, [chapterResult.data, book.id, chapter, recordReading])

  // Deep links: bring the linked verse into view once the text has loaded.
  const scrolledToHash = useRef(false)
  useEffect(() => {
    if (!chapterResult.data || scrolledToHash.current || !selection) return
    scrolledToHash.current = true
    document.getElementById(`v${selection.start}`)?.scrollIntoView({ block: 'center' })
  }, [chapterResult.data, selection])

  const setSelection = (start?: number, end?: number) =>
    navigate({ hash: start ? (end && end !== start ? `v${start}-${end}` : `v${start}`) : '' }, { replace: true, preventScrollReset: true })

  const extendSelection = (verse: number) => {
    if (!selection) return setSelection(verse)
    setSelection(Math.min(selection.start, verse), Math.max(selection.end, verse))
  }

  const openSheet = (side: 'right' | 'bottom') => setSheet({ open: true, side })

  const showVerseReferences = (verse: number) => {
    if (!selection || verse < selection.start || verse > selection.end) setSelection(verse)
    setPanelTab('references')
    if (isLargeScreen()) setReaderPreference('contextPanelOpen', true)
    else openSheet(window.matchMedia('(min-width: 768px)').matches ? 'right' : 'bottom')
  }

  // The toast confirms what was actually saved; a failure says so instead.
  const toggleBookmark = (reference: Reference) => {
    const label = formatReference(reference)
    void withSaveFeedback(library.actions.toggleBookmark(reference), (added) =>
      added ? `${label} saved to your Library` : `Removed ${label} from your Library`,
    )
  }

  const openNote = (reference: Reference) => {
    noteReturnVerse.current = reference.verse
    setNoteTarget(reference)
  }

  const selectedReference: Reference | undefined = selection
    ? { book: book.id, chapter, verse: selection.start, ...(selection.end !== selection.start ? { endVerse: selection.end } : {}) }
    : undefined
  const selectedVerses =
    selection && chapterResult.data
      ? chapterResult.data.verses.filter((verse) => verse.number >= selection.start && verse.number <= selection.end)
      : []

  const panel = (
    <ChapterContextPanel
      book={book}
      chapter={chapter}
      study={studyResult.data}
      studyPending={studyResult.isPending}
      library={library.data}
      libraryActions={library.actions}
      selectedVerse={selection?.start}
      onClearVerse={() => setSelection()}
      tab={panelTab}
      onTabChange={setPanelTab}
    />
  )

  return (
    <>
      <title>{pageTitle(`${chapterLabel} (${translation.abbreviation})`)}</title>
      <ReaderToolbar
        book={book}
        chapter={chapter}
        previous={previous}
        next={next}
        contextPanelOpen={preferences.contextPanelOpen}
        onToggleContextPanel={() => setReaderPreference('contextPanelOpen', !preferences.contextPanelOpen)}
        onOpenContextSheet={() => openSheet('right')}
      />

      <ReadingLayout
        contextOpen={preferences.contextPanelOpen}
        navigation={<ReaderNavigation book={book} chapter={chapter} />}
        context={
          <ContextSidebar title={`About ${chapterLabel}`} onCollapse={() => setReaderPreference('contextPanelOpen', false)}>
            {panel}
          </ContextSidebar>
        }
      >
        <div className="px-5 pt-10 pb-36 sm:px-8 md:pb-24 lg:px-12 lg:pt-14">
          <div className="mx-auto max-w-reading" data-text-size={preferences.textSize}>
            <header className="mb-10">
              <p className="eyebrow">{translation.name}</p>
              <h1 className="mt-2 font-serif text-4xl tracking-[-0.015em] sm:text-5xl">{chapterLabel}</h1>
            </header>

            <ChapterBody
              chapterLabel={chapterLabel}
              translationName={translation.name}
              result={chapterResult}
              render={(chapterData) => (
                <ChapterText
                  book={book}
                  chapter={chapterData}
                  mode={preferences.mode}
                  selection={selection}
                  translationAbbreviation={translation.abbreviation}
                  study={studyResult.data}
                  library={library.data}
                  onToggleBookmark={toggleBookmark}
                  onAddNote={openNote}
                  onShowReferences={showVerseReferences}
                  onSelect={(verse) => setSelection(verse)}
                  onExtendSelection={extendSelection}
                />
              )}
            />

            <p className="mt-12 text-xs leading-relaxed text-muted-foreground">
              {chapterResult.data?.copyright ?? translation.attribution}
            </p>
            <ChapterPagination previous={previous} next={next} />
          </div>
        </div>
      </ReadingLayout>

      {selectedReference && selectedVerses.length > 0 && (
        <SelectionBar
          reference={selectedReference}
          verses={selectedVerses}
          translationAbbreviation={translation.abbreviation}
          bookmarked={isBookmarked(library.data, selectedReference)}
          onToggleBookmark={() => toggleBookmark(selectedReference)}
          onAddNote={() => openNote(selectedReference)}
          onShowReferences={() => showVerseReferences(selectedReference.verse!)}
          onClear={() => setSelection()}
        />
      )}

      <MobileReaderBar previous={previous} next={next} onOpenContext={() => openSheet('bottom')} />

      <Sheet open={sheet.open} onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}>
        <SheetContent side={sheet.side} className={sheet.side === 'bottom' ? 'h-[85dvh]' : undefined}>
          <SheetHeader>
            <SheetTitle>About {chapterLabel}</SheetTitle>
            <SheetDescription className="sr-only">Related topics, cross-references and your notes</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
        </SheetContent>
      </Sheet>

      <NoteDialog
        reference={noteTarget}
        synced={library.isSynced}
        onSave={(reference, text) => library.actions.addNote(reference, text)}
        onClose={() => setNoteTarget(null)}
        onCloseAutoFocus={(event) => {
          // Return focus to the verse number that opened the note.
          const verse = noteReturnVerse.current
          const trigger = verse ? document.querySelector<HTMLElement>(`[data-verse-trigger="${verse}"]`) : null
          if (trigger) {
            event.preventDefault()
            trigger.focus()
          }
        }}
      />
    </>
  )
}
