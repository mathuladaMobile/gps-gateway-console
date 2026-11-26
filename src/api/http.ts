import type { APIResponse, RefreshResponse } from './types'
import { tokenStorage } from './token'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
  }
}

let onUnauthorized: () => void = () => {}
/** Called when the session can no longer be refreshed (e.g. redirect to login). */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

let onPasswordChangeRequired: () => void = () => {}
/** Called when the API answers with code PASSWORD_CHANGE_REQUIRED (e.g. redirect to change-password). */
export function setPasswordChangeRequiredHandler(handler: () => void) {
  onPasswordChangeRequired = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  /** Skip the Authorization header and 401 refresh handling. */
  public?: boolean
}

let refreshing: Promise<boolean> | null = null

async function refreshToken(): Promise<boolean> {
  const refresh_token = tokenStorage.refresh
  if (!refresh_token) return false
  refreshing ??= (async () => {
    try {
      const res = await request<APIResponse<RefreshResponse>>('/auth/refresh', {
        method: 'POST',
        body: { refresh_token },
        public: true,
      })
      tokenStorage.set(res.data.access_token, res.data.refresh_token)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

export async function request<T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (!opts.public && tokenStorage.access) headers.Authorization = `Bearer ${tokenStorage.access}`

  const res = await fetch(BASE_URL + path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (res.status === 401 && !opts.public) {
    if (!retried && (await refreshToken())) return request<T>(path, opts, true)
    tokenStorage.clear()
    onUnauthorized()
  }

  const text = await res.text()
  let json: { success?: boolean; message?: string; code?: string } | undefined
  try {
    json = text ? JSON.parse(text) : undefined
  } catch {
    // non-JSON response
  }

  if (json?.code === 'PASSWORD_CHANGE_REQUIRED') onPasswordChangeRequired()

  if (!res.ok || json?.success === false) {
    throw new ApiError(json?.message || res.statusText || 'Request failed', res.status, json?.code)
  }
  return json as T
}

/** Request an endpoint wrapped in APIResponse and return its `data`. */
export async function getData<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await request<APIResponse<T>>(path, opts)
  return res.data
}
