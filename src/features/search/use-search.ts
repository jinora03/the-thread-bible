import { useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslationId } from '@/hooks/use-scripture'
import { searchQuery } from '@/services/search'
import type { SearchParams } from '@shared/types/search'

/**
 * Search as server state: cached per query, previous results kept while the
 * next query resolves. `useDeferredValue` keeps typing responsive without a debounce effect.
 * Scripture results come from the reader's chosen translation.
 */
export function useSearch(params: Omit<SearchParams, 'translation'>) {
  const deferredQuery = useDeferredValue(params.q.trim())
  const translation = useTranslationId()
  const result = useQuery(searchQuery({ ...params, q: deferredQuery, translation }))
  return { ...result, isUpdating: result.isFetching || deferredQuery !== params.q.trim() }
}
