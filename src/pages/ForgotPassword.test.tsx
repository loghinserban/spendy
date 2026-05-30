import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ForgotPassword } from './ForgotPassword'

const mockNavigate = vi.fn()
const mockForgotPassword = vi.fn()
const mockResetPassword = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../utils/authApi', () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}))

describe('ForgotPassword page', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockForgotPassword.mockReset()
    mockResetPassword.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('requests a reset token and shows the response message', async () => {
    mockForgotPassword.mockResolvedValue({ message: 'Password reset token generated.', token: 'reset-token-1' })

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'qa@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery email' }))

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('qa@example.com')
      expect(screen.getByText('Password reset token generated.')).toBeInTheDocument()
      expect(screen.getByText('Dev token: reset-token-1')).toBeInTheDocument()
    })
  })

  it('resets the password and redirects to login', async () => {
    mockResetPassword.mockResolvedValue({ message: 'Password has been reset.' })

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Reset token'), { target: { value: 'reset-token-1' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('reset-token-1', 'Password123!')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('validates the reset form before calling the API', () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(screen.getByText('Reset token is required.')).toBeInTheDocument()
    expect(mockResetPassword).not.toHaveBeenCalled()
  })
})

