import { Link } from 'react-router'
import { EmptyState } from '@/components/content/empty-state'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { getCollection } from '@/config/explore'
import { pageTitle } from '@/config/site'

/** A missing doctrine, study or person: names what was looked for and where to browse instead. */
export function EntityNotFound({ collectionSlug, slug }: { collectionSlug: string; slug: string }) {
  const collection = collectionSlug === 'studies' ? { title: 'Studies', slug: 'studies' } : getCollection(collectionSlug)
  const browseHref = collectionSlug === 'studies' ? '/studies' : collection ? `/explore/${collection.slug}` : '/explore'
  const label = collection?.title.toLowerCase() ?? 'the library'

  return (
    <PageContainer width="article">
      <title>{pageTitle('Not found')}</title>
      <EmptyState
        size="page"
        title="We couldn’t find that entry"
        description={`Nothing in ${label} matches “${slug}”. It may have been renamed, or it may not be part of this preview yet.`}
        action={
          <>
            <Button asChild>
              <Link to={browseHref}>Browse {collection?.title ?? 'Explore'}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/search?q=${encodeURIComponent(slug.replace(/-/g, ' '))}`}>Search for it</Link>
            </Button>
          </>
        }
      />
    </PageContainer>
  )
}
