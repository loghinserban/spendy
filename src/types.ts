export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Shopping',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const PAYMENT_METHODS = [
  'Credit Card',
  'Digital Wallet',
  'Bank Transfer',
  'Cash',
  'Debit Card',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export interface Expense {
  id: string
  title: string
  amount: number
  category: ExpenseCategory
  date: string
  paymentMethod: PaymentMethod
  notes?: string
}

export type ExpenseInput = Omit<Expense, 'id'>

export type ExpenseUpdateInput = Partial<ExpenseInput>

// SOC Admin Dashboard Types
export type SeverityLevel = 'High' | 'Medium' | 'Low'

export type ObservationStatus = 'ACTIVE' | 'REVIEWED'

export type AuditGroup = 'Admin' | 'User'

export interface ObservationFlag {
  flagID: string
  userID: string
  reason: string
  severityLevel: SeverityLevel
  flaggedAt: string
  status?: ObservationStatus
}

export interface AuditLogEntry {
  logID: string
  userID: string
  groupID: AuditGroup
  actionInformation: string
  timestamp: string
}

// User Authentication Types
export type UserRole = 'admin' | 'user' | 'moderator'

export interface UserPermissions {
  [key: string]: boolean
}

export interface User {
  id: string
  username: string
  email?: string
  role: UserRole
  permissions: UserPermissions
}

export interface LoginRequest {
  username: string
  password: string
  totp?: string
}

export interface LoginResponse {
  user?: User
  token?: string
  preAuthToken?: string
  message?: string
}

export interface TwoFactorChallenge {
  username: string
  preAuthToken: string
}

export interface TwoFactorVerifyRequest {
  preAuthToken: string
  totp: string
}

export interface TwoFactorSetupResponse {
  ascii: string | null
  hex: string | null
  base32: string | null
  otpauth_url: string | null
  qrDataUrl: string | null
}

export interface TwoFactorEnableRequest {
  secret: string
  token: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface RegisterResponse {
  user: User
  token?: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
  token?: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface ResetPasswordResponse {
  message: string
}

// Chat Types
export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
}

export interface ChatMessagePayload {
  type: 'CHAT_MESSAGE'
  senderId: string
  senderName: string
  text: string
}



