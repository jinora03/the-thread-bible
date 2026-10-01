import { describe, expect, it, vi } from 'vitest'
import { createApiBibleProvider, parseApiBibleContent, parseBibleList } from './api-bible-provider'

// A trimmed "Scripture JSON" chapter in the shape API.Bible returns
// (content-type=json, include-titles=true, include-verse-numbers=true).
const text = (verseId: string, value: string) => ({ type: 'text' as const, text: value, attrs: { verseId } })
const verseMarker = (number: string) => ({ name: 'verse', type: 'tag' as const, attrs: { number, style: 'v' }, items: [{ type: 'text' as const, text: number }] })

const psalm23 = [
  { name: 'para', type: 'tag' as const, attrs: { style: 's1' }, items: [{ type: 'text' as const, text: 'The Lord Is My Shepherd' }] },
  { name: 'para', type: 'tag' as const, attrs: { style: 'd' }, items: [{ type: 'text' as const, text: 'A Psalm of David.' }] },
  {
    name: 'para',
    type: 'tag' as const,
    attrs: { style: 'q1' },
    items: [
      verseMarker('1'),
      text('PSA.23.1', 'The '),
      { name: 'char', type: 'tag' as const, attrs: { style: 'nd' }, items: [text('PSA.23.1', 'Lord')] },
      text('PSA.23.1', ' is my shepherd;'),
    ],
  },
  { name: 'para', type: 'tag' as const, attrs: { style: 'q2' }, items: [text('PSA.23.1', 'I shall not want.')] },
  { name: 'para', type: 'tag' as const, attrs: { style: 'q1' }, items: [verseMarker('2'), text('PSA.23.2', 'He makes me lie down in green pastures;')] },
]

describe('parseApiBibleContent', () => {
  it('builds verses with headings, titles, poetry and the divine name', () => {
    expect(parseApiBibleContent(psalm23)).toEqual([
      {
        number: 1,
        text: 'The LORD is my shepherd;\n\tI shall not want.',
        heading: 'The Lord Is My Shepherd',
        superscription: 'A Psalm of David.',
        paragraph: true,
        poetry: true,
      },
      { number: 2, text: 'He makes me lie down in green pastures;', paragraph: true, poetry: true },
    ])
  })
})

describe('parseBibleList', () => {
  it('reads id:bibleId pairs and ignores malformed entries', () => {
    expect(parseBibleList('WEB:9879dbb7cfe39e4d-01, bad, :x, niv:78a9f6124f344018-01')).toEqual([
      { id: 'web', bibleId: '9879dbb7cfe39e4d-01' },
      { id: 'niv', bibleId: '78a9f6124f344018-01' },
    ])
    expect(parseBibleList(undefined)).toEqual([])
  })
})

describe('createApiBibleProvider', () => {
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })

  const setup = () => {
    const fetch = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
      const path = String(url)
      if (path.endsWith('/bibles/abc')) return json({ data: { name: 'Test Bible', abbreviation: 'TB', language: { id: 'eng' } } })
      if (path.includes('/chapters/PSA.23')) return json({ data: { content: psalm23, copyright: '© Test Publisher' } })
      if (path.includes('/search')) return json({ data: { total: 1, verses: [{ id: 'PSA.23.1', text: 'The LORD is my shepherd' }] } })
      return new Response('not found', { status: 404 })
    })
    const provider = createApiBibleProvider({ apiKey: 'test-key', bibles: [{ id: 'tb', bibleId: 'abc' }], fetch })
    return { fetch, provider }
  }

  it('sends the key and maps the translation list', async () => {
    const { fetch, provider } = setup()
    const [translation] = await provider.translations()
    expect(translation).toMatchObject({ id: 'tb', name: 'Test Bible', abbreviation: 'TB', source: 'api-bible' })
    expect(fetch.mock.calls[0]![1]).toEqual({ headers: { 'api-key': 'test-key' } })
  })

  it('fetches chapters by USFM code, keeps the copyright line and caches', async () => {
    const { fetch, provider } = setup()
    const chapter = await provider.getChapter('tb', 'psalms', 23)
    expect(chapter).toMatchObject({ translationId: 'tb', bookId: 'psalms', chapter: 23, copyright: '© Test Publisher' })
    expect(chapter!.verses).toHaveLength(2)
    await provider.getChapter('tb', 'psalms', 23)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null for translations it does not serve', async () => {
    const { fetch, provider } = setup()
    expect(await provider.getChapter('kjv', 'psalms', 23)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps search hits to references with highlighted terms', async () => {
    const { provider } = setup()
    const result = await provider.searchVerses('tb', 'shepherd', { limit: 10, offset: 0 })
    expect(result.total).toBe(1)
    expect(result.hits[0]!.reference).toEqual({ book: 'psalms', chapter: 23, verse: 1 })
    expect(result.hits[0]!.snippet).toContainEqual({ text: 'shepherd', match: true })
  })
})
