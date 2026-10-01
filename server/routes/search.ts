import { Hono } from 'hono'
import { z } from 'zod'
import { apiError } from '../http'
import type { SearchService } from '../search/search-service'

const searchQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  filter: z.enum(['all', 'scripture', 'theme', 'doctrine', 'prophecy', 'study', 'people-places', 'more']).default('all'),
  testament: z.enum(['old', 'new']).optional(),
  translation: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(0).max(50).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
})

export function searchRoutes(search: SearchService) {
  const app = new Hono()

  app.get('/', async (c) => {
    const parsed = searchQuerySchema.safeParse(c.req.query())
    if (!parsed.success) apiError(400, 'invalid_query', parsed.error.issues[0]?.message ?? 'Invalid search parameters.')
    return c.json(await search.search(parsed.data))
  })

  return app
}
