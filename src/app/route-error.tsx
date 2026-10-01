import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import type { EntityNotFoundData } from '@/app/loaders'
import { EmptyState } from '@/components/content/empty-state'
import { EntityNotFound } from '@/components/content/entity-not-found'
import { PageContainer } from '@/components/layout/page-container'
import { Logo } from '@/components/navigation/logo'
import { Button } from '@/components/ui/button'
import { pageTitle } from '@/config/site'
import { ApiError } from '@/services/api-client'

/** Unmatched URLs. Offers the main ways back into the library. */
export function NotFoundPage() {
  return (
    <PageContainer width="article">
      <title>{pageTitle('Page not found')}</title>
      <EmptyState
        size="page"
        eyebrow={<p className="eyebrow">404</p>}
        title="This page isn’t part of the library"
        description="The address may be mistyped, or the page may have moved. You can search, or start from one of the main sections."
        action={
          <>
            <Button asChild>
              <Link to="/search">Search the library</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/bible">Open the Bible</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Home</Link>
            </Button>
          </>
        }
      />
    </PageContainer>
  )
}

/** Route-level error boundary: renders inside the app shell, so navigation stays available. */
export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) {
    const missing = error.data as Partial<EntityNotFoundData> | undefined
    return missing?.collection ? <EntityNotFound collectionSlug={missing.collection} slug={missing.slug ?? ''} /> : <NotFoundPage />
  }
  const offline = error instanceof ApiError && error.status === 0

  return (
    <PageContainer width="article">
      <title>{pageTitle(offline ? 'Can’t reach the library' : 'Something interrupted this page')}</title>
      <EmptyState
        size="page"
        title={offline ? 'The library can’t be reached right now' : 'This page couldn’t be displayed'}
        description={
          <>
            <p>
              {offline
                ? 'The Thread Bible server didn’t respond. Check your connection, then try again. Nothing you saved has been lost.'
                : 'An unexpected problem stopped the page from rendering. Reloading usually helps; your notes and bookmarks are stored separately and are not affected.'}
            </p>
            {import.meta.env.DEV && error instanceof Error && !offline && (
              <pre className="mt-4 overflow-x-auto rounded-md bg-surface-subtle p-3 text-xs">{error.message}</pre>
            )}
          </>
        }
        action={
          <>
            <Button onClick={() => window.location.reload()}>{offline ? 'Try again' : 'Reload page'}</Button>
            <Button asChild variant="outline">
              <Link to="/">Go home</Link>
            </Button>
          </>
        }
      />
    </PageContainer>
  )
}

/** Shown on a direct visit while the page's code loads: the header frame, nothing else. */
export function AppLoading() {
  return (
    <div className="min-h-dvh" role="status" aria-label="Loading">
      <div className="flex h-16 items-center border-b px-4 sm:px-6 lg:px-8 xl:px-12">
        <Logo />
      </div>
    </div>
  )
}

/** Last resort if the shell itself fails: no router-dependent UI. */
export function RootErrorPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <h1 className="font-serif text-3xl">The Thread Bible couldn’t start</h1>
      <p className="mt-4 text-muted-foreground">
        Something went wrong while loading the application. Please reload the page. If it keeps happening, clearing
        this site’s stored data may help.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Reload
      </button>
    </div>
  )
}
