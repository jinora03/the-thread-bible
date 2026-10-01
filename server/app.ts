import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'
import type { ApiErrorBody } from '@shared/types/api'
import { createAuth } from './auth'
import { loadContent } from './content/loader'
import { createContentRepository } from './content/repository'
import type { AppDatabase } from './db/client'
import type { Env } from './env'
import { createLibraryRepository } from './library/library-repository'
import { contentRoutes } from './routes/content'
import { libraryRoutes } from './routes/library'
import { scriptureRoutes } from './routes/scripture'
import { searchRoutes } from './routes/search'
import { createApiBibleProvider, parseBibleList } from './scripture/api-bible-provider'
import { createLocalProvider } from './scripture/local-provider'
import type { ScriptureProvider } from './scripture/provider'
import { createScriptureRegistry } from './scripture/registry'
import { createVerseIndex } from './scripture/verse-index'
import { createSearchService } from './search/search-service'

export interface AppDependencies {
  env: Env
  database: AppDatabase
  contentRoot: string
  /** Extra Scripture providers (tests); API.Bible is added automatically when configured. */
  providers?: ScriptureProvider[]
}

/** Builds the API. Everything is injected, so tests can run it against a temporary database. */
export function createApp({ env, database, contentRoot, providers }: AppDependencies) {
  const content = createContentRepository(loadContent(contentRoot, env.CONTENT_STAGE))

  const apiBibles = parseBibleList(env.API_BIBLE_BIBLES)
  const scripture = createScriptureRegistry([
    createLocalProvider(database.sqlite),
    ...(env.API_BIBLE_KEY && apiBibles.length > 0 ? [createApiBibleProvider({ apiKey: env.API_BIBLE_KEY, bibles: apiBibles })] : []),
    ...(providers ?? []),
  ])
  const verses = createVerseIndex(database.sqlite)
  const search = createSearchService(content, scripture)
  const auth = createAuth(database.db, env)
  const library = createLibraryRepository(database.db)

  const app = new Hono()
  app.use('*', secureHeaders())

  app.get('/api/health', (c) => c.json({ ok: true, contentStage: env.CONTENT_STAGE }))
  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))
  app.route('/api/scripture', scriptureRoutes(scripture, verses))
  app.route('/api/content', contentRoutes(content))
  app.route('/api/search', searchRoutes(search))
  app.route('/api/library', libraryRoutes(auth, library, verses))

  app.notFound((c) => c.json<ApiErrorBody>({ error: { code: 'not_found', message: `No API route for ${c.req.path}` } }, 404))
  app.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse()
    console.error('[api]', error)
    return c.json<ApiErrorBody>({ error: { code: 'internal_error', message: 'Something went wrong on the server.' } }, 500)
  })

  return { app, auth, content }
}
