import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/content/empty-state'
import { PageContainer } from '@/components/layout/page-container'
import { Heading } from '@/components/typography/heading'
import { MetadataRow } from '@/components/typography/metadata-row'
import { PageHeader } from '@/components/typography/page-header'
import { SectionHeading } from '@/components/typography/section-heading'
import { pageTitle } from '@/config/site'
import { StudyPreview } from '@/features/studies/study-preview'
import { entityHref } from '@/lib/entity-href'
import { collectionQuery, homeQuery } from '@/services/content'

export function StudiesPage() {
  const { data: home } = useSuspenseQuery(homeQuery())
  const { data: studies } = useSuspenseQuery(collectionQuery('study'))
  const featured = home.featuredStudy
  const others = studies.items.filter((study) => study.id !== featured?.id)

  return (
    <PageContainer className="py-10 sm:py-14 lg:py-20">
      <title>{pageTitle('Studies')}</title>
      <PageHeader
        title="Studies"
        description="Guided, long-form studies that follow a thread through Scripture: each passage first, then brief commentary."
      />

      {featured && (
        <section aria-labelledby="featured-study" className="mt-14 border-y py-10 sm:py-12">
          <MetadataRow items={['Featured study', `${featured.sections?.length ?? 0} parts`, featured.readingMinutes && `${featured.readingMinutes} min read`]} />
          <Heading level={2} variant="title" id="featured-study" className="mt-4 max-w-3xl">
            <Link to={entityHref(featured)} className="hover:text-primary dark:hover:text-reference">
              {featured.title}
            </Link>
          </Heading>
          <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">{featured.summary}</p>
          <Link
            to={entityHref(featured)}
            className="group mt-6 inline-flex items-center gap-2 text-sm font-medium text-reference"
          >
            Begin the study
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="all-studies" className="mt-14">
          <SectionHeading id="all-studies" title={featured ? 'More studies' : 'All studies'} />
          <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {others.map((study) => (
              <li key={study.id} className="flex">
                <StudyPreview study={study} headingLevel={3} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!featured && others.length === 0 && (
        <EmptyState
          className="mt-14"
          headingLevel={2}
          title="Studies are in preparation"
          description="Each study appears here once it has been reviewed. Meanwhile, the Bible and its connections are ready to read."
          action={
            <Link to="/bible" className="text-sm font-medium text-reference link-quiet">
              Open the Bible
            </Link>
          }
        />
      )}
    </PageContainer>
  )
}
