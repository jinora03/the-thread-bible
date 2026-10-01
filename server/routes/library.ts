import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import {
  createBookmarkBodySchema,
  createNoteBodySchema,
  importLibraryBodySchema,
  readingUpdateBodySchema,
  updateNoteBodySchema,
} from '@shared/schemas/library'
import type { ScriptureReference } from '@shared/types/scripture'
import type { Auth, SessionUser } from '../auth'
import { apiError, parseBody } from '../http'
import type { LibraryRepository } from '../library/library-repository'
import type { VerseIndex } from '../scripture/verse-index'

/** Request bodies are small; an import carries a whole browser library, so it may be larger. */
const limit = (maxSize: number) =>
  bodyLimit({ maxSize, onError: () => apiError(413, 'body_too_large', 'That request is too large.') })
const small = limit(64 * 1024)
const largeImport = limit(4 * 1024 * 1024)

/** A reader's own library. Every route requires a session and is scoped to its user. */
export function libraryRoutes(auth: Auth, library: LibraryRepository, verses: VerseIndex) {
  const app = new Hono<{ Variables: { user: SessionUser } }>()

  // Saved passages must exist in the Bible text, not only be well formed.
  const requireVerses = (references: ScriptureReference[]) => {
    for (const reference of references) {
      const problem = verses.problem(reference)
      if (problem) apiError(400, 'unknown_verse', problem)
    }
  }

  app.use('*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) apiError(401, 'unauthenticated', 'Sign in to sync your library.')
    c.set('user', session.user)
    c.header('Cache-Control', 'private, no-store')
    await next()
  })

  app.get('/', (c) => c.json(library.get(c.var.user.id)))

  app.post('/import', largeImport, async (c) => {
    const data = await parseBody(c, importLibraryBodySchema)
    requireVerses([...data.bookmarks, ...data.notes].map((item) => item.reference))
    return c.json(library.import(c.var.user.id, data))
  })

  app.post('/bookmarks', small, async (c) => {
    const { reference } = await parseBody(c, createBookmarkBodySchema)
    requireVerses([reference])
    return c.json(library.addBookmark(c.var.user.id, reference), 201)
  })

  app.delete('/bookmarks/:id', (c) => {
    if (!library.removeBookmark(c.var.user.id, c.req.param('id'))) apiError(404, 'not_found', 'No such bookmark.')
    return c.body(null, 204)
  })

  app.post('/notes', small, async (c) => {
    const { reference, text } = await parseBody(c, createNoteBodySchema)
    requireVerses([reference])
    return c.json(library.addNote(c.var.user.id, reference, text), 201)
  })

  app.patch('/notes/:id', small, async (c) => {
    const { text } = await parseBody(c, updateNoteBodySchema)
    const note = library.updateNote(c.var.user.id, c.req.param('id'), text)
    if (!note) apiError(404, 'not_found', 'No such note.')
    return c.json(note)
  })

  app.delete('/notes/:id', (c) => {
    if (!library.deleteNote(c.var.user.id, c.req.param('id'))) apiError(404, 'not_found', 'No such note.')
    return c.body(null, 204)
  })

  app.put('/reading', small, async (c) => c.json(library.updateReading(c.var.user.id, await parseBody(c, readingUpdateBodySchema))))

  return app
}
