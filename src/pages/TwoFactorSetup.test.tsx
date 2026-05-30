import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TwoFactorSetupPage } from './TwoFactorSetup'

const mockNavigate = vi.fn()
const mockSetupTwoFactor = vi.fn()
const mockConfirmTwoFactorSetup = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1', username: 'testuser', role: 'user', permissions: {} },
    token: 'token-123',
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
  }),
}))

vi.mock('../utils/authApi', () => ({
  setupTwoFactor: () => mockSetupTwoFactor(),
  confirmTwoFactorSetup: (...args: unknown[]) => mockConfirmTwoFactorSetup(...args),
}))

describe('TwoFactorSetupPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockSetupTwoFactor.mockReset()
    mockConfirmTwoFactorSetup.mockReset()
    mockSetupTwoFactor.mockResolvedValue({
      ascii: 'ascii-secret',
      hex: 'hex-secret',
      base32: 'BASE32SECRET',
      otpauth_url: 'otpauth://totp/spendy:testuser?secret=BASE32SECRET',
      qrDataUrl: 'data:image/png;base64,abc123',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('loads a QR code and enables 2FA after verification', async () => {
    mockConfirmTwoFactorSetup.mockResolvedValue({ message: '2FA enabled.' })

    render(
      <MemoryRouter>
        <TwoFactorSetupPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mockSetupTwoFactor).toHaveBeenCalledTimes(1)
      expect(screen.getByAltText('2FA QR code')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enable 2FA' }))

    await waitFor(() => {
      expect(mockConfirmTwoFactorSetup).toHaveBeenCalledWith('BASE32SECRET', '123456')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })
})
