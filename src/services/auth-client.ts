import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth client. Talks to /api/auth on the same origin; the session is
 * an HTTP-only cookie, so no token is ever handled in JavaScript.
 */
export const authClient = createAuthClient()

export const { useSession, signIn, signUp, signOut } = authClient
