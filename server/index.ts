import { readFileSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app'
import { createDatabase } from './db/client'
import { loadEnv } from './env'
import { paths } from './paths'

const env = loadEnv()
const database = createDatabase(env.DATABASE_PATH)
const { app } = createApp({ env, database, contentRoot: paths.content })

// In production the same process serves the built frontend (SPA fallback to index.html).
if (env.NODE_ENV === 'production') {
  const indexHtml = readFileSync(`${paths.dist}/index.html`, 'utf8')
  app.use('/assets/*', serveStatic({ root: './dist', onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=31536000, immutable') }))
  app.use('*', serveStatic({ root: './dist' }))
  app.get('*', (c) => c.html(indexHtml))
}

// In development PORT belongs to the Vite dev server; the API always uses API_PORT.
const port = env.NODE_ENV === 'production' ? (env.PORT ?? env.API_PORT) : env.API_PORT

const server = serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`▸ API ready on http://localhost:${port}  (content: ${env.CONTENT_STAGE})`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code !== 'EADDRINUSE') throw error
  console.error(
    `✗ Port ${port} is already in use, probably by another \`npm run dev\` that is still running.\n` +
      `  Stop it (Ctrl+C in its terminal), or set API_PORT in .env to use a different port.`,
  )
  process.exit(1)
})

const shutdown = () => {
  server.close()
  database.sqlite.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
