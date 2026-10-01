import type { ApiErrorBody } from '@shared/types/api'

/** An API failure with the server's error code, so UI can respond specifically. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type Query = Record<string, string | number | undefined | null>

function url(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return `/api${path}${search ? `?${search}` : ''}`
}

async function request<T>(method: string, path: string, options: { query?: Query; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(url(path, options.query), {
      method,
      signal: options.signal,
      credentials: 'same-origin',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new ApiError(0, 'network_error', 'The server could not be reached. Check your connection and try again.')
  }

  if (response.status === 204) return undefined as T
  const body = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error
    throw new ApiError(response.status, error?.code ?? 'http_error', error?.message ?? `Request failed (${response.status}).`)
  }
  return body as T
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404
