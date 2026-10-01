import { useQuery } from '@tanstack/react-query'
import type { BookId, ScriptureReference, Translation } from '@shared/types/scripture'
import { useReaderPreferences } from '@/hooks/reader-preferences'
import { chapterQuery, passageQuery, translationsQuery } from '@/services/scripture'

/** The reader's chosen translation. Every Scripture view follows it. */
export function useTranslationId() {
  return useReaderPreferences().translationId
}

export function useTranslations() {
  return useQuery(translationsQuery())
}

/** Metadata for the active translation (falls back to the id while the list loads). */
export function useTranslation(): Pick<Translation, 'id' | 'abbreviation' | 'name' | 'attribution' | 'license'> {
  const id = useTranslationId()
  const { data } = useTranslations()
  const translation = data?.find((item) => item.id === id) ?? data?.[0]
  return translation ?? { id, abbreviation: id.toUpperCase(), name: id.toUpperCase(), attribution: '', license: '' }
}

/** The reader's route loader normally has this cached already; switching translation refetches. */
export function useChapter(bookId: BookId, chapter: number) {
  return useQuery(chapterQuery(useTranslationId(), bookId, chapter))
}

export function usePassage(reference: ScriptureReference) {
  return useQuery(passageQuery(useTranslationId(), reference))
}
