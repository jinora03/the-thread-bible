import { useSuspenseQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { EmptyState } from '@/components/content/empty-state'
import { SourceLabel } from '@/components/content/interpretive-label'
import { RelatedContent } from '@/components/content/related-content'
import { ReviewNotice } from '@/components/content/review-notice'
import { RichText, RichTextInline } from '@/components/content/rich-text'
import { ThemeLink } from '@/components/content/theme-link'
import { ArticleLayout } from '@/components/layout/article-layout'
import { TableOfContents } from '@/components/layout/table-of-contents'
import { Breadcrumbs } from '@/components/navigation/breadcrumbs'
import { ScripturePassage } from '@/components/scripture/scripture-passage'
import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { MetadataRow } from '@/components/typography/metadata-row'
import { PageHeader } from '@/components/typography/page-header'
import { SectionHeading } from '@/components/typography/section-heading'
import { pageTitle } from '@/config/site'
import { BasisLegend } from '@/features/connections/basis-legend'
import { InterpretationNote } from '@/features/connections/interpretation-note'
import { ParallelPassages } from '@/features/connections/parallel-passages'
import { ThreadSection } from '@/features/connections/thread-section'
import { bookName, formatReference } from '@shared/scripture/reference'
import { entityQuery, pickSummaries } from '@/services/content'
import type { EntityResponse } from '@shared/types/api'
import type { Prophecy, ProphecyDetail } from '@shared/types/content'

/** The passage first, then its context and wording, then where Scripture takes it up. Only sections with content appear. */
function detailSections(response: EntityResponse<Prophecy>, detail: ProphecyDetail) {
  const { entity, related } = response
  return [
    { id: 'passage', label: 'The passage', show: true },
    { id: 'context', label: 'Original context', show: true },
    { id: 'wording', label: 'Key wording', show: detail.keyWording.length > 0 },
    { id: 'old-testament', label: 'Old Testament passages', show: detail.oldTestament.length > 0 },
    { id: 'new-testament', label: 'In the New Testament', show: (response.parallels ?? []).length > 0 },
    { id: 'themes', label: 'Themes', show: detail.themeIds.length > 0 },
    { id: 'thread', label: 'Follow the thread', show: Boolean(response.thread) },
    { id: 'related-prophecies', label: 'Related prophecies', show: relatedPropheciesOf(entity, related).length > 0 },
    { id: 'related-studies', label: 'Related studies', show: detail.relatedStudyIds.length > 0 },
  ].filter((section) => section.show)
}

const relatedPropheciesOf = (prophecy: Prophecy, related: EntityResponse['related']) =>
  pickSummaries(prophecy.relatedIds, related).filter((entity) => entity.kind === 'prophecy')

export function ProphecyPage() {
  const { slug = '' } = useParams()
  const { data: response } = useSuspenseQuery(entityQuery<Prophecy>('prophecy', slug))
  const prophecy = response.entity
  const parallels = response.parallels ?? []
  const passageLabel = formatReference(prophecy.passage)

  return (
    <ArticleLayout aside={prophecy.detail && <TableOfContents items={detailSections(response, prophecy.detail)} />} asideLabel="On this page">
      <title>{pageTitle(prophecy.title)}</title>
      <Breadcrumbs items={[{ label: 'Explore', to: '/explore' }, { label: 'Prophecies', to: '/explore/prophecies' }, { label: prophecy.title }]} />
      <PageHeader
        eyebrow={<MetadataRow items={['Prophecy', ...prophecy.classification]} />}
        title={prophecy.title}
        description={prophecy.summary}
      >
        <dl className="flex flex-wrap gap-x-10 gap-y-3 border-t pt-5 text-sm">
          <div>
            <dt className="eyebrow">Passage</dt>
            <dd className="mt-1">
              <ScriptureReference reference={prophecy.passage} className="font-serif text-lg" />
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Book</dt>
            <dd className="mt-1 font-serif text-lg">{bookName(prophecy.passage.book)}</dd>
          </div>
          {parallels.length > 0 && (
            <div>
              <dt className="eyebrow">Taken up in the NT</dt>
              <dd className="mt-1 font-serif text-lg">
                {parallels.reduce((count, group) => count + group.views.length, 0)} passages
              </dd>
            </div>
          )}
        </dl>
        <ReviewNotice review={prophecy.review} className="mt-6" />
      </PageHeader>

      {prophecy.detail ? (
        <ProphecyBody response={response} detail={prophecy.detail} passageLabel={passageLabel} />
      ) : (
        <ProphecySummary response={response} />
      )}
    </ArticleLayout>
  )
}

function ProphecyBody({ response, detail, passageLabel }: { response: EntityResponse<Prophecy>; detail: ProphecyDetail; passageLabel: string }) {
  const { entity: prophecy, related, thread } = response
  const parallels = response.parallels ?? []
  const themes = pickSummaries(detail.themeIds, related)

  return (
    <div className="mt-14 space-y-16 sm:mt-16 sm:space-y-20">
      <section aria-labelledby="passage">
        <SectionHeading id="passage" title="The Passage" eyebrow={<SourceLabel kind="scripture" />} description={passageLabel} />
        <ScripturePassage reference={prophecy.passage} className="mt-8" />
      </section>

      <section aria-labelledby="context">
        <SectionHeading id="context" title="Original Context" eyebrow={<SourceLabel kind="context" />} />
        <RichText paragraphs={detail.historicalContext} className="prose-commentary mt-6" />
      </section>

      {detail.keyWording.length > 0 && (
        <section aria-labelledby="wording">
          <SectionHeading id="wording" title="Key Wording" description="Phrases the rest of Scripture returns to." />
          <dl className="mt-8 space-y-6">
            {detail.keyWording.map((item) => (
              <div key={item.label} className="border-l-2 border-thread/70 pl-5">
                <dt className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-serif text-lg">{item.label}</span>
                  <ScriptureReference reference={item.reference} mode="preview" className="text-sm" />
                </dt>
                <dd className="prose-commentary mt-1.5">
                  <RichTextInline text={item.note} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {detail.oldTestament.length > 0 && (
        <section aria-labelledby="old-testament">
          <SectionHeading id="old-testament" title="Related Old Testament Passages" variant="subsection" />
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {detail.oldTestament.map((reference) => (
              <li key={formatReference(reference)}>
                <ScriptureReference reference={reference} mode="preview" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {parallels.length > 0 && (
        <section aria-labelledby="new-testament">
          <SectionHeading id="new-testament" title="In the New Testament" />
          <p className="prose-commentary mt-4 text-muted-foreground">
            <RichTextInline text={detail.connectionsIntroduction} />
          </p>
          <div className="mt-6">
            <BasisLegend />
          </div>
          <div className="mt-10">
            <ParallelPassages
              groups={parallels}
              sourceTitle={`In ${bookName(prophecy.passage.book)}`}
              targetTitle="In the New Testament"
            />
          </div>
        </section>
      )}

      {themes.length > 0 && (
        <section aria-labelledby="themes">
          <SectionHeading id="themes" title="Themes" />
          <ul className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {themes.map((theme) => (
              <li key={theme.id}>
                <ThemeLink theme={theme} showSummary />
              </li>
            ))}
          </ul>
        </section>
      )}

      {thread && <ThreadSection thread={thread} />}

      {detail.interpretationNote && <InterpretationNote text={detail.interpretationNote} />}

      <RelatedContent id="related-prophecies" title="Related Prophecies" entities={relatedPropheciesOf(prophecy, related)} />
      <RelatedContent id="related-studies" title="Related Studies" entities={pickSummaries(detail.relatedStudyIds, related)} />
    </div>
  )
}

function ProphecySummary({ response }: { response: EntityResponse<Prophecy> }) {
  const { entity: prophecy, related, thread } = response
  return (
    <div className="mt-12 space-y-14">
      <section aria-labelledby="passage">
        <SectionHeading id="passage" title="The Passage" variant="subsection" eyebrow={<SourceLabel kind="scripture" />} />
        <ScripturePassage reference={prophecy.passage} className="mt-6" />
      </section>
      <section aria-labelledby="key-references">
        <SectionHeading id="key-references" title="Key references" variant="subsection" />
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {prophecy.keyReferences.map((reference) => (
            <li key={formatReference(reference)}>
              <ScriptureReference reference={reference} mode="preview" />
            </li>
          ))}
        </ul>
      </section>
      {thread && <ThreadSection thread={thread} />}
      <EmptyState
        headingLevel={2}
        title="The full study is in preparation"
        description={`${prophecy.title} has its passage and key references so far. Its context and New Testament connections are being gathered.`}
      />
      <RelatedContent id="related" title="Related" entities={pickSummaries(prophecy.relatedIds, related)} />
    </div>
  )
}
