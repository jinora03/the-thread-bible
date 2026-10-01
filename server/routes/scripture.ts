import { Hono } from 'hono'
import { getBook } from '@shared/scripture/books'
import { parseReference } from '@shared/scripture/reference'
import { apiError } from '../http'
import type { ScriptureRegistry } from '../scripture/registry'

// Scripture text never changes; let browsers and proxies cache it.
const IMMUTABLE = 'public, max-age=86400, stale-while-revalidate=604800'

export function scriptureRoutes(scripture: ScriptureRegistry) {
  const app = new Hono()

  app.get('/translations', async (c) => c.json(await scripture.translations()))

  app.get('/:translation/passage', async (c) => {
    const reference = parseReference(c.req.query('ref') ?? '')
    if (!reference) apiError(400, 'invalid_reference', 'Pass a reference such as ?ref=Isaiah 53:4-6')
    if (!(await scripture.translation(c.req.param('translation')))) apiError(404, 'unknown_translation', 'No such translation.')
    const passage = await scripture.getPassage(c.req.param('translation'), reference)
    if (!passage) apiError(404, 'passage_not_found', 'None of the requested verses are available in this translation.')
    c.header('Cache-Control', IMMUTABLE)
    return c.json(passage)
  })

  app.get('/:translation/:book/:chapter', async (c) => {
    const { translation, book: bookId, chapter: chapterParam } = c.req.param()
    const book = getBook(bookId)
    const chapter = Number(chapterParam)
    if (!book) apiError(404, 'unknown_book', `"${bookId}" is not a book of the Bible.`)
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) {
      apiError(404, 'chapter_out_of_range', `${book.name} has ${book.chapterCount} chapters.`)
    }
    if (!(await scripture.translation(translation))) apiError(404, 'unknown_translation', 'No such translation.')
    const data = await scripture.getChapter(translation, bookId, chapter)
    if (!data) apiError(404, 'chapter_not_available', `${book.name} ${chapter} is not available in this translation.`)
    c.header('Cache-Control', IMMUTABLE)
    return c.json(data)
  })

  return app
}
