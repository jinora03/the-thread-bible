import { queryOptions } from '@tanstack/react-query'
import { formatReference, referenceKey } from '@shared/scripture/reference'
import type { BookId, Chapter, Passage, ScriptureReference, Translation } from '@shared/types/scripture'
import { api } from '@/services/api-client'

// Scripture text never changes, so cached results never go stale.
const forever = { staleTime: Infinity, gcTime: 30 * 60_000 }

export const translationsQuery = () =>
  queryOptions({
    queryKey: ['scripture', 'translations'],
    queryFn: ({ signal }) => api.get<Translation[]>('/scripture/translations', undefined, signal),
    staleTime: 10 * 60_000,
  })

export const chapterQuery = (translationId: string, bookId: BookId, chapter: number) =>
  queryOptions({
    queryKey: ['scripture', translationId, 'chapter', bookId, chapter],
    queryFn: ({ signal }) => api.get<Chapter>(`/scripture/${translationId}/${bookId}/${chapter}`, undefined, signal),
    ...forever,
  })

export const passageQuery = (translationId: string, reference: ScriptureReference) =>
  queryOptions({
    queryKey: ['scripture', translationId, 'passage', referenceKey(reference)],
    // formatReference output round-trips through the server's parseReference.
    queryFn: ({ signal }) => api.get<Passage>(`/scripture/${translationId}/passage`, { ref: formatReference(reference) }, signal),
    ...forever,
  })
