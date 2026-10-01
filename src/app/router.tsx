import { createBrowserRouter, redirect } from 'react-router'
import { AppShell } from '@/app/app-shell'
import {
  bibleIndexLoader,
  collectionLoader,
  entityLoader,
  exploreLoader,
  genericEntityLoader,
  homeLoader,
  readerLoader,
  studiesLoader,
} from '@/app/loaders'
import { AppLoading, NotFoundPage, RootErrorPage, RouteErrorPage } from '@/app/route-error'
import { HomePage } from '@/features/home/home-page'

// Loaders are small and load eagerly; page components load on demand.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RootErrorPage />,
    hydrateFallbackElement: <AppLoading />,
    children: [
      {
        // Errors in any page render here, inside the shell.
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, loader: homeLoader, element: <HomePage /> },

          {
            path: 'bible',
            loader: bibleIndexLoader,
            lazy: () => import('@/features/bible/bible-index-page').then((m) => ({ Component: m.BibleIndexPage })),
          },
          { path: 'bible/:bookId', loader: ({ params }) => redirect(`/bible/${params.bookId}/1`) },
          {
            path: 'bible/:bookId/:chapter',
            loader: readerLoader,
            lazy: () => import('@/features/bible/reader-page').then((m) => ({ Component: m.ReaderPage })),
          },

          {
            path: 'explore',
            loader: exploreLoader,
            lazy: () => import('@/features/explore/explore-page').then((m) => ({ Component: m.ExplorePage })),
          },
          {
            path: 'explore/doctrines/:slug',
            loader: entityLoader('doctrine', 'doctrines'),
            lazy: () => import('@/features/doctrine/doctrine-page').then((m) => ({ Component: m.DoctrinePage })),
          },
          {
            path: 'explore/prophecies/:slug',
            loader: entityLoader('prophecy', 'prophecies'),
            lazy: () => import('@/features/prophecy/prophecy-page').then((m) => ({ Component: m.ProphecyPage })),
          },
          {
            path: 'explore/:collection',
            loader: collectionLoader,
            lazy: () => import('@/features/explore/collection-page').then((m) => ({ Component: m.CollectionPage })),
          },
          {
            path: 'explore/:collection/:slug',
            loader: genericEntityLoader,
            lazy: () => import('@/features/explore/entity-page').then((m) => ({ Component: m.EntityPage })),
          },

          {
            path: 'studies',
            loader: studiesLoader,
            lazy: () => import('@/features/studies/studies-page').then((m) => ({ Component: m.StudiesPage })),
          },
          {
            path: 'studies/:slug',
            loader: entityLoader('study', 'studies'),
            lazy: () => import('@/features/studies/study-page').then((m) => ({ Component: m.StudyPage })),
          },

          {
            path: 'library',
            lazy: () => import('@/features/library/library-page').then((m) => ({ Component: m.LibraryPage })),
          },
          {
            path: 'search',
            lazy: () => import('@/features/search/search-page').then((m) => ({ Component: m.SearchPage })),
          },
          {
            path: 'sign-in',
            lazy: () => import('@/features/auth/sign-in-page').then((m) => ({ Component: m.SignInPage })),
          },
          {
            path: 'sign-up',
            lazy: () => import('@/features/auth/sign-up-page').then((m) => ({ Component: m.SignUpPage })),
          },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
