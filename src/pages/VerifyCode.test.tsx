import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { VerifyCode } from './VerifyCode'

const mockNavigate = vi.fn()
const mockLogin = vi.fn()
const mockVerifyTwoFactorLogin = vi.fn()
const mockReadPendingLoginChallenge = vi.fn()
const mockWritePendingLoginChallenge = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    error: null,
    login: mockLogin,
    logout: vi.fn(),
    setUser: vi.fn(),
  }),
}))

vi.mock('../utils/authApi', () => ({
  verifyTwoFactorLogin: (...args: unknown[]) => mockVerifyTwoFactorLogin(...args),
}))

vi.mock('../utils/authStorage', () => ({
  readPendingLoginChallenge: () => mockReadPendingLoginChallenge(),
  writePendingLoginChallenge: (...args: unknown[]) => mockWritePendingLoginChallenge(...args),
}))

describe('VerifyCode page', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogin.mockReset()
    mockVerifyTwoFactorLogin.mockReset()
    mockReadPendingLoginChallenge.mockReset()
    mockWritePendingLoginChallenge.mockReset()
    mockReadPendingLoginChallenge.mockReturnValue({ username: 'testuser', preAuthToken: 'pre-auth-token-123' })
  })

  afterEach(() => {
    cleanup()
  })

  it('submits the verification code and finishes login', async () => {
    mockVerifyTwoFactorLogin.mockResolvedValue({
      user: { id: 'u-3', username: 'testuser', role: 'moderator', permissions: {} },
      token: 'token-789',
    })

    render(
      <MemoryRouter>
        <VerifyCode />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))

    await waitFor(() => {
      expect(mockVerifyTwoFactorLogin).toHaveBeenCalledWith('pre-auth-token-123', '123456')
      expect(mockLogin).toHaveBeenCalledWith(
        { id: 'u-3', username: 'testuser', role: 'moderator', permissions: {} },
        'token-789',
      )
      expect(mockWritePendingLoginChallenge).toHaveBeenCalledWith(null)
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('requires a verification code before calling the API', () => {
    render(
      <MemoryRouter>
        <VerifyCode />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))

    expect(screen.getByText('Verification code is required.')).toBeInTheDocument()
    expect(mockVerifyTwoFactorLogin).not.toHaveBeenCalled()
  })
})

