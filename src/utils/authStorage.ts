import type { User } from '../types'

const AUTH_STORAGE_KEY = 'spendy.auth.user'
const AUTH_TOKEN_KEY = 'spendy.auth.token'
const PENDING_LOGIN_KEY = 'spendy.auth.pending-login'

const isBrowser = (): boolean => typeof window !== 'undefined'

const readSessionValue = (key: string): string | null => {
  if (!isBrowser() || typeof window.sessionStorage === 'undefined') {
    return null
  }

  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const writeSessionValue = (key: string, value: string): void => {
  if (!isBrowser() || typeof window.sessionStorage === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Ignore storage failures so auth actions still work in restrictive browsers.
  }
}

const removeSessionValue = (key: string): void => {
  if (!isBrowser() || typeof window.sessionStorage === 'undefined') {
    return
  }

  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

const readJson = <T>(key: string, fallback: T): T => {
  const raw = readSessionValue(key)

  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const writeJson = (key: string, value: unknown): void => {
  try {
    writeSessionValue(key, JSON.stringify(value))
  } catch {
    // Ignore serialization failures.
  }
}

export interface PendingLoginChallenge {
  username: string
  preAuthToken: string
}

export const readStoredUser = (): User | null => readJson<User | null>(AUTH_STORAGE_KEY, null)

export const writeStoredUser = (user: User | null): void => {
  if (user) {
    writeJson(AUTH_STORAGE_KEY, user)
    return
  }

  removeSessionValue(AUTH_STORAGE_KEY)
}

export const readStoredToken = (): string | null => readSessionValue(AUTH_TOKEN_KEY)

export const writeStoredToken = (token: string | null): void => {
  if (token) {
    writeSessionValue(AUTH_TOKEN_KEY, token)
    return
  }

  removeSessionValue(AUTH_TOKEN_KEY)
}

export const clearStoredAuth = (): void => {
  removeSessionValue(AUTH_STORAGE_KEY)
  removeSessionValue(AUTH_TOKEN_KEY)
  removeSessionValue(PENDING_LOGIN_KEY)
}

export const readPendingLoginChallenge = (): PendingLoginChallenge | null =>
  readJson<PendingLoginChallenge | null>(PENDING_LOGIN_KEY, null)

export const writePendingLoginChallenge = (challenge: PendingLoginChallenge | null): void => {
  if (challenge) {
    writeJson(PENDING_LOGIN_KEY, challenge)
    return
  }

  removeSessionValue(PENDING_LOGIN_KEY)
}

