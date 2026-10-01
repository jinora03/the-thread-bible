import { Hono } from 'hono'
import {
  createBookmarkBodySchema,
  createNoteBodySchema,
  importLibraryBodySchema,
  readingUpdateBodySchema,
  updateNoteBodySchema,
} from '@shared/schemas/library'
import type { Auth, SessionUser } from '../auth'
import { apiError, parseBody } from '../http'
import type { LibraryRepository } from '../library/library-repository'

/** A reader's own library. Every route requires a session and is scoped to its user. */
export function libraryRoutes(auth: Auth, library: LibraryRepository) {
  const app = new Hono<{ Variables: { user: SessionUser } }>()

  app.use('*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) apiError(401, 'unauthenticated', 'Sign in to sync your library.')
    c.set('user', session.user)
    c.header('Cache-Control', 'private, no-store')
    await next()
  })

  app.get('/', (c) => c.json(library.get(c.var.user.id)))

  app.post('/import', async (c) => c.json(library.import(c.var.user.id, await parseBody(c, importLibraryBodySchema))))

  app.post('/bookmarks', async (c) => {
    const { reference } = await parseBody(c, createBookmarkBodySchema)
    return c.json(library.addBookmark(c.var.user.id, reference), 201)
  })

  app.delete('/bookmarks/:id', (c) => {
    if (!library.removeBookmark(c.var.user.id, c.req.param('id'))) apiError(404, 'not_found', 'No such bookmark.')
    return c.body(null, 204)
  })

  app.post('/notes', async (c) => {
    const { reference, text } = await parseBody(c, createNoteBodySchema)
    return c.json(library.addNote(c.var.user.id, reference, text), 201)
  })

  app.patch('/notes/:id', async (c) => {
    const { text } = await parseBody(c, updateNoteBodySchema)
    const note = library.updateNote(c.var.user.id, c.req.param('id'), text)
    if (!note) apiError(404, 'not_found', 'No such note.')
    return c.json(note)
  })

  app.delete('/notes/:id', (c) => {
    if (!library.deleteNote(c.var.user.id, c.req.param('id'))) apiError(404, 'not_found', 'No such note.')
    return c.body(null, 204)
  })

  app.put('/reading', async (c) => c.json(library.updateReading(c.var.user.id, await parseBody(c, readingUpdateBodySchema))))

  return app
}
