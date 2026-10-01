import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { BasisLabel } from '@/components/content/interpretive-label'
import { PageContainer } from '@/components/layout/page-container'
import { ScripturePassage } from '@/components/scripture/scripture-passage'
import { Heading } from '@/components/typography/heading'
import { PageHeader } from '@/components/typography/page-header'
import { connectionTypeLabels } from '@/config/connections'
import { exploreCollections, exploreGroups, type ExploreCollection } from '@/config/explore'
import { pageTitle } from '@/config/site'
import { entityHref } from '@/lib/entity-href'
import { ref } from '@shared/scripture/reference'
import { exploreQuery } from '@/services/content'
import type { ExploreResponse } from '@shared/types/api'

// A connection Scripture states itself, so the first example shows the thread plainly.
const featuredConnection = {
  source: ref('Exodus 12:13'),
  target: ref('1 Corinthians 5:7'),
  type: 'type-antitype' as const,
  basis: 'stated' as const,
  note: 'In Egypt, the blood of the Passover lamb marked the homes the LORD passed over. Paul names the connection himself: Christ is the Passover lamb, sacrificed for His people.',
}

export function ExplorePage() {
  const { data: explore } = useSuspenseQuery(exploreQuery())
  const byKind = new Map(explore.collections.map((collection) => [collection.kind, collection]))

  return (
    <PageContainer className="py-10 sm:py-14 lg:py-20">
      <title>{pageTitle('Explore')}</title>
      <PageHeader
        title="Explore"
        description="Enter Scripture by its connections: prophecy and fulfillment, types and patterns, covenants, people and places."
      />

      <section aria-labelledby="featured-connection" className="mt-14 rounded-lg bg-surface-subtle/70 px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id="featured-connection" className="eyebrow">
            A connection to begin with · {connectionTypeLabels[featuredConnection.type]}
          </h2>
          <BasisLabel basis={featuredConnection.basis} />
        </div>
        <div className="mt-6 grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-8">
          <ScripturePassage reference={featuredConnection.source} size="lg" />
          <span aria-hidden="true" className="hidden pt-3 font-serif text-2xl text-thread md:block">
            →
          </span>
          <ScripturePassage reference={featuredConnection.target} size="lg" />
        </div>
        <p className="mt-6 max-w-[64ch] text-sm leading-relaxed text-muted-foreground">{featuredConnection.note}</p>
      </section>

      <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
        {exploreGroups.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`group-${group.id}`}
            className="grid gap-8 border-t pt-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16"
          >
            <div>
              <Heading level={2} id={`group-${group.id}`}>
                {group.title}
              </Heading>
              <p className="mt-3 text-muted-foreground">{group.description}</p>
            </div>
            <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {exploreCollections
                .filter((collection) => collection.group === group.id)
                .map((collection) => (
                  <CollectionEntry
                    key={collection.slug}
                    collection={collection}
                    contents={collection.kind ? byKind.get(collection.kind) : undefined}
                  />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </PageContainer>
  )
}

function CollectionEntry({
  collection,
  contents,
}: {
  collection: ExploreCollection
  contents?: ExploreResponse['collections'][number]
}) {
  const count = contents?.count ?? 0
  const entries = contents?.samples ?? []
  const isPlanned = collection.status === 'planned' || count === 0

  return (
    <li>
      <Heading level={3} variant="subsection">
        <Link to={`/explore/${collection.slug}`} className="group inline-flex items-center gap-2 hover:text-primary dark:hover:text-reference">
          {collection.title}
          <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </Heading>
      <p className="mt-1 text-xs text-muted-foreground">
        {isPlanned ? 'In preparation' : `${count} ${count === 1 ? 'entry' : 'entries'}`}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{collection.description}</p>
      {entries.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {entries.map((entity) => (
            <li key={entity.id}>
              <Link to={entityHref(entity)} className="text-reference hover:underline">
                {entity.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
