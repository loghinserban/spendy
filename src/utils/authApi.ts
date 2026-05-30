import type {
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  TwoFactorEnableRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  ResetPasswordResponse,
} from '../types'
import { apiRequest } from './apiClient'

export const login = async (
  username: string,
  password: string,
  totp?: string,
): Promise<LoginResponse> =>
  apiRequest<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, ...(totp ? { totp } : {}) } satisfies LoginRequest),
  })

export const verifyTwoFactorLogin = async (
  preAuthToken: string,
  totp: string,
): Promise<LoginResponse> =>
  apiRequest<LoginResponse>('/verify-2fa', {
    method: 'POST',
    body: JSON.stringify({ preAuthToken, totp } satisfies TwoFactorVerifyRequest),
  })

export const setupTwoFactor = async (): Promise<TwoFactorSetupResponse> =>
  apiRequest<TwoFactorSetupResponse>('/2fa/setup', {
    method: 'POST',
  })

export const confirmTwoFactorSetup = async (secret: string, token: string): Promise<{ message: string }> =>
  apiRequest<{ message: string }>('/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ secret, token } satisfies TwoFactorEnableRequest),
  })

export const register = async (
  username: string,
  email: string,
  password: string,
): Promise<RegisterResponse> =>
  apiRequest<RegisterResponse>('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password } satisfies RegisterRequest),
  })

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> =>
  apiRequest<ForgotPasswordResponse>('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const resetPassword = async (token: string, newPassword: string): Promise<ResetPasswordResponse> =>
  apiRequest<ResetPasswordResponse>('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })

export const fetchChatHistory = async (limit: number = 50): Promise<any[]> =>
  apiRequest<any[]>(`/chat/history?limit=${limit}`)


