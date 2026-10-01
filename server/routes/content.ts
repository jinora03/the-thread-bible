import { Hono } from 'hono'
import { entityKinds } from '@shared/schemas/common'
import type { EntityId, EntityKind } from '@shared/types/content'
import type { ContentRepository } from '../content/repository'
import { apiError } from '../http'

const isKind = (value: string): value is EntityKind => (entityKinds as readonly string[]).includes(value)

export function contentRoutes(content: ContentRepository) {
  const app = new Hono()

  app.get('/home', (c) => c.json(content.home()))
  app.get('/explore', (c) => c.json(content.explore()))
  app.get('/chapter-notes', (c) => c.json(content.chapterNotesIndex()))

  app.get('/chapters/:book/:chapter', (c) => c.json(content.getChapterStudy(c.req.param('book'), Number(c.req.param('chapter')))))

  /** Batch summaries for links: ?ids=theme:covenant,doctrine:resurrection */
  app.get('/summaries', (c) => {
    const ids = (c.req.query('ids') ?? '').split(',').filter(Boolean).slice(0, 100) as EntityId[]
    return c.json(content.summaries(ids))
  })

  app.get('/entities/:kind', (c) => {
    const kind = c.req.param('kind')
    if (!isKind(kind)) apiError(404, 'unknown_kind', `"${kind}" is not a kind of library entry.`)
    return c.json(content.listCollection(kind))
  })

  app.get('/entities/:kind/:slug', (c) => {
    const { kind, slug } = c.req.param()
    if (!isKind(kind)) apiError(404, 'unknown_kind', `"${kind}" is not a kind of library entry.`)
    const response = content.getEntity(kind, slug)
    if (!response) apiError(404, 'entity_not_found', `No ${kind} called "${slug}".`)
    return c.json(response)
  })

  return app
}
