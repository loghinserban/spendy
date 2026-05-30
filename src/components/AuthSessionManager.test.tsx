import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthSessionManager } from './AuthSessionManager'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('AuthSessionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockNavigate.mockReset()
    mockLogout.mockReset()
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ user: { id: 'u-1', username: 'testuser', role: 'user', permissions: {} }, token: 'token-1', logout: mockLogout })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('logs out and redirects after inactivity', () => {
    render(
      <MemoryRouter>
        <AuthSessionManager />
      </MemoryRouter>,
    )

    vi.advanceTimersByTime(5 * 60 * 1000 + 1)

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login?reason=timeout', { replace: true })
  })

  it('resets the inactivity timer when user activity occurs', () => {
    render(
      <MemoryRouter>
        <AuthSessionManager />
      </MemoryRouter>,
    )

    window.dispatchEvent(new Event('mousemove'))
    vi.advanceTimersByTime(4 * 60 * 1000)

    expect(mockLogout).not.toHaveBeenCalled()
  })
})

