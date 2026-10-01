import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { RelatedContent } from '@/components/content/related-content'
import { ReviewNotice } from '@/components/content/review-notice'
import { ArticleLayout } from '@/components/layout/article-layout'
import { Breadcrumbs } from '@/components/navigation/breadcrumbs'
import { ScripturePassage } from '@/components/scripture/scripture-passage'
import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { MetadataRow } from '@/components/typography/metadata-row'
import { PageHeader } from '@/components/typography/page-header'
import { SectionHeading } from '@/components/typography/section-heading'
import { entityKindLabels, getCollection } from '@/config/explore'
import { pageTitle } from '@/config/site'
import { ConnectionList } from '@/features/connections/connection-list'
import { ThreadSection } from '@/features/connections/thread-section'
import { entityQuery, pickSummaries } from '@/services/content'
import { chapterHref, formatChapter, formatReference } from '@shared/scripture/reference'
import type { Entity } from '@shared/types/content'

/** One generic page for themes, people, places, typology, covenants, promises and events. */
export function EntityPage() {
  const { collection: collectionSlug = '', slug = '' } = useParams()
  // The loader validated the collection and fetched the entry (404 otherwise).
  const collection = getCollection(collectionSlug)!
  const { data: response } = useSuspenseQuery(entityQuery(collection.kind!, slug))
  const { entity, connections, chapters, related, thread } = response

  // Quote the first two key passages in full; list the rest as references.
  const quoted = entity.keyReferences.slice(0, 2)

  return (
    <ArticleLayout>
      <title>{pageTitle(entity.title)}</title>
      <Breadcrumbs
        items={[
          { label: 'Explore', to: '/explore' },
          { label: collection.title, to: `/explore/${collection.slug}` },
          { label: entity.title },
        ]}
      />
      <PageHeader
        eyebrow={<MetadataRow items={[entityKindLabels[entity.kind], secondaryLabel(entity)]} />}
        title={entity.title}
        description={entity.summary}
      >
        <ReviewNotice review={entity.review} />
      </PageHeader>

      <div className="mt-14 space-y-16">
        {entity.keyReferences.length > 0 && (
          <section aria-labelledby="key-passages">
            <SectionHeading id="key-passages" title="Key Passages" />
            <ul className="mt-8 space-y-10">
              {quoted.map((reference) => (
                <li key={formatReference(reference)}>
                  <ScripturePassage reference={reference} />
                </li>
              ))}
            </ul>
            {entity.keyReferences.length > quoted.length && (
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5">
                {entity.keyReferences.slice(quoted.length).map((reference) => (
                  <li key={formatReference(reference)}>
                    <ScriptureReference reference={reference} mode="preview" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {connections.length > 0 && (
          <section aria-labelledby="connections">
            <SectionHeading id="connections" title="Connected Passages" />
            <ConnectionList views={connections} className="mt-6" />
          </section>
        )}

        {thread && <ThreadSection thread={thread} />}

        {chapters.length > 0 && (
          <section aria-labelledby="in-the-reader">
            <SectionHeading
              id="in-the-reader"
              title="Read it in context"
              variant="subsection"
              description="Chapters whose study notes point here."
            />
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {chapters.map(({ bookId, chapter }) => (
                <li key={`${bookId}-${chapter}`}>
                  <Link to={chapterHref(bookId, chapter)} className="font-serif text-lg text-reference link-quiet">
                    {formatChapter(bookId, chapter)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <RelatedContent id="related" title="Related" entities={pickSummaries(entity.relatedIds, related)} />
      </div>
    </ArticleLayout>
  )
}

function secondaryLabel(entity: Entity) {
  if (entity.kind === 'person') return entity.role
  if (entity.kind === 'place') return entity.region
  return undefined
}
