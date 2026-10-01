import { join } from 'node:path'
import { z } from 'zod'
import { paths } from './paths'

// Load .env if present (Node's built-in loader; no dotenv dependency).
try {
  process.loadEnvFile()
} catch {
  // No .env file: defaults and real environment variables apply.
}

const isProduction = process.env.NODE_ENV === 'production'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Port assigned by the hosting platform (production only; dev tools set PORT for Vite). */
  PORT: z.coerce.number().int().positive().optional(),
  /** The API's own port in development; Vite proxies /api here. */
  API_PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_PATH: z.string().default(join(paths.dataDir, 'thread-bible.db')),
  /** Public origin the browser uses (the Vite dev server in development). */
  PUBLIC_URL: z.url().default('http://localhost:5173'),
  BETTER_AUTH_SECRET: isProduction
    ? z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters in production')
    : z.string().min(32).default('development-only-secret-not-for-production-use-0000'),
  /** `published` serves only reviewed content; `preview` also serves drafts and content in review. */
  CONTENT_STAGE: z.enum(['preview', 'published']).default(isProduction ? 'published' : 'preview'),
  /** Optional: enables licensed translations through API.Bible. */
  API_BIBLE_KEY: z.string().optional(),
  /** Comma-separated `id:bibleId` pairs, e.g. `web:9879dbb7cfe39e4d-01`. */
  API_BIBLE_BIBLES: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(overrides: Partial<Record<keyof Env, string>> = {}): Env {
  const parsed = envSchema.safeParse({ ...process.env, ...overrides })
  if (!parsed.success) {
    console.error('Invalid server configuration:', z.prettifyError(parsed.error))
    process.exit(1)
  }
  return parsed.data
}
