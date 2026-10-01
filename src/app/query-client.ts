import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/services/api-client'

/**
 * The single query cache. Exported so route loaders can prime it before a
 * page renders (and so content responses can seed entity summaries).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // Don't retry answers that won't change (404, 401, validation errors).
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
})
