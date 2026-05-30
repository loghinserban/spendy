import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Login } from './Login'

const mockNavigate = vi.fn()
const mockLogin = vi.fn()
const mockLoginApi = vi.fn()
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
  login: (...args: unknown[]) => mockLoginApi(...args),
}))

vi.mock('../utils/authStorage', () => ({
  writePendingLoginChallenge: (...args: unknown[]) => mockWritePendingLoginChallenge(...args),
}))

describe('Login page', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogin.mockReset()
    mockLoginApi.mockReset()
    mockWritePendingLoginChallenge.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders login form content', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeInTheDocument()
  })

  it('validates required fields before submitting', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(screen.getByText('Username is required.')).toBeInTheDocument()
    expect(mockLoginApi).not.toHaveBeenCalled()
  })

  it('logs in successfully and navigates to the dashboard', async () => {
    mockLoginApi.mockResolvedValue({
      user: { id: 'u-1', username: 'testuser', role: 'user', permissions: {} },
      token: 'token-123',
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(mockLoginApi).toHaveBeenCalledWith('testuser', 'Password123!')
      expect(mockLogin).toHaveBeenCalledWith(
        { id: 'u-1', username: 'testuser', role: 'user', permissions: {} },
        'token-123',
      )
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('routes to verification code entry when the backend returns a Pre-Auth token', async () => {
    mockLoginApi.mockResolvedValue({
      preAuthToken: 'pre-auth-token-123',
      message: '2FA required',
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(mockWritePendingLoginChallenge).toHaveBeenCalledWith({
        username: 'testuser',
        preAuthToken: 'pre-auth-token-123',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/verify-code')
    })
  })

  it('navigates back to home when clicking back button', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
