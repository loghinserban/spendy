import type { Expense, ExpenseInput } from '../types'
import { apiFetch, apiRequest, getApiBaseUrl } from './apiClient'

// Do not hardcode localhost here — prefer Vite env vars and sensible runtime
// fallbacks (same-origin for HTTP, computed ws/wss for WebSocket).
const PAGE_LIMIT = 100

const isTestRuntime = (): boolean =>
  typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'

export const EXPENSES_CACHE_KEY = 'spendy.expenses.cache'
export const EXPENSES_QUEUE_KEY = 'spendy.expenses.queue'

export type QueuedExpenseAction =
  | { type: 'create'; expense: Expense }
  | { type: 'update'; expense: Expense }
  | { type: 'delete'; id: string }

export interface PaginatedExpensesResponse {
  data: Expense[]
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export const getWebSocketUrl = (): string => {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL
  if (typeof envUrl === 'string' && envUrl.trim()) return envUrl

  const apiBaseUrl = getApiBaseUrl()

  if (apiBaseUrl) {
    try {
      const baseUrl = new URL(apiBaseUrl)
      const proto = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${proto}//${baseUrl.host}`
    } catch {
      // Fall through to the browser location-based fallback below.
    }
  }

  // Compute WebSocket URL from current location (wss for https, ws for http).
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}`
  }

  return ''
}

const toExpenseInput = (expense: Expense): ExpenseInput => ({
  title: expense.title,
  amount: expense.amount,
  category: expense.category,
  date: expense.date,
  paymentMethod: expense.paymentMethod,
  notes: expense.notes,
})

const request = async <T>(path: string, init?: RequestInit & { userId?: string }): Promise<T> => {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  }

  if (init?.userId) {
    headers['X-User-ID'] = init.userId
  }

  return apiRequest<T>(path, {
    ...init,
    headers,
  })
}

export const fetchAllExpenses = async (userId?: string): Promise<Expense[]> => {
  let page = 1
  let totalPages = 1
  const allExpenses: Expense[] = []

  while (page <= totalPages) {
    const payload = await request<PaginatedExpensesResponse>(
      `/expenses?page=${page}&limit=${PAGE_LIMIT}`,
      { userId },
    )

    allExpenses.push(...payload.data)
    totalPages = Math.max(payload.totalPages, 1)
    page += 1
  }

  return allExpenses
}

export const fetchExpensesPage = (
  page: number,
  limit: number,
  userId?: string,
): Promise<PaginatedExpensesResponse> =>
  request<PaginatedExpensesResponse>(`/expenses?page=${page}&limit=${limit}`, { userId })

export const createExpenseOnServer = (expense: Expense, userId?: string): Promise<Expense> =>
  request<Expense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(toExpenseInput(expense)),
    userId,
  })

export const updateExpenseOnServer = (expense: Expense, userId?: string): Promise<Expense | null> =>
  request<Expense>(`/expenses/${expense.id}`, {
    method: 'PUT',
    body: JSON.stringify(toExpenseInput(expense)),
    userId,
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'HTTP 404') {
      return null
    }

    throw error
  })

export const deleteExpenseOnServer = (id: string, userId?: string): Promise<boolean> => {
  const headers: Record<string, string> = {}
  if (userId) {
    headers['X-User-ID'] = userId
  }

  return apiFetch(`/expenses/${id}`, {
    method: 'DELETE',
    headers,
  })
    .then((response) => {
      if (response.status === 404) {
        return false
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return true
    })
}

export const parseFakerExpensesMessage = (rawMessage: string): Expense[] => {
  try {
    const parsed = JSON.parse(rawMessage) as { type?: string; data?: unknown }

    if (parsed.type !== 'faker-expenses' || !Array.isArray(parsed.data)) {
      return []
    }

    return parsed.data.filter((entry): entry is Expense => {
      if (!entry || typeof entry !== 'object') {
        return false
      }

      const expense = entry as Partial<Expense>
      return (
        typeof expense.id === 'string' &&
        typeof expense.title === 'string' &&
        typeof expense.amount === 'number' &&
        typeof expense.category === 'string' &&
        typeof expense.date === 'string' &&
        typeof expense.paymentMethod === 'string'
      )
    })
  } catch {
    return []
  }
}

export const mergeExpensesById = (currentExpenses: Expense[], incomingExpenses: Expense[]): Expense[] => {
  if (incomingExpenses.length === 0) {
    return currentExpenses
  }

  const merged = new Map(currentExpenses.map((expense) => [expense.id, expense]))

  for (const expense of incomingExpenses) {
    merged.set(expense.id, expense)
  }

  return Array.from(merged.values())
}

export const optimizeQueue = (
  queue: QueuedExpenseAction[],
  action: QueuedExpenseAction,
): QueuedExpenseAction[] => {
  if (action.type === 'update') {
    const createIndex = queue.findIndex(
      (queuedAction) => queuedAction.type === 'create' && queuedAction.expense.id === action.expense.id,
    )

    if (createIndex >= 0) {
      const nextQueue = [...queue]
      nextQueue[createIndex] = { type: 'create', expense: action.expense }
      return nextQueue
    }

    const updateIndex = queue.findIndex(
      (queuedAction) => queuedAction.type === 'update' && queuedAction.expense.id === action.expense.id,
    )

    if (updateIndex >= 0) {
      const nextQueue = [...queue]
      nextQueue[updateIndex] = action
      return nextQueue
    }
  }

  if (action.type === 'delete') {
    const removedCreate = queue.filter(
      (queuedAction) => !(queuedAction.type === 'create' && queuedAction.expense.id === action.id),
    )

    if (removedCreate.length !== queue.length) {
      return removedCreate.filter(
        (queuedAction) => !(queuedAction.type === 'update' && queuedAction.expense.id === action.id),
      )
    }

    const withoutUpdates = removedCreate.filter(
      (queuedAction) => !(queuedAction.type === 'update' && queuedAction.expense.id === action.id),
    )

    const alreadyQueuedDelete = withoutUpdates.some(
      (queuedAction) => queuedAction.type === 'delete' && queuedAction.id === action.id,
    )

    if (alreadyQueuedDelete) {
      return withoutUpdates
    }

    return [...withoutUpdates, action]
  }

  return [...queue, action]
}

export const readLocalJson = <T>(key: string, fallback: T): T => {
  if (
    isTestRuntime() ||
    typeof window === 'undefined' ||
    typeof window.localStorage === 'undefined'
  ) {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const writeLocalJson = (key: string, value: unknown): void => {
  if (
    isTestRuntime() ||
    typeof window === 'undefined' ||
    typeof window.localStorage === 'undefined'
  ) {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write failures to avoid breaking CRUD flows.
  }
}

export const isBrowserOnline = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine

