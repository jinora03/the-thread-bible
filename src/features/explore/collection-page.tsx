import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/content/empty-state'
import { PageContainer } from '@/components/layout/page-container'
import { Breadcrumbs } from '@/components/navigation/breadcrumbs'
import { Heading } from '@/components/typography/heading'
import { PageHeader } from '@/components/typography/page-header'
import { Button } from '@/components/ui/button'
import { exploreCollections, getCollection, type ExploreCollection } from '@/config/explore'
import { pageTitle } from '@/config/site'
import { DoctrinePreview } from '@/features/doctrine/doctrine-preview'
import { ProphecyPreview } from '@/features/prophecy/prophecy-preview'
import { entityHref } from '@/lib/entity-href'
import { collectionQuery } from '@/services/content'
import type { EntityPreview } from '@shared/types/api'
import type { EntityKind } from '@shared/types/content'

export function CollectionPage() {
  const { collection: slug = '' } = useParams()
  const collection = getCollection(slug)

  if (!collection) {
    return (
      <PageContainer width="article">
        <title>{pageTitle('Collection not found')}</title>
        <EmptyState
          size="page"
          title="There’s no collection by that name"
          description={`“${slug}” isn’t one of the Explore collections. Collections include ${exploreCollections
            .slice(0, 4)
            .map((item) => item.title.toLowerCase())
            .join(', ')} and more.`}
          action={
            <Button asChild>
              <Link to="/explore">Browse Explore</Link>
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const available = exploreCollections.filter((item) => item.status === 'available' && item.slug !== collection.slug)

  return (
    <PageContainer className="py-10 sm:py-14 lg:py-20">
      <title>{pageTitle(collection.title)}</title>
      <Breadcrumbs items={[{ label: 'Explore', to: '/explore' }, { label: collection.title }]} />
      <PageHeader title={collection.title} description={collection.description} />

      <div className="mt-12">
        {collection.kind ? (
          <CollectionContents kind={collection.kind} collection={collection} available={available} />
        ) : (
          <InPreparation collection={collection} available={available} />
        )}
      </div>
    </PageContainer>
  )
}

function CollectionContents({ kind, collection, available }: { kind: EntityKind; collection: ExploreCollection; available: ExploreCollection[] }) {
  const { data } = useSuspenseQuery(collectionQuery(kind))
  return data.items.length === 0 ? (
    <InPreparation collection={collection} available={available} />
  ) : (
    <CollectionItems entities={data.items} />
  )
}

function InPreparation({ collection, available }: { collection: ExploreCollection; available: ExploreCollection[] }) {
  return (
    <EmptyState
      headingLevel={2}
      title={`${collection.title} are in preparation`}
      description={`This collection is part of the plan for the library but has no published entries yet. ${collection.description}`}
      action={
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {available.slice(0, 5).map((item) => (
            <li key={item.slug}>
              <Link to={`/explore/${item.slug}`} className="text-reference link-quiet">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      }
    />
  )
}

/** Doctrines and prophecies are selectable objects (cards); everything else reads best as an index. */
function CollectionItems({ entities }: { entities: EntityPreview[] }) {
  const cardEntities = entities.filter((entity) => entity.kind === 'doctrine' || entity.kind === 'prophecy')

  if (cardEntities.length === entities.length) {
    return (
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cardEntities.map((entity) => (
          <li key={entity.id} className="flex">
            {entity.kind === 'doctrine' && <DoctrinePreview doctrine={entity} headingLevel={2} />}
            {entity.kind === 'prophecy' && <ProphecyPreview prophecy={entity} headingLevel={2} />}
          </li>
        ))}
      </ul>
    )
  }

  const sorted = entities // already alphabetical from the API
  return (
    <ul className="grid gap-x-12 sm:grid-cols-2">
      {sorted.map((entity) => (
        <li key={entity.id} className="border-t py-5">
          <Heading level={2} variant="subsection">
            <Link to={entityHref(entity)} className="hover:text-primary dark:hover:text-reference">
              {entity.title}
            </Link>
          </Heading>
          {entity.subtitle && <p className="mt-0.5 text-sm text-context">{entity.subtitle}</p>}
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{entity.summary}</p>
        </li>
      ))}
    </ul>
  )
}
