import { queryOptions, useQuery } from '@tanstack/react-query'
import type {
  ChapterNotesIndexEntry,
  ChapterStudyResponse,
  CollectionResponse,
  EntityResponse,
  ExploreResponse,
  HomeResponse,
} from '@shared/types/api'
import type { Entity, EntityId, EntityKind, EntitySummary } from '@shared/types/content'
import { queryClient } from '@/app/query-client'
import { api } from '@/services/api-client'

// Editorial content changes rarely; a few minutes of freshness is plenty.
const editorial = { staleTime: 5 * 60_000 }

const summaryKey = (id: EntityId) => ['content', 'summary', id] as const

/** Every response that carries related summaries seeds them, so links render instantly. */
function seedSummaries(summaries: EntitySummary[]) {
  for (const summary of summaries) queryClient.setQueryData(summaryKey(summary.id), summary)
}

export const entityQuery = <E extends Entity = Entity>(kind: EntityKind, slug: string) =>
  queryOptions({
    queryKey: ['content', 'entity', kind, slug],
    queryFn: async ({ signal }) => {
      const response = await api.get<EntityResponse<E>>(`/content/entities/${kind}/${slug}`, undefined, signal)
      seedSummaries(response.related)
      return response
    },
    ...editorial,
  })

export const collectionQuery = (kind: EntityKind) =>
  queryOptions({
    queryKey: ['content', 'collection', kind],
    queryFn: async ({ signal }) => {
      const response = await api.get<CollectionResponse>(`/content/entities/${kind}`, undefined, signal)
      seedSummaries(response.items)
      return response
    },
    ...editorial,
  })

export const chapterStudyQuery = (bookId: string, chapter: number) =>
  queryOptions({
    queryKey: ['content', 'chapter', bookId, chapter],
    queryFn: async ({ signal }) => {
      const response = await api.get<ChapterStudyResponse>(`/content/chapters/${bookId}/${chapter}`, undefined, signal)
      seedSummaries(response.related)
      return response
    },
    ...editorial,
  })

export const chapterNotesQuery = () =>
  queryOptions({
    queryKey: ['content', 'chapter-notes'],
    queryFn: ({ signal }) => api.get<ChapterNotesIndexEntry[]>('/content/chapter-notes', undefined, signal),
    ...editorial,
  })

export const homeQuery = () =>
  queryOptions({
    queryKey: ['content', 'home'],
    queryFn: async ({ signal }) => {
      const response = await api.get<HomeResponse>('/content/home', undefined, signal)
      seedSummaries([...response.themes, ...(response.featuredStudy ? [response.featuredStudy] : [])])
      return response
    },
    ...editorial,
  })

export const exploreQuery = () =>
  queryOptions({
    queryKey: ['content', 'explore'],
    queryFn: async ({ signal }) => {
      const response = await api.get<ExploreResponse>('/content/explore', undefined, signal)
      seedSummaries(response.collections.flatMap((collection) => collection.samples))
      return response
    },
    ...editorial,
  })

/**
 * A single entity's title and link target. Normally already in the cache
 * (seeded by the page's response); fetched on demand otherwise.
 */
export function useEntitySummary(id: EntityId) {
  return useQuery({
    queryKey: summaryKey(id),
    queryFn: async ({ signal }) => (await api.get<EntitySummary[]>('/content/summaries', { ids: id }, signal))[0] ?? null,
    ...editorial,
  })
}

/** Picks summaries by id, in the given order, skipping any not provided (e.g. unpublished). */
export function pickSummaries(ids: readonly EntityId[] = [], available: EntitySummary[]): EntitySummary[] {
  const byId = new Map(available.map((summary) => [summary.id, summary]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}
