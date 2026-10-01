import { getBook, getBookByUsfm } from '@shared/scripture/books'
import type { Chapter, Translation, Verse } from '@shared/types/scripture'
import { highlightTerms } from '../search/fts'
import type { ScriptureProvider } from './provider'

// API.Bible adapter (https://scripture.api.bible). Licensed translations come
// with their own terms: display the returned copyright line, respect caching
// limits, and implement FUMS reporting before using this in production.

const BASE_URL = 'https://api.scripture.api.bible/v1'

export interface ApiBibleConfig {
  apiKey: string
  /** Our translation id → API.Bible bible id. */
  bibles: { id: string; bibleId: string }[]
  fetch?: typeof fetch
}

/** Parses `API_BIBLE_BIBLES="web:9879dbb7cfe39e4d-01,…"`. */
export function parseBibleList(value: string | undefined): ApiBibleConfig['bibles'] {
  return (value ?? '')
    .split(',')
    .map((pair) => pair.trim().split(':'))
    .filter((parts): parts is [string, string] => parts.length === 2 && Boolean(parts[0]) && Boolean(parts[1]))
    .map(([id, bibleId]) => ({ id: id.toLowerCase(), bibleId }))
}

// --- Scripture JSON content ---------------------------------------------------

interface ContentNode {
  name?: string
  type?: 'tag' | 'text'
  text?: string
  attrs?: { style?: string; number?: string; verseId?: string }
  items?: ContentNode[]
}

const headingStyles = /^(s\d?|ms\d?|sp)$/
const poetryStyles = /^q\d?$/

/**
 * Converts API.Bible "Scripture JSON" chapter content into our verse model:
 * text nodes carry a `verseId` (e.g. "GEN.1.3"); paragraph styles mark
 * paragraphs, headings (s1…), psalm titles (d) and poetic lines (q1, q2).
 */
export function parseApiBibleContent(content: ContentNode[]): Verse[] {
  const verses = new Map<number, Verse>()
  let pendingHeading: string | undefined
  let pendingSuperscription: string | undefined

  const verseFor = (verseId: string) => {
    const number = Number(verseId.split('.').at(-1))
    let verse = verses.get(number)
    if (!verse) {
      verse = { number, text: '' }
      if (pendingHeading) verse.heading = pendingHeading
      if (pendingSuperscription) verse.superscription = pendingSuperscription
      pendingHeading = undefined
      pendingSuperscription = undefined
      verses.set(number, verse)
    }
    return verse
  }

  const collectText = (node: ContentNode): string =>
    node.type === 'text' ? (node.text ?? '') : (node.items ?? []).map(collectText).join('')

  const walk = (node: ContentNode, uppercase: boolean) => {
    if (node.type === 'text' && node.attrs?.verseId) {
      const verse = verseFor(node.attrs.verseId)
      const text = uppercase ? (node.text ?? '').toUpperCase() : (node.text ?? '')
      verse.text += text
      return
    }
    if (node.name === 'verse') return // the verse-number marker itself
    const isDivineName = node.name === 'char' && node.attrs?.style === 'nd'
    for (const child of node.items ?? []) walk(child, uppercase || isDivineName)
  }

  for (const block of content) {
    const style = block.attrs?.style ?? ''
    if (headingStyles.test(style)) {
      pendingHeading = collectText(block).trim()
      continue
    }
    if (style === 'd') {
      pendingSuperscription = collectText(block).trim()
      continue
    }
    const before = new Set(verses.keys())
    // Mark the line break before walking, so the break lands before this line's text.
    const lastVerse = [...verses.values()].at(-1)
    if (poetryStyles.test(style) && lastVerse && lastVerse.text.trim()) {
      const firstId = findFirstVerseId(block)
      if (firstId && Number(firstId.split('.').at(-1)) === lastVerse.number) {
        lastVerse.text += style === 'q2' ? '\n\t' : '\n'
        lastVerse.poetry = true
      }
    }
    walk(block, false)
    const started = [...verses.keys()].filter((number) => !before.has(number))
    const first = started[0] !== undefined ? verses.get(started[0]) : undefined
    if (first && style !== 'nb') first.paragraph = true
    if (poetryStyles.test(style)) for (const number of started) verses.get(number)!.poetry = true
  }

  return [...verses.values()]
    .map((verse) => ({ ...verse, text: verse.text.replace(/[  ]{2,}/g, ' ').replace(/ ?\n ?/g, '\n').trim() }))
    .filter((verse) => verse.text.length > 0)
    .sort((a, b) => a.number - b.number)
}

function findFirstVerseId(node: ContentNode): string | undefined {
  if (node.type === 'text' && node.attrs?.verseId) return node.attrs.verseId
  for (const child of node.items ?? []) {
    const found = findFirstVerseId(child)
    if (found) return found
  }
  return undefined
}

// --- Provider -------------------------------------------------------------------

export function createApiBibleProvider(config: ApiBibleConfig): ScriptureProvider {
  const request = config.fetch ?? fetch
  const byId = new Map(config.bibles.map((bible) => [bible.id, bible.bibleId]))
  const chapterCache = new Map<string, Chapter>()
  let translationList: Promise<Translation[]> | undefined

  const get = async <T>(path: string): Promise<T> => {
    const response = await request(`${BASE_URL}${path}`, { headers: { 'api-key': config.apiKey } })
    if (!response.ok) throw new Error(`API.Bible request failed (${response.status}) for ${path}`)
    return (await response.json()) as T
  }

  const loadTranslations = async () => {
    const results = await Promise.allSettled(
      config.bibles.map(async ({ id, bibleId }): Promise<Translation> => {
        const { data } = await get<{ data: { name: string; abbreviationLocal?: string; abbreviation: string; language?: { id: string } } }>(
          `/bibles/${bibleId}`,
        )
        return {
          id,
          name: data.name,
          abbreviation: data.abbreviationLocal ?? data.abbreviation,
          language: data.language?.id ?? 'en',
          license: 'Licensed through API.Bible',
          attribution: `${data.name}, provided through API.Bible. See the copyright notice shown with each passage.`,
          source: 'api-bible',
          searchable: true,
        }
      }),
    )
    for (const result of results) if (result.status === 'rejected') console.warn('[api-bible]', result.reason)
    return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
  }

  return {
    translations: () => (translationList ??= loadTranslations()),

    async getChapter(translationId, bookId, chapter) {
      const bibleId = byId.get(translationId)
      const book = getBook(bookId)
      if (!bibleId || !book) return null
      const cacheKey = `${translationId}/${bookId}/${chapter}`
      const cached = chapterCache.get(cacheKey)
      if (cached) return cached

      const { data } = await get<{ data: { content: ContentNode[]; copyright?: string } }>(
        `/bibles/${bibleId}/chapters/${book.usfm}.${chapter}?content-type=json&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`,
      )
      const result: Chapter = { translationId, bookId, chapter, verses: parseApiBibleContent(data.content), copyright: data.copyright }
      // A small in-memory cache; check the publisher's terms before caching more.
      if (chapterCache.size > 200) chapterCache.delete(chapterCache.keys().next().value!)
      chapterCache.set(cacheKey, result)
      return result
    },

    async searchVerses(translationId, query, { limit, offset }) {
      const bibleId = byId.get(translationId)
      if (!bibleId || !query.trim()) return { total: 0, hits: [] }
      const { data } = await get<{ data: { total: number; verses?: { id: string; text: string }[] } }>(
        `/bibles/${bibleId}/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&sort=relevance`,
      )
      return {
        total: data.total,
        hits: (data.verses ?? []).flatMap((verse) => {
          const [code = '', chapter, number] = verse.id.split('.')
          const book = getBookByUsfm(code)
          if (!book) return []
          return [{ reference: { book: book.id, chapter: Number(chapter), verse: Number(number) }, snippet: highlightTerms(verse.text, query) }]
        }),
      }
    },
  }
}
