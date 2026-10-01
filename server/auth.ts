import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import type { DrizzleDb } from './db/client'
import { account, session, user, verification } from './db/schema'
import type { Env } from './env'

/**
 * Email + password accounts with secure, HTTP-only session cookies.
 * Passwords are hashed by Better Auth (scrypt); nothing sensitive reaches the client.
 */
export function createAuth(db: DrizzleDb, env: Env) {
  return betterAuth({
    appName: 'The Thread Bible',
    baseURL: env.PUBLIC_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.PUBLIC_URL],
    database: drizzleAdapter(db, { provider: 'sqlite', schema: { user, session, account, verification } }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh the expiry at most daily
    },
    rateLimit: { enabled: env.NODE_ENV === 'production', window: 60, max: 30 },
    advanced: { useSecureCookies: env.PUBLIC_URL.startsWith('https://') },
  })
}

export type Auth = ReturnType<typeof createAuth>
export type SessionUser = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>['user']
