import { afterEach, describe, expect, it, vi } from 'vitest'

import { getApiBaseUrl } from './apiClient'
import { getWebSocketUrl } from './expenseSync'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('backend URL helpers', () => {
  it('prefers VITE_API_URL and removes trailing slashes', () => {
    vi.stubEnv('VITE_API_URL', 'https://192.168.1.50:3000/')

    expect(getApiBaseUrl()).toBe('https://192.168.1.50:3000')
  })

  it('accepts VITE_API_BASE_URL as an alias', () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.internal:3000/')

    expect(getApiBaseUrl()).toBe('https://api.internal:3000')
  })

  it('derives a secure wss URL from the configured HTTPS API base', () => {
    vi.stubEnv('VITE_API_URL', 'https://192.168.1.50:3000')
    vi.stubEnv('VITE_WS_URL', '')

    expect(getWebSocketUrl()).toBe('wss://192.168.1.50:3000')
  })

  it('prefers an explicit WSS environment variable when provided', () => {
    vi.stubEnv('VITE_WS_URL', 'wss://chat.internal:3000')

    expect(getWebSocketUrl()).toBe('wss://chat.internal:3000')
  })
})

