import { data, type LoaderFunctionArgs } from 'react-router'
import { getAdjacentChapter, getBook } from '@shared/scripture/books'
import type { EntityKind } from '@shared/types/content'
import { queryClient } from '@/app/query-client'
import { getCollection } from '@/config/explore'
import { getReaderPreferences } from '@/hooks/reader-preferences'
import { isNotFound } from '@/services/api-client'
import { chapterNotesQuery, chapterStudyQuery, collectionQuery, entityQuery, exploreQuery, homeQuery } from '@/services/content'
import { chapterQuery, translationsQuery } from '@/services/scripture'

// Loaders prime the query cache so pages render complete, without loading
// flashes, and so navigation waits for data instead of showing skeletons.

/** What RouteErrorPage receives for a missing library entry. */
export interface EntityNotFoundData {
  collection: string
  slug: string
}

async function ensureEntity(kind: EntityKind, collection: string, slug: string) {
  try {
    await queryClient.ensureQueryData(entityQuery(kind, slug))
  } catch (error) {
    if (isNotFound(error)) throw data<EntityNotFoundData>({ collection, slug }, { status: 404 })
    throw error
  }
  return null
}

export async function homeLoader() {
  await queryClient.ensureQueryData(homeQuery())
  return null
}

export async function bibleIndexLoader() {
  await queryClient.ensureQueryData(chapterNotesQuery())
  return null
}

export async function readerLoader({ params }: LoaderFunctionArgs) {
  const book = getBook(params.bookId ?? '')
  const chapter = Number(params.chapter)
  // Invalid addresses are explained by the page itself.
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) return null

  const { translationId } = getReaderPreferences()
  void queryClient.prefetchQuery(translationsQuery())
  void queryClient.prefetchQuery(chapterNotesQuery())
  // The page shows its own error and retry states, so failures here are not fatal.
  await Promise.allSettled([
    queryClient.ensureQueryData(chapterQuery(translationId, book.id, chapter)),
    queryClient.ensureQueryData(chapterStudyQuery(book.id, chapter)),
  ])
  // Most readers continue to the next chapter: fetch it in the background.
  const next = getAdjacentChapter(book, chapter, 'next')
  if (next) void queryClient.prefetchQuery(chapterQuery(translationId, next.book.id, next.chapter))
  return null
}

export async function exploreLoader() {
  await queryClient.ensureQueryData(exploreQuery())
  return null
}

export async function collectionLoader({ params }: LoaderFunctionArgs) {
  const kind = getCollection(params.collection ?? '')?.kind
  if (kind) await queryClient.ensureQueryData(collectionQuery(kind))
  return null
}

export function entityLoader(kind: EntityKind, collection: string) {
  return ({ params }: LoaderFunctionArgs) => ensureEntity(kind, collection, params.slug ?? '')
}

export async function genericEntityLoader({ params }: LoaderFunctionArgs) {
  const collection = getCollection(params.collection ?? '')
  if (!collection?.kind) throw data<EntityNotFoundData>({ collection: params.collection ?? '', slug: params.slug ?? '' }, { status: 404 })
  return ensureEntity(collection.kind, collection.slug, params.slug ?? '')
}

export async function studiesLoader() {
  await Promise.all([queryClient.ensureQueryData(collectionQuery('study')), queryClient.ensureQueryData(homeQuery())])
  return null
}
