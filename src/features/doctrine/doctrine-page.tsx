import { useSuspenseQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { EmptyState } from '@/components/content/empty-state'
import { RelatedContent } from '@/components/content/related-content'
import { ReviewNotice } from '@/components/content/review-notice'
import { RichText, RichTextInline } from '@/components/content/rich-text'
import { ArticleLayout } from '@/components/layout/article-layout'
import { TableOfContents } from '@/components/layout/table-of-contents'
import { Breadcrumbs } from '@/components/navigation/breadcrumbs'
import { ScripturePassage } from '@/components/scripture/scripture-passage'
import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { Heading } from '@/components/typography/heading'
import { MetadataRow } from '@/components/typography/metadata-row'
import { PageHeader } from '@/components/typography/page-header'
import { SectionHeading } from '@/components/typography/section-heading'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { pageTitle } from '@/config/site'
import { BasisLegend } from '@/features/connections/basis-legend'
import { ConnectionList } from '@/features/connections/connection-list'
import { InterpretationNote } from '@/features/connections/interpretation-note'
import { ThreadSection } from '@/features/connections/thread-section'
import { formatReference } from '@shared/scripture/reference'
import { entityQuery, pickSummaries } from '@/services/content'
import type { EntityResponse } from '@shared/types/api'
import type { Doctrine, DoctrineArticle } from '@shared/types/content'

export function DoctrinePage() {
  const { slug = '' } = useParams()
  // The route loader has already fetched this (and answers 404 for unknown slugs).
  const { data: response } = useSuspenseQuery(entityQuery<Doctrine>('doctrine', slug))
  const doctrine = response.entity

  return (
    <ArticleLayout
      aside={doctrine.article && <TableOfContents items={articleSections(response, doctrine.article)} />}
      asideLabel="On this page"
    >
      <title>{pageTitle(doctrine.title)}</title>
      <Breadcrumbs items={[{ label: 'Explore', to: '/explore' }, { label: 'Doctrines', to: '/explore/doctrines' }, { label: doctrine.title }]} />
      <PageHeader
        eyebrow={<MetadataRow items={['Doctrine', doctrine.category]} />}
        title={doctrine.title}
        description={doctrine.summary}
      >
        <ReviewNotice review={doctrine.review} />
      </PageHeader>
      {doctrine.article ? (
        <DoctrineArticleBody response={response} article={doctrine.article} />
      ) : (
        <DoctrineSummary response={response} />
      )}
    </ArticleLayout>
  )
}

const relatedDoctrinesOf = ({ entity, related }: EntityResponse<Doctrine>) =>
  pickSummaries(entity.relatedIds, related).filter((summary) => summary.kind === 'doctrine')

/** Scripture first, then the connections, then a short word on why it matters. Only sections with content appear. */
function articleSections(response: EntityResponse<Doctrine>, article: DoctrineArticle) {
  return [
    { id: 'key-scriptures', label: 'Key Scriptures', show: true },
    { id: 'teaching', label: 'What Scripture teaches', show: true },
    { id: 'foundation', label: 'Through Scripture', show: true },
    { id: 'connections', label: 'Connected passages', show: response.connections.length > 0 },
    { id: 'thread', label: 'Follow the thread', show: Boolean(response.thread) },
    { id: 'insights', label: 'Why it matters', show: true },
    { id: 'questions', label: 'Questions', show: article.questions.length > 0 },
    { id: 'related', label: 'Related doctrines', show: relatedDoctrinesOf(response).length > 0 },
    { id: 'further-study', label: 'Further study', show: article.furtherStudyIds.length > 0 },
  ].filter((section) => section.show)
}

function DoctrineArticleBody({ response, article }: { response: EntityResponse<Doctrine>; article: DoctrineArticle }) {
  const { connections, related, thread } = response

  return (
    <div className="mt-14 space-y-16 sm:mt-16 sm:space-y-20">
      <section aria-labelledby="key-scriptures">
        <SectionHeading id="key-scriptures" title="Key Scriptures" />
        <ul className="mt-8 space-y-10">
          {article.keyScriptures.map((reference) => (
            <li key={formatReference(reference)}>
              <ScripturePassage reference={reference} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="teaching">
        <SectionHeading id="teaching" title="What Scripture Teaches" />
        <RichText paragraphs={article.teaching} className="prose-commentary mt-6" />
      </section>

      <section aria-labelledby="foundation">
        <SectionHeading id="foundation" title="Through Scripture" description="Where the teaching appears, from the Old Testament to the New." />
        <div className="mt-8 space-y-10">
          <div>
            <Heading level={3} variant="subsection">
              Old Testament
            </Heading>
            <RichText paragraphs={article.foundation.oldTestament} className="prose-commentary mt-4" />
          </div>
          <div>
            <Heading level={3} variant="subsection">
              New Testament
            </Heading>
            <RichText paragraphs={article.foundation.newTestament} className="prose-commentary mt-4" />
          </div>
        </div>
      </section>

      {connections.length > 0 && (
        <section aria-labelledby="connections">
          <SectionHeading
            id="connections"
            title="Connected Passages"
            description="Passages linked to this teaching, and how directly each one speaks to it."
          />
          <div className="mt-6">
            <BasisLegend />
          </div>
          <ConnectionList views={connections} className="mt-8 border-t pt-6" />
        </section>
      )}

      {thread && <ThreadSection thread={thread} />}

      <section aria-labelledby="insights">
        <SectionHeading id="insights" title="Why It Matters" />
        <ol className="mt-8 space-y-7">
          {article.insights.map((point, index) => (
            <li key={point.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
              <span aria-hidden="true" className="font-serif text-xl leading-snug text-thread tabular-nums">
                {index + 1}
              </span>
              <div>
                <Heading level={3} variant="item">
                  {point.title}
                </Heading>
                <p className="prose-commentary mt-1.5">
                  <RichTextInline text={point.body} />
                </p>
              </div>
            </li>
          ))}
        </ol>
        {article.interpretationNote && (
          <div className="mt-10">
            <InterpretationNote text={article.interpretationNote} />
          </div>
        )}
      </section>

      {article.questions.length > 0 && (
        <section aria-labelledby="questions">
          <SectionHeading id="questions" title="Questions" />
          <Accordion type="multiple" className="mt-6">
            {article.questions.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger headingLevel={3}>{item.question}</AccordionTrigger>
                <AccordionContent>
                  <RichText paragraphs={item.answer} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      <RelatedContent id="related" title="Related Doctrines" entities={relatedDoctrinesOf(response)} />
      <RelatedContent id="further-study" title="Further Study" entities={pickSummaries(article.furtherStudyIds, related)} />
    </div>
  )
}

/** Doctrines without a full article: summary, key references, and an honest status. */
function DoctrineSummary({ response }: { response: EntityResponse<Doctrine> }) {
  const { entity: doctrine, related, thread } = response
  return (
    <div className="mt-12 space-y-14">
      <section aria-labelledby="key-references">
        <SectionHeading id="key-references" title="Key Scriptures" variant="subsection" />
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {doctrine.keyReferences.map((reference) => (
            <li key={formatReference(reference)}>
              <ScriptureReference reference={reference} mode="preview" />
            </li>
          ))}
        </ul>
      </section>
      {thread && <ThreadSection thread={thread} />}
      <EmptyState
        headingLevel={2}
        title="The full article is in preparation"
        description={`${doctrine.title} has a summary and key Scriptures so far. The passages through the Old and New Testaments are being gathered.`}
      />
      <RelatedContent id="related" title="Related" entities={pickSummaries(doctrine.relatedIds, related)} />
    </div>
  )
}
