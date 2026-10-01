import { Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/content/empty-state'
import { EntityLink } from '@/components/content/entity-link'
import { SourceLabel } from '@/components/content/interpretive-label'
import { ReviewStatusLabel } from '@/components/content/review-notice'
import { RichTextInline } from '@/components/content/rich-text'
import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConnectionList } from '@/features/connections/connection-list'
import { connectionsForVerse, referencesForVerse } from '@/features/bible/study-notes'
import type { LibraryActions } from '@/features/library/use-library'
import { formatChapter, formatReference, referenceTouchesChapter } from '@shared/scripture/reference'
import type { ChapterStudyResponse } from '@shared/types/api'
import type { EntityKind, EntitySummary } from '@shared/types/content'
import type { LibraryData } from '@shared/types/library'
import type { BibleBook } from '@shared/types/scripture'

export type ContextTab = 'related' | 'references' | 'notes'

interface ChapterContextPanelProps {
  book: BibleBook
  chapter: number
  study: ChapterStudyResponse | undefined
  studyPending: boolean
  library: LibraryData
  libraryActions: LibraryActions
  selectedVerse?: number
  onClearVerse: () => void
  tab: ContextTab
  onTabChange: (tab: ContextTab) => void
}

const relatedGroups: { title: string; kinds: EntityKind[] }[] = [
  { title: 'Themes', kinds: ['theme'] },
  { title: 'Doctrines', kinds: ['doctrine'] },
  { title: 'Prophecies', kinds: ['prophecy'] },
  { title: 'Typology', kinds: ['typology'] },
  { title: 'People', kinds: ['person'] },
  { title: 'Places', kinds: ['place'] },
  { title: 'Covenants & promises', kinds: ['covenant', 'promise'] },
  { title: 'Events', kinds: ['event'] },
]

/** Study material for the open chapter: related topics, references, and the reader's notes. */
export function ChapterContextPanel({
  book,
  chapter,
  study,
  studyPending,
  library,
  libraryActions,
  selectedVerse,
  onClearVerse,
  tab,
  onTabChange,
}: ChapterContextPanelProps) {
  const chapterLabel = formatChapter(book.id, chapter)

  return (
    <Tabs value={tab} onValueChange={(value) => onTabChange(value as ContextTab)} className="px-5 pb-10">
      <TabsList className="sticky top-0 z-10 -mx-5 bg-background px-5">
        <TabsTrigger value="related">Related</TabsTrigger>
        <TabsTrigger value="references">References</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="related" className="pt-6">
        {studyPending ? <PanelSkeleton /> : <RelatedTab study={study} chapterLabel={chapterLabel} />}
      </TabsContent>
      <TabsContent value="references" className="pt-6">
        {studyPending ? (
          <PanelSkeleton />
        ) : (
          <ReferencesTab book={book} chapter={chapter} study={study} selectedVerse={selectedVerse} onClearVerse={onClearVerse} />
        )}
      </TabsContent>
      <TabsContent value="notes" className="pt-6">
        <NotesTab book={book} chapter={chapter} chapterLabel={chapterLabel} library={library} libraryActions={libraryActions} />
      </TabsContent>
    </Tabs>
  )
}

function PanelSkeleton() {
  return (
    <div role="status" aria-label="Loading study notes" className="space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

function RelatedTab({ study, chapterLabel }: { study: ChapterStudyResponse | undefined; chapterLabel: string }) {
  const context = study?.context
  if (!context) {
    return (
      <EmptyState
        title={`No study notes for ${chapterLabel} yet`}
        description="Curated themes, people and doctrines are written chapter by chapter. The References tab still shows any connections that reach this chapter."
      />
    )
  }

  const byId = new Map((study?.related ?? []).map((summary) => [summary.id, summary]))
  const entities = context.relatedIds.flatMap((id) => byId.get(id) ?? [])
  const groups = relatedGroups
    .map((group) => ({ ...group, entities: entities.filter((entity) => group.kinds.includes(entity.kind)) }))
    .filter((group) => group.entities.length > 0)

  return (
    <div className="space-y-8">
      <section aria-labelledby="chapter-overview">
        <h3 id="chapter-overview" className="sr-only">
          Overview
        </h3>
        <div className="flex items-baseline justify-between gap-3">
          <SourceLabel kind="editorial" />
          <ReviewStatusLabel status={context.review.status} />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-pretty">
          <RichTextInline text={context.overview} />
        </p>
      </section>
      {context.relatedScripture.length > 0 && (
        <section>
          <h3 className="eyebrow">Related Scripture</h3>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {context.relatedScripture.map((reference) => (
              <li key={formatReference(reference)}>
                <ScriptureReference reference={reference} mode="preview" className="font-serif text-[1.0625rem]" />
              </li>
            ))}
          </ul>
        </section>
      )}
      {groups.map((group) => (
        <RelatedGroup key={group.title} title={group.title} entities={group.entities} />
      ))}
    </div>
  )
}

function RelatedGroup({ title, entities }: { title: string; entities: EntitySummary[] }) {
  return (
    <section>
      <h3 className="eyebrow">{title}</h3>
      <ul className="mt-2.5 space-y-1.5">
        {entities.map((entity) => (
          <li key={entity.id}>
            <EntityLink id={entity.id} className="font-serif text-[1.0625rem] text-foreground hover:text-primary dark:hover:text-reference" />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ReferencesTab({
  book,
  chapter,
  study,
  selectedVerse,
  onClearVerse,
}: {
  book: BibleBook
  chapter: number
  study: ChapterStudyResponse | undefined
  selectedVerse?: number
  onClearVerse: () => void
}) {
  const crossReferences = study?.context?.crossReferences ?? []

  if (selectedVerse !== undefined) {
    const { connections, plain } = referencesForVerse(study, book.id, chapter, selectedVerse)
    const verseLabel = formatReference({ book: book.id, chapter, verse: selectedVerse })
    return (
      <div className="space-y-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-lg">{verseLabel}</h3>
          <Button variant="link" size="sm" onClick={onClearVerse}>
            All verses
          </Button>
        </div>
        {plain.length === 0 && connectionsForVerse(study, book.id, chapter, selectedVerse).length === 0 ? (
          <EmptyState
            title="No references for this verse yet"
            description={`Cross-references are curated verse by verse. Try another verse in ${formatChapter(book.id, chapter)}, or view all verses.`}
          />
        ) : (
          <>
            {plain.length > 0 && (
              <section>
                <h4 className="eyebrow">Cross-references</h4>
                <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                  {plain.map((reference) => (
                    <li key={formatReference(reference)}>
                      <ScriptureReference reference={reference} mode="preview" className="text-sm" />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {connections.length > 0 && (
              <section>
                <h4 className="eyebrow">Connections</h4>
                <ConnectionList views={connections} density="compact" className="mt-3" />
              </section>
            )}
          </>
        )}
      </div>
    )
  }

  const chapterConnections = study?.connections ?? []
  if (crossReferences.length === 0 && chapterConnections.length === 0) {
    return (
      <EmptyState
        title={`No references for ${formatChapter(book.id, chapter)} yet`}
        description="Cross-references and connections are added as study notes are written for each chapter."
      />
    )
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">Choose a verse number in the text to see its references here.</p>
      {crossReferences.length > 0 && (
        <section>
          <h3 className="eyebrow">Cross-references</h3>
          <dl className="mt-3 space-y-2.5 text-sm">
            {crossReferences.map((entry) => (
              <div key={entry.verse} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2">
                <dt className="text-muted-foreground tabular-nums">v. {entry.verse}</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-1">
                  {entry.references.map((reference) => (
                    <ScriptureReference key={formatReference(reference)} reference={reference} mode="preview" />
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {chapterConnections.length > 0 && (
        <section>
          <h3 className="eyebrow">Connections</h3>
          <ConnectionList views={chapterConnections} showOrigin density="compact" className="mt-3" />
        </section>
      )}
    </div>
  )
}

function NotesTab({
  book,
  chapter,
  chapterLabel,
  library,
  libraryActions,
}: {
  book: BibleBook
  chapter: number
  chapterLabel: string
  library: LibraryData
  libraryActions: LibraryActions
}) {
  const chapterNotes = library.notes
    .filter((note) => referenceTouchesChapter(note.reference, book.id, chapter))
    .sort((a, b) => (a.reference.verse ?? 0) - (b.reference.verse ?? 0))

  if (chapterNotes.length === 0) {
    return (
      <EmptyState
        title={`No notes on ${chapterLabel} yet`}
        description="Choose any verse number in the text and select “Add note…”, or select several verses and add a note to the range."
      />
    )
  }

  return (
    <ul className="divide-y">
      {chapterNotes.map((note) => (
        <li key={note.id} className="py-4 first:pt-0">
          <div className="flex items-center justify-between gap-2">
            <ScriptureReference reference={note.reference} className="text-sm font-medium" />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => libraryActions.deleteNote(note.id)}
              aria-label={`Delete note on ${formatReference(note.reference)}`}
            >
              <Trash2 />
            </Button>
          </div>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">{note.text}</p>
        </li>
      ))}
    </ul>
  )
}
