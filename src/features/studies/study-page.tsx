import { useEffect } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { EmptyState } from '@/components/content/empty-state'
import { RelatedContent } from '@/components/content/related-content'
import { ReviewNotice } from '@/components/content/review-notice'
import { RichText } from '@/components/content/rich-text'
import { ArticleLayout } from '@/components/layout/article-layout'
import { TableOfContents } from '@/components/layout/table-of-contents'
import { Breadcrumbs } from '@/components/navigation/breadcrumbs'
import { ScripturePassage } from '@/components/scripture/scripture-passage'
import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { Heading } from '@/components/typography/heading'
import { MetadataRow } from '@/components/typography/metadata-row'
import { PageHeader } from '@/components/typography/page-header'
import { SectionHeading } from '@/components/typography/section-heading'
import { pageTitle } from '@/config/site'
import { ConnectionThread } from '@/features/connections/connection-thread'
import { ThreadSection } from '@/features/connections/thread-section'
import { formatReference } from '@shared/scripture/reference'
import { useLibrary } from '@/features/library/use-library'
import { entityQuery, pickSummaries } from '@/services/content'
import type { EntityResponse } from '@shared/types/api'
import type { Study, StudySection } from '@shared/types/content'

export function StudyPage() {
  const { slug = '' } = useParams()
  const { data: response } = useSuspenseQuery(entityQuery<Study>('study', slug))
  const study = response.entity

  const tocItems = study.sections?.map((section) => ({ id: section.id, label: section.title }))

  return (
    <ArticleLayout aside={tocItems && <TableOfContents items={tocItems} />} asideLabel="In this study">
      <title>{pageTitle(study.title)}</title>
      <Breadcrumbs items={[{ label: 'Studies', to: '/studies' }, { label: study.title }]} />
      <PageHeader
        eyebrow={
          <MetadataRow
            items={['Study', study.sections ? `${study.sections.length} parts` : 'In preparation', `${study.readingMinutes} min read`]}
          />
        }
        title={study.title}
        description={study.summary}
      >
        <p className="text-sm text-muted-foreground">By {study.author}</p>
        <ReviewNotice review={study.review} className="mt-4" />
      </PageHeader>

      {study.sections ? <StudyBody response={response} sections={study.sections} /> : <StudyPlaceholder response={response} />}
    </ArticleLayout>
  )
}

function StudyBody({ response, sections }: { response: EntityResponse<Study>; sections: StudySection[] }) {
  const { entity: study, thread, related } = response
  useStudyProgress(study.id, sections)

  return (
    <div className="mt-12 sm:mt-14">
      {study.intro && <RichText paragraphs={study.intro} className="prose-commentary text-[1.125rem]" />}

      <section aria-labelledby="study-scripture" className="mt-10 border-y py-6">
        <Heading level={2} variant="label" id="study-scripture">
          Scripture for this study
        </Heading>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {study.keyReferences.map((reference) => (
            <li key={formatReference(reference)}>
              <ScriptureReference reference={reference} mode="preview" />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-16 space-y-16 sm:space-y-20">
        {sections.map((section, index) => (
          <section key={section.id} aria-labelledby={section.id}>
            <SectionHeading id={section.id} title={section.title} eyebrow={<p className="eyebrow">Part {index + 1}</p>} />
            {section.passage && (
              <div className="mt-6 border-l-2 border-thread/70 pl-5 sm:pl-6">
                <ScripturePassage reference={section.passage} />
              </div>
            )}
            <RichText paragraphs={section.body} className="prose-commentary mt-6" />
          </section>
        ))}

        {thread && (
          <section aria-labelledby="study-thread">
            <SectionHeading
              id="study-thread"
              title="The thread, traced"
              description="The passages of this study in order. Choose a reference to read it in place."
            />
            <div className="mt-8">
              <ConnectionThread thread={thread} orientation="vertical" />
            </div>
          </section>
        )}

        <RelatedContent id="related" title="Related topics & studies" entities={pickSummaries(study.relatedIds, related)} />
      </div>
    </div>
  )
}

function StudyPlaceholder({ response }: { response: EntityResponse<Study> }) {
  const { entity: study, related, thread } = response
  return (
    <div className="mt-12 space-y-14">
      <section aria-labelledby="study-scripture">
        <Heading level={2} variant="label" id="study-scripture">
          Scripture for this study
        </Heading>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {study.keyReferences.map((reference) => (
            <li key={formatReference(reference)}>
              <ScriptureReference reference={reference} mode="preview" />
            </li>
          ))}
        </ul>
      </section>
      {/* The thread is ready before the sections are: let the passages lead in the meantime. */}
      {thread && <ThreadSection thread={thread} />}
      <EmptyState
        headingLevel={2}
        title="This study is being written"
        description="Its outline and key passages are ready; the sections are still being written."
      />
      <RelatedContent id="related" title="Related" entities={pickSummaries(study.relatedIds, related)} />
    </div>
  )
}

/**
 * Remembers the section the reader has reached (the last heading scrolled
 * past), so "Continue studying" can return them there.
 */
function useStudyProgress(studyId: Study['id'], sections: StudySection[]) {
  const { actions } = useLibrary()
  const { recordStudy } = actions

  useEffect(() => {
    const headings = sections.flatMap((section) => document.getElementById(section.id) ?? [])
    if (headings.length === 0) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const reached = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target.id)
        const sectionId = reached.at(-1)
        if (!sectionId) return
        clearTimeout(timer)
        timer = setTimeout(() => recordStudy(studyId, sectionId), 800)
      },
      { rootMargin: '0px 0px -60% 0px' },
    )
    for (const heading of headings) observer.observe(heading)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [studyId, sections, recordStudy])
}
