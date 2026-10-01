import { getBook } from '@shared/scripture/books'
import { referenceIncludesVerse } from '@shared/scripture/reference'
import type { BookId, Chapter, Passage, ScriptureReference, Translation } from '@shared/types/scripture'
import type { ScriptureProvider, VerseSearchOptions, VerseSearchResult } from './provider'

export const DEFAULT_TRANSLATION_ID = 'kjv'

/** Every configured provider behind one translation list. */
export function createScriptureRegistry(providers: ScriptureProvider[]) {
  let routing: Promise<Map<string, { translation: Translation; provider: ScriptureProvider }>> | undefined

  const route = () =>
    (routing ??= Promise.all(
      providers.map(async (provider) => (await provider.translations()).map((translation) => ({ translation, provider }))),
    ).then((lists) => new Map(lists.flat().map((entry) => [entry.translation.id, entry]))))

  const providerFor = async (translationId: string) => (await route()).get(translationId)

  return {
    async translations(): Promise<Translation[]> {
      return [...(await route()).values()].map((entry) => entry.translation)
    },

    async translation(translationId: string): Promise<Translation | undefined> {
      return (await providerFor(translationId))?.translation
    },

    async getChapter(translationId: string, bookId: BookId, chapter: number): Promise<Chapter | null> {
      const book = getBook(bookId)
      if (!book || chapter < 1 || chapter > book.chapterCount) return null
      const entry = await providerFor(translationId)
      return entry ? entry.provider.getChapter(translationId, bookId, chapter) : null
    },

    async getPassage(translationId: string, reference: ScriptureReference): Promise<Passage | null> {
      const lastChapter = reference.endChapter ?? reference.chapter
      const segments: Passage['segments'] = []
      let copyright: string | undefined
      for (let chapter = reference.chapter; chapter <= lastChapter; chapter++) {
        const data = await this.getChapter(translationId, reference.book, chapter)
        if (!data) continue
        copyright ??= data.copyright
        const verses = data.verses.filter((verse) => referenceIncludesVerse(reference, reference.book, chapter, verse.number))
        if (verses.length > 0) segments.push({ chapter, verses })
      }
      return segments.length > 0 ? { reference, translationId, segments, copyright } : null
    },

    async searchVerses(translationId: string, query: string, options: VerseSearchOptions): Promise<VerseSearchResult> {
      const entry = await providerFor(translationId)
      if (!entry?.translation.searchable) return { total: 0, hits: [] }
      return entry.provider.searchVerses(translationId, query, options)
    },
  }
}

export type ScriptureRegistry = ReturnType<typeof createScriptureRegistry>
