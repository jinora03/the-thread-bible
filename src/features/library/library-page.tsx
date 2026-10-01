import { useQuery } from '@tanstack/react-query'
import { Cloud, MonitorSmartphone, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/content/empty-state'
import { PageContainer } from '@/components/layout/page-container'
import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { PageHeader } from '@/components/typography/page-header'
import { SectionHeading } from '@/components/typography/section-heading'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { pageTitle } from '@/config/site'
import { useLibrary } from '@/features/library/use-library'
import { entityHref } from '@/lib/entity-href'
import { entityQuery } from '@/services/content'
import { chapterHref, formatChapter, formatReference } from '@shared/scripture/reference'
import type { Study } from '@shared/types/content'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const formatDate = (iso: string) => dateFormat.format(new Date(iso))

/** Personal library: saved passages, notes and reading progress, synced when signed in. */
export function LibraryPage() {
  const library = useLibrary()
  const { bookmarks, notes, reading } = library.data

  return (
    <PageContainer width="article" className="py-10 sm:py-14 lg:py-20">
      <title>{pageTitle('Library')}</title>
      <PageHeader title="Library" description="Your saved passages, notes and reading, gathered in one place.">
        <SyncStatus />
      </PageHeader>

      {library.isLoading ? (
        <div role="status" aria-label="Loading your library" className="mt-14 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <div className="mt-14 space-y-16">
          <section aria-labelledby="saved-passages">
            <SectionHeading id="saved-passages" title="Saved passages" />
            {bookmarks.length === 0 ? (
              <EmptyState
                className="mt-6"
                title="No saved passages yet"
                description="While reading, choose a verse number (or select several verses) and bookmark them. Saved passages gather here."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/bible">Open the Bible</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="mt-6 divide-y border-y">
                {bookmarks.map((bookmark) => (
                  <li key={bookmark.id} className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <ScriptureReference reference={bookmark.reference} className="font-serif text-lg" />
                      <p className="text-xs text-muted-foreground">Saved {formatDate(bookmark.createdAt)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => library.actions.removeBookmark(bookmark.id)}
                      aria-label={`Remove ${formatReference(bookmark.reference)} from saved passages`}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="notes">
            <SectionHeading id="notes" title="Notes" />
            {notes.length === 0 ? (
              <EmptyState
                className="mt-6"
                title="No notes yet"
                description="Choose a verse number while reading and select “Add note…”. Your notes stay next to the verse and are listed here."
              />
            ) : (
              <ul className="mt-6 divide-y border-y">
                {notes.map((note) => (
                  <li key={note.id} className="py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <ScriptureReference reference={note.reference} className="font-serif text-lg" />
                        <p className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => library.actions.deleteNote(note.id)}
                        aria-label={`Delete note on ${formatReference(note.reference)}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <p className="mt-2 max-w-[64ch] leading-relaxed whitespace-pre-line">{note.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="reading-progress">
            <SectionHeading id="reading-progress" title="Reading progress" variant="subsection" />
            <div className="mt-4 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="eyebrow">Last chapter opened</p>
                {reading.lastRead ? (
                  <>
                    <Link to={chapterHref(reading.lastRead.bookId, reading.lastRead.chapter)} className="mt-1 block font-serif text-lg text-reference link-quiet">
                      {formatChapter(reading.lastRead.bookId, reading.lastRead.chapter)}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDate(reading.lastRead.readAt)}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Chapters you open will be remembered here.</p>
                )}
              </div>
              <div>
                <p className="eyebrow">Study in progress</p>
                {reading.lastStudy ? (
                  <StudyProgress studyId={reading.lastStudy.studyId} sectionId={reading.lastStudy.sectionId} />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Studies you begin will be remembered here.</p>
                )}
              </div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">A full reading history and saved studies are planned.</p>
          </section>
        </div>
      )}
    </PageContainer>
  )
}

function StudyProgress({ studyId, sectionId }: { studyId: Study['id']; sectionId: string }) {
  const slug = studyId.split(':')[1] ?? ''
  const { data } = useQuery(entityQuery<Study>('study', slug))
  const study = data?.entity
  const section = study?.sections?.find((item) => item.id === sectionId)
  if (!study) return <Skeleton className="mt-2 h-5 w-48" />
  return (
    <>
      <Link to={`${entityHref(study)}${section ? `#${section.id}` : ''}`} className="mt-1 block font-serif text-lg text-reference link-quiet">
        {study.title}
      </Link>
      {section && <p className="text-xs text-muted-foreground">Reached “{section.title}”</p>}
    </>
  )
}

/** Where the library lives, so readers are never unsure whether their notes are safe. */
function SyncStatus() {
  const { user, isLoading } = useLibrary()
  if (isLoading) return null
  if (user) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Cloud aria-hidden="true" className="size-4" />
        Synced to your account ({user.email})
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-surface-subtle px-4 py-3 text-sm">
      <p className="flex items-center gap-2 text-muted-foreground">
        <MonitorSmartphone aria-hidden="true" className="size-4" />
        Saved in this browser only.
      </p>
      <Link to="/sign-in?next=/library" className="font-medium text-reference link-quiet">
        Sign in to sync across devices
      </Link>
    </div>
  )
}
