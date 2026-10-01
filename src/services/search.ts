import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { SearchParams, SearchResponse } from '@shared/types/search'
import { api } from '@/services/api-client'

/** Full-text search across Scripture and the library, grouped by type. */
export const searchQuery = (params: SearchParams) =>
  queryOptions({
    queryKey: ['search', params],
    queryFn: ({ signal }) =>
      api.get<SearchResponse>(
        '/search',
        {
          q: params.q,
          filter: params.filter,
          testament: params.testament,
          translation: params.translation,
          limit: params.limit,
          offset: params.offset,
        },
        signal,
      ),
    enabled: params.q.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  })
