import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { PageContainer } from '@/components/layout/page-container'
import { Heading } from '@/components/typography/heading'
import { PageHeader } from '@/components/typography/page-header'
import { pageTitle } from '@/config/site'
import { useLibrary } from '@/features/library/use-library'
import { chapterNotesQuery } from '@/services/content'
import { bookGroups, getBook, testamentLabels } from '@shared/scripture/books'
import { chapterHref, formatChapter } from '@shared/scripture/reference'
import type { Testament } from '@shared/types/scripture'

export function BibleIndexPage() {
  const { data: library } = useLibrary()
  const { lastRead } = library.reading
  const lastBook = lastRead ? getBook(lastRead.bookId) : undefined
  const { data: notes } = useSuspenseQuery(chapterNotesQuery())

  return (
    <PageContainer className="py-10 sm:py-14 lg:py-20">
      <title>{pageTitle('The Bible')}</title>
      <PageHeader
        title="The Bible"
        description="Sixty-six books, read as one story. Choose a book and chapter, or begin with a chapter that has study notes."
      />

      <div className="mt-12 grid gap-10 border-y py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16">
        <section aria-labelledby="continue-heading">
          <Heading level={2} variant="label" id="continue-heading">
            {lastBook ? 'Continue reading' : 'Start reading'}
          </Heading>
          <Link
            to={lastBook && lastRead ? chapterHref(lastBook.id, lastRead.chapter) : chapterHref('genesis', 1)}
            className="group mt-3 inline-flex items-center gap-2 font-serif text-2xl hover:text-primary dark:hover:text-reference"
          >
            {lastBook && lastRead ? formatChapter(lastBook.id, lastRead.chapter) : 'Genesis 1'}
            <ArrowRight aria-hidden="true" className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>

        <section aria-labelledby="notes-heading">
          <Heading level={2} variant="label" id="notes-heading">
            Chapters with study notes
          </Heading>
          <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {notes.map((item) => (
              <li key={`${item.bookId}-${item.chapter}`}>
                <Link to={chapterHref(item.bookId, item.chapter)} className="group block">
                  <span className="font-medium group-hover:text-primary dark:group-hover:text-reference">
                    {getBook(item.bookId)?.name} {item.chapter}
                  </span>
                  <span className="text-muted-foreground">: {item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-20">
        {(['old', 'new'] as Testament[]).map((testament) => (
          <section key={testament} aria-labelledby={`${testament}-heading`}>
            <Heading level={2} id={`${testament}-heading`}>
              {testamentLabels[testament]}
            </Heading>
            <div className="mt-8 space-y-10">
              {bookGroups
                .filter((group) => group.testament === testament)
                .map((group) => (
                  <section key={group.group} aria-labelledby={`group-${group.group}`}>
                    <Heading level={3} variant="label" id={`group-${group.group}`}>
                      {group.label}
                    </Heading>
                    <ul className="mt-3 grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                      {group.bookIds.map((bookId) => {
                        const book = getBook(bookId)
                        if (!book) return null
                        return (
                          <li key={book.id}>
                            <Link
                              to={chapterHref(book.id, 1)}
                              className="flex items-baseline justify-between gap-2 border-b border-border/60 py-2 hover:text-primary dark:hover:text-reference"
                            >
                              <span className="font-serif text-[1.0625rem]">{book.name}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {book.chapterCount}
                                <span className="sr-only"> chapters</span>
                              </span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
            </div>
          </section>
        ))}
      </div>
    </PageContainer>
  )
}
