import { Suspense, useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router'
import { SiteFooter } from '@/components/layout/site-footer'
import { SkipLink } from '@/components/layout/skip-link'
import { TopNavigation } from '@/components/navigation/top-navigation'
import { Toaster } from '@/components/ui/sonner'
import { UserMenu } from '@/features/auth/user-menu'
import { LibrarySync } from '@/features/library/library-sync'
import { SearchCommand } from '@/features/search/search-command'
import { SearchProvider } from '@/features/search/search-provider'
import { SearchTrigger } from '@/features/search/search-trigger'

/** The persistent frame around every page. Composes shared layout with app-level features. */
export function AppShell() {
  return (
    <SearchProvider>
      <NavigationProgress />
      <div className="flex min-h-dvh flex-col">
        <SkipLink />
        <TopNavigation search={<SearchTrigger />} account={<UserMenu />} />
        <FocusedMain>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </FocusedMain>
        <SiteFooter />
      </div>
      <SearchCommand />
      <LibrarySync />
      <Toaster />
      <ScrollRestoration getKey={scrollKey} />
    </SearchProvider>
  )
}

// Every full page load has the key "default"; without this, opening a shared
// link would restore the scroll position of whatever page was loaded last.
function scrollKey(location: { key: string; pathname: string; hash: string }) {
  return location.key === 'default' ? `${location.pathname}${location.hash}` : location.key
}

/**
 * A thin thread-gold bar while a navigation waits for data. It appears only
 * after a short delay, so fast navigations never flash.
 */
function NavigationProgress() {
  const navigation = useNavigation()
  if (navigation.state === 'idle') return null
  return (
    <div role="progressbar" aria-label="Loading page" className="fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden">
      <div className="h-full w-1/3 animate-[thread-progress_1.2s_ease-in-out_infinite] bg-thread opacity-0 [animation-delay:150ms] motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-100" />
    </div>
  )
}

/**
 * Moves focus to the main landmark after client-side navigation, so screen
 * reader and keyboard users start at the new page's content (not the old link).
 */
function FocusedMain({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
      {children}
    </main>
  )
}
