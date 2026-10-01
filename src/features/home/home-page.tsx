import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { ArrowRight, Search } from 'lucide-react'
import { Form, Link } from 'react-router'
import { ThemeLink } from '@/components/content/theme-link'
import { PageContainer } from '@/components/layout/page-container'
import { ThreadMark } from '@/components/navigation/logo'
import { ScripturePassage } from '@/components/scripture/scripture-passage'
import { Heading } from '@/components/typography/heading'
import { MetadataRow } from '@/components/typography/metadata-row'
import { SectionHeading } from '@/components/typography/section-heading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { pageTitle } from '@/config/site'
import { ConnectionThread } from '@/features/connections/connection-thread'
import { useLibrary } from '@/features/library/use-library'
import { entityHref } from '@/lib/entity-href'
import { entityQuery, homeQuery } from '@/services/content'
import { getBook } from '@shared/scripture/books'
import { chapterHref, formatChapter } from '@shared/scripture/reference'
import type { EntityPreview, HomeResponse } from '@shared/types/api'
import type { Thread } from '@shared/types/connections'
import type { EntitySummary, Study } from '@shared/types/content'
import type { ScriptureReference } from '@shared/types/scripture'

export function HomePage() {
  const { data: home } = useSuspenseQuery(homeQuery())

  return (
    <>
      <title>{pageTitle()}</title>
      <SearchHero suggestions={home.searchSuggestions} />
      <PageContainer className="space-y-20 py-16 sm:space-y-24 sm:py-20">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-20">
          <ContinueStudying home={home} />
          <TodaysScripture reference={home.todaysScripture} />
        </div>
        {home.themes.length > 0 && <ExploreThemes themes={home.themes} />}
      </PageContainer>
      {home.featuredStudy && <FeaturedStudy study={home.featuredStudy} />}
      {home.thread && (
        <PageContainer className="py-16 sm:py-24">
          <PromiseToFulfillment thread={home.thread} />
        </PageContainer>
      )}
    </>
  )
}

function SearchHero({ suggestions }: { suggestions: string[] }) {
  return (
    <section aria-labelledby="home-title" className="border-b">
      <PageContainer className="py-16 text-center sm:py-24 lg:py-28">
        <ThreadMark className="mx-auto size-7" />
        <Heading level={1} variant="display" id="home-title" className="mt-6">
          Search the Scriptures
        </Heading>
        <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-pretty text-muted-foreground">
          Read the text, then follow its threads to prophecy and fulfillment, doctrine, and the people and places
          of the story.
        </p>

        <Form method="get" action="/search" role="search" className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 sm:flex-row">
          <label htmlFor="home-search" className="sr-only">
            Search Scripture and the library
          </label>
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="home-search"
              name="q"
              type="search"
              required
              placeholder="Search Scripture, doctrine, prophecy, people, themes…"
              className="h-13 rounded-lg pl-11 text-base text-ellipsis shadow-[0_1px_0_var(--border)]"
            />
          </div>
          <Button type="submit" size="lg" className="h-13 rounded-lg px-6">
            Search
          </Button>
        </Form>

        {suggestions.length > 0 && (
          <p className="mt-5 text-sm text-muted-foreground">
            <span className="mr-2">Try</span>
            {suggestions.map((suggestion, index) => (
              <span key={suggestion} className="whitespace-nowrap">
                {index > 0 && (
                  <span aria-hidden="true" className="mx-2 text-border">
                    ·
                  </span>
                )}
                <Link to={`/search?q=${encodeURIComponent(suggestion)}`} className="text-foreground link-quiet">
                  {suggestion}
                </Link>
              </span>
            ))}
          </p>
        )}
      </PageContainer>
    </section>
  )
}

function ContinueStudying({ home }: { home: HomeResponse }) {
  const { data: library } = useLibrary()
  const { lastRead, lastStudy } = library.reading
  const lastBook = lastRead ? getBook(lastRead.bookId) : undefined
  const reading = lastBook && lastRead ? { book: lastBook, chapter: lastRead.chapter } : { book: getBook('romans')!, chapter: 8 }

  // The study in progress, or an invitation to begin the featured one.
  const studySlug = lastStudy?.studyId.split(':')[1] ?? ''
  const { data: studyResponse } = useQuery({ ...entityQuery<Study>('study', studySlug), enabled: Boolean(studySlug) })
  const study = studyResponse?.entity
  const sectionIndex = study?.sections?.findIndex((section) => section.id === lastStudy?.sectionId) ?? -1
  const section = sectionIndex >= 0 ? study?.sections?.[sectionIndex] : undefined

  return (
    <section aria-labelledby="continue-studying">
      <SectionHeading id="continue-studying" title="Continue Studying" />
      <ul className="mt-6 divide-y border-y">
        <li>
          <ContinueRow
            to={chapterHref(reading.book.id, reading.chapter)}
            eyebrow={lastRead ? 'Where you left off' : 'Suggested reading'}
            title={formatChapter(reading.book.id, reading.chapter)}
          />
        </li>
        {study && section ? (
          <li>
            <ContinueRow
              to={`${entityHref(study)}#${section.id}`}
              eyebrow={`Study in progress · Part ${sectionIndex + 1} of ${study.sections?.length}`}
              title={study.title}
              detail={`Continue with “${section.title}”`}
            />
          </li>
        ) : home.featuredStudy ? (
          <li>
            <ContinueRow
              to={entityHref(home.featuredStudy)}
              eyebrow="Begin a study"
              title={home.featuredStudy.title}
              detail={home.featuredStudy.sections ? `${home.featuredStudy.sections.length} parts` : undefined}
            />
          </li>
        ) : null}
      </ul>
    </section>
  )
}

function ContinueRow({ to, eyebrow, title, detail }: { to: string; eyebrow: string; title: string; detail?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-4 py-5">
      <div className="min-w-0 flex-1">
        <p className="eyebrow">{eyebrow}</p>
        <p className="mt-1.5 font-serif text-xl group-hover:text-primary dark:group-hover:text-reference">{title}</p>
        {detail && <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>}
      </div>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function TodaysScripture({ reference }: { reference: ScriptureReference }) {
  return (
    <section aria-labelledby="todays-scripture">
      <SectionHeading id="todays-scripture" title="Today’s Scripture" />
      <ScripturePassage reference={reference} size="lg" className="mt-6" />
    </section>
  )
}

function ExploreThemes({ themes }: { themes: EntitySummary[] }) {
  return (
    <section aria-labelledby="explore-themes">
      <SectionHeading
        id="explore-themes"
        title="Explore a Theme"
        description="Ideas that run the length of Scripture, traced book by book."
        action={
          <Link to="/explore/themes" className="text-sm font-medium text-reference link-quiet">
            All themes
          </Link>
        }
      />
      <ul className="mt-8 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => (
          <li key={theme.id} className="border-t py-5">
            <ThemeLink theme={theme} showSummary />
          </li>
        ))}
      </ul>
    </section>
  )
}

function FeaturedStudy({ study }: { study: EntityPreview }) {
  return (
    // Named explicitly: the featured study often shares its title with the thread below.
    <section aria-label={`Featured study: ${study.title}`} className="bg-surface-subtle/70">
      <PageContainer className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <MetadataRow items={['Featured study', study.readingMinutes && `${study.readingMinutes} min read`]} />
          <Heading level={2} variant="title" id="featured-study" className="mt-4">
            {study.title}
          </Heading>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">{study.summary}</p>
          <Button asChild size="lg" className="mt-8">
            <Link to={entityHref(study)}>
              Begin the study
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        {study.sections && (
          <div>
            <p className="eyebrow">In this study</p>
            <ol className="mt-4 space-y-3">
              {study.sections.map((section, index) => (
                <li key={section.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-baseline">
                  <span className="font-serif text-thread tabular-nums">{index + 1}</span>
                  <Link to={`${entityHref(study)}#${section.id}`} className="font-serif text-lg hover:text-primary dark:hover:text-reference">
                    {section.title}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </PageContainer>
    </section>
  )
}

function PromiseToFulfillment({ thread }: { thread: Thread }) {
  return (
    <section aria-labelledby="promise-to-fulfillment">
      <SectionHeading
        id="promise-to-fulfillment"
        title={thread.title}
        description="One thread through Scripture, from Eden to the empty tomb. Choose any reference to read it in place."
      />
      <div className="mt-10">
        <ConnectionThread thread={thread} />
      </div>
    </section>
  )
}
