import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { z } from 'zod'
import type { ApiErrorBody } from '@shared/types/api'

/** Consistent JSON error responses: `{ error: { code, message } }`. */
export function apiError(status: ContentfulStatusCode, code: string, message: string): never {
  const body: ApiErrorBody = { error: { code, message } }
  throw new HTTPException(status, { res: Response.json(body, { status }) })
}

/** Parses and validates a JSON body, answering 400 with the first problem. */
export async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    apiError(400, 'invalid_json', 'The request body must be JSON.')
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    apiError(400, 'invalid_body', `${issue?.path.join('.') || 'body'}: ${issue?.message ?? 'invalid'}`)
  }
  return result.data
}
