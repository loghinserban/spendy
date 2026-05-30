import { readStoredToken } from './authStorage'

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '')

const getEnvValue = (...keys: Array<'VITE_API_URL' | 'VITE_API_BASE_URL'>): string => {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined

  for (const key of keys) {
    const value = env?.[key]

    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return ''
}

export const getApiBaseUrl = (): string => {
  const value = getEnvValue('VITE_API_URL', 'VITE_API_BASE_URL')

  if (value) {
    return normalizeBaseUrl(value)
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin)
  }

  return ''
}

const resolveApiUrl = (path: string): string => `${getApiBaseUrl()}${path}`

const parseErrorMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

const buildHeaders = (headers?: HeadersInit): Headers => {
  const nextHeaders = new Headers(headers)
  nextHeaders.set('Content-Type', 'application/json')

  const token = readStoredToken()
  if (token) {
    nextHeaders.set('Authorization', `Bearer ${token}`)
  }

  return nextHeaders
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    // Make sure browser will send/receive secure HttpOnly cookies used by the backend
    credentials: 'include',
    ...init,
    headers: buildHeaders(init.headers),
  })

  const contentType = response.headers?.get?.('content-type') ?? ''
  let payload: unknown = null

  if (response.status !== 204) {
    try {
      if (typeof response.json === 'function' && (contentType.includes('application/json') || !('text' in response))) {
        payload = await response.json()
      } else if (typeof response.text === 'function') {
        payload = await response.text()
      }
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new ApiError(parseErrorMessage(payload, response.statusText || 'Request failed'), response.status, payload)
  }

  return payload as T
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(resolveApiUrl(path), {
    // include credentials so cookies are sent for proxied/secure endpoints
    credentials: 'include',
    ...init,
    headers: buildHeaders(init.headers),
  })
}
