import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { formatReference } from '@shared/scripture/reference'
import type { ApiErrorBody, EntityResponse } from '@shared/types/api'
import type { LibraryData } from '@shared/types/library'
import type { Chapter, Passage, Translation } from '@shared/types/scripture'
import type { SearchResponse } from '@shared/types/search'
import { createApp } from './app'
import { createDatabase } from './db/client'
import { loadEnv } from './env'
import { paths } from './paths'
import { importUsfmBooks, rebuildSearchIndex } from './scripture/import'

// A few chapters of KJV, imported through the same code path as the real sources.
const fixtures = [
  String.raw`\id JHN
\c 1
\p
\v 1 In the beginning was the Word, and the Word was with God, and the Word was God.
\p
\v 29 The next day John seeth Jesus coming unto him, and saith, Behold the Lamb of God, which taketh away the sin of the world.
\v 36 And looking upon Jesus as he walked, he saith, Behold the Lamb of God!`,
  String.raw`\id 1CO
\c 15
\p
\v 3 For I delivered unto you first of all that which I also received, how that Christ died for our sins according to the scriptures;
\v 4 And that he was buried, and that he rose again the third day according to the scriptures:
\p
\v 20 But now is Christ risen from the dead, \add and\add* become the firstfruits of them that slept.`,
]

const origin = 'http://localhost:5173'
const env = loadEnv({ NODE_ENV: 'test', DATABASE_PATH: ':memory:', CONTENT_STAGE: 'preview', PUBLIC_URL: origin, API_BIBLE_KEY: '' })
const database = createDatabase(':memory:')
importUsfmBooks(database.sqlite, 'kjv', fixtures)
rebuildSearchIndex(database.sqlite)
const { app } = createApp({ env, database, contentRoot: paths.content })

const request = (path: string, init?: RequestInit) => app.request(`${origin}${path}`, init)
const getJson = async <T>(path: string, init?: RequestInit) => {
  const response = await request(path, init)
  return { status: response.status, body: (await response.json()) as T }
}
const errorCode = async (path: string) => {
  const { status, body } = await getJson<ApiErrorBody>(path)
  return { status, code: body.error.code }
}

afterAll(() => database.sqlite.close())

describe('scripture', () => {
  it('lists only imported translations', async () => {
    const { body } = await getJson<Translation[]>('/api/scripture/translations')
    expect(body.map((translation) => translation.id)).toEqual(['kjv'])
  })

  it('serves a chapter', async () => {
    const { status, body } = await getJson<Chapter>('/api/scripture/kjv/1-corinthians/15')
    expect(status).toBe(200)
    expect(body.verses.map((verse) => verse.number)).toEqual([3, 4, 20])
    expect(body.verses[2]!.text).toBe('But now is Christ risen from the dead, and become the firstfruits of them that slept.')
  })

  it('serves passages for references the client formats', async () => {
    const reference = { book: '1-corinthians', chapter: 15, verse: 3, endVerse: 4 }
    const { status, body } = await getJson<Passage>(`/api/scripture/kjv/passage?ref=${encodeURIComponent(formatReference(reference))}`)
    expect(status).toBe(200)
    expect(body.segments[0]!.verses.map((verse) => verse.number)).toEqual([3, 4])
  })

  it.each([
    ['/api/scripture/kjv/hezekiah/1', 404, 'unknown_book'],
    ['/api/scripture/kjv/john/22', 404, 'chapter_out_of_range'],
    ['/api/scripture/kjv/genesis/1', 404, 'chapter_not_available'],
    ['/api/scripture/xyz/john/1', 404, 'unknown_translation'],
    ['/api/scripture/kjv/passage?ref=nonsense', 400, 'invalid_reference'],
    ['/api/scripture/kjv/passage?ref=John%201%3A37', 400, 'invalid_reference'],
    ['/api/scripture/kjv/passage?ref=John%203-4%3A5', 400, 'invalid_reference'],
    ['/api/nowhere', 404, 'not_found'],
  ])('%s → %i %s', async (path, status, code) => {
    expect(await errorCode(path)).toEqual({ status, code })
  })
})

describe('content', () => {
  it('serves an entity with summaries of everything it links to', async () => {
    const { status, body } = await getJson<EntityResponse>('/api/content/entities/doctrine/resurrection')
    expect(status).toBe(200)
    expect(body.entity.title).toBe('The Resurrection')
    const relatedIds = new Set(body.related.map((summary) => summary.id))
    for (const id of body.entity.relatedIds ?? []) expect(relatedIds.has(id)).toBe(true)
  })

  it('404s unknown entries with a specific code', async () => {
    expect(await errorCode('/api/content/entities/doctrine/predestination')).toEqual({ status: 404, code: 'entity_not_found' })
    expect(await errorCode('/api/content/entities/dragon/smaug')).toEqual({ status: 404, code: 'unknown_kind' })
  })
})

describe('search', () => {
  it('finds verses with highlighted matches, best match first', async () => {
    const { body } = await getJson<SearchResponse>('/api/search?q=lamb%20of%20god&translation=kjv')
    const verses = body.groups.find((group) => group.id === 'scripture')!
    expect(verses.total).toBe(2)
    const [first] = verses.hits
    expect(first).toMatchObject({ type: 'verse', reference: { book: 'john', chapter: 1, verse: 36 } })
    if (first?.type !== 'verse') throw new Error('expected a verse hit')
    expect(first.snippet.filter((segment) => segment.match).map((segment) => segment.text.toLowerCase())).toEqual(['lamb', 'god'])
  })

  it('recognizes references and finds editorial content', async () => {
    const { body } = await getJson<SearchResponse>('/api/search?q=1%20cor%2015:20')
    expect(body.groups[0]).toMatchObject({ id: 'reference', hits: [{ type: 'reference', reference: { book: '1-corinthians', chapter: 15, verse: 20 } }] })

    const topical = await getJson<SearchResponse>('/api/search?q=resurrection')
    expect(topical.body.facets.doctrine).toBeGreaterThan(0)
  })

  it('rejects invalid parameters', async () => {
    expect(await errorCode('/api/search?q=x&filter=everything')).toEqual({ status: 400, code: 'invalid_query' })
  })
})

describe('accounts and library', () => {
  let cookie = ''
  const authed = (init: RequestInit = {}): RequestInit => ({
    ...init,
    headers: { cookie, origin, 'content-type': 'application/json', ...init.headers },
  })

  beforeAll(async () => {
    const response = await request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Reader', email: `reader-${randomUUID()}@example.test`, password: randomUUID() }),
    })
    expect(response.status).toBe(200)
    cookie = response.headers
      .getSetCookie()
      .map((line) => line.split(';')[0])
      .join('; ')
  })

  it('requires a session', async () => {
    expect(await errorCode('/api/library')).toEqual({ status: 401, code: 'unauthenticated' })
  })

  it('stores bookmarks idempotently and scopes them to the reader', async () => {
    const bookmark = { reference: { book: 'john', chapter: 1, verse: 29 } }
    const first = await request('/api/library/bookmarks', authed({ method: 'POST', body: JSON.stringify(bookmark) }))
    const second = await request('/api/library/bookmarks', authed({ method: 'POST', body: JSON.stringify(bookmark) }))
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)

    const { body } = await getJson<LibraryData>('/api/library', authed())
    expect(body.bookmarks).toHaveLength(1)
    expect(body.bookmarks[0]!.reference).toEqual(bookmark.reference)
  })

  it('validates notes with the same rule as the form', async () => {
    const note = (text: string) =>
      request('/api/library/notes', authed({ method: 'POST', body: JSON.stringify({ reference: { book: 'john', chapter: 1, verse: 1 }, text }) }))
    expect((await note('   ')).status).toBe(400)
    expect((await note('x'.repeat(2001))).status).toBe(400)

    const created = await note('In the beginning: compare Genesis 1:1.')
    expect(created.status).toBe(201)
    const { id } = (await created.json()) as { id: string }
    expect((await request(`/api/library/notes/${id}`, authed({ method: 'DELETE' }))).status).toBe(204)
    expect((await request(`/api/library/notes/${id}`, authed({ method: 'DELETE' }))).status).toBe(404)
  })

  it('rejects passages that are not in the text', async () => {
    const save = (reference: unknown) => request('/api/library/bookmarks', authed({ method: 'POST', body: JSON.stringify({ reference }) }))
    // The fixture's John 1 ends at verse 36.
    const pastTheEnd = await save({ book: 'john', chapter: 1, verse: 40 })
    expect(pastTheEnd.status).toBe(400)
    expect(((await pastTheEnd.json()) as ApiErrorBody).error.code).toBe('unknown_verse')
    expect((await save({ book: 'hezekiah', chapter: 1 })).status).toBe(400)
    expect((await save({ book: 'john', chapter: 1, verse: 0 })).status).toBe(400)
    expect((await save({ book: 'john', chapter: 1, verse: 30, endVerse: 29 })).status).toBe(400)
  })

  it('rejects reading progress for chapters that do not exist', async () => {
    const put = (lastRead: unknown) => request('/api/library/reading', authed({ method: 'PUT', body: JSON.stringify({ lastRead }) }))
    expect((await put({ bookId: 'nowhere', chapter: 1 })).status).toBe(400)
    expect((await put({ bookId: 'john', chapter: 22 })).status).toBe(400)
  })

  describe('import validation', () => {
    const at = '2026-10-01T00:00:00.000Z'
    const note = (overrides: Record<string, unknown> = {}) => ({
      id: randomUUID(),
      reference: { book: 'john', chapter: 1, verse: 29 },
      text: 'Behold the Lamb',
      createdAt: at,
      updatedAt: at,
      ...overrides,
    })
    const library = (overrides: Record<string, unknown> = {}) => ({ bookmarks: [], notes: [], reading: { lastRead: null, lastStudy: null }, ...overrides })
    const importing = (body: unknown) => request('/api/library/import', authed({ method: 'POST', body: JSON.stringify(body) }))

    it.each([
      ['an over-long note', library({ notes: [note({ text: 'x'.repeat(2001) })] })],
      ['an empty note', library({ notes: [note({ text: '   ' })] })],
      ['an unreadable timestamp', library({ notes: [note({ createdAt: 'last Tuesday' })] })],
      ['a note on a verse that does not exist', library({ notes: [note({ reference: { book: 'john', chapter: 1, verse: 99 } })] })],
      ['a study id of the wrong kind', library({ reading: { lastRead: null, lastStudy: { studyId: 'theme:faith', sectionId: 'intro', updatedAt: at } } })],
      ['more notes than an account holds', library({ notes: Array.from({ length: 1001 }, () => note()) })],
    ])('rejects %s', async (_case, body) => {
      expect((await importing(body)).status).toBe(400)
    })

    it('rejects a body over the size limit', async () => {
      const response = await importing({ padding: 'x'.repeat(4 * 1024 * 1024 + 1) })
      expect(response.status).toBe(413)
    })

    it('accepts a valid library', async () => {
      const response = await importing(library({ notes: [note({ text: 'Imported note' })] }))
      expect(response.status).toBe(200)
      expect(((await response.json()) as LibraryData).notes.map((saved) => saved.text)).toContain('Imported note')
    })
  })

  it('records reading progress', async () => {
    const response = await request('/api/library/reading', authed({ method: 'PUT', body: JSON.stringify({ lastRead: { bookId: 'john', chapter: 1 } }) }))
    expect(response.status).toBe(200)
    const { body } = await getJson<LibraryData>('/api/library', authed())
    expect(body.reading.lastRead).toMatchObject({ bookId: 'john', chapter: 1 })
  })
})
