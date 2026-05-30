import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Register } from './Register'

const mockNavigate = vi.fn()
const mockLogin = vi.fn()
const mockRegisterApi = vi.fn()

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
  register: (...args: unknown[]) => mockRegisterApi(...args),
}))

describe('Register page', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogin.mockReset()
    mockRegisterApi.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders register form content', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password', { exact: true })).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
  })

  it('shows validation errors before submitting', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(screen.getByText('Full name is required.')).toBeInTheDocument()
    expect(mockRegisterApi).not.toHaveBeenCalled()
  })

  it('navigates to dashboard when submitting register', async () => {
    mockRegisterApi.mockResolvedValue({
      user: { id: 'u-2', username: 'QA Tester', role: 'user', permissions: {} },
      token: 'token-456',
    })

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'QA Tester' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'qa@example.com' } })
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
      target: { value: 'Password123!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Password123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(mockRegisterApi).toHaveBeenCalledWith('QA Tester', 'qa@example.com', 'Password123!')
      expect(mockLogin).toHaveBeenCalledWith(
        { id: 'u-2', username: 'QA Tester', role: 'user', permissions: {} },
        'token-456',
      )
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('navigates back to home when clicking back button', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
