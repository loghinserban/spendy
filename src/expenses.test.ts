import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ExpenseInput } from './types'
import { ExpensesProvider, useExpenses } from './useExpenses'
import { validateExpense } from './validation'

const baseExpenseInput: ExpenseInput = {
  title: 'Groceries',
  amount: 82.5,
  category: 'Food & Dining',
  date: '2026-04-02',
  paymentMethod: 'Debit Card',
  notes: 'Weekly shopping',
}

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(ExpensesProvider, null, children)

const originalWebSocket = globalThis.WebSocket

beforeEach(() => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => false,
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  globalThis.WebSocket = originalWebSocket
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => false,
  })
})

describe('validateExpense', () => {
  it('returns valid when required fields are present', () => {
    const result = validateExpense({ title: 'Bus pass', amount: 25, date: '2026-04-02' })

    expect(result).toEqual({
      isValid: true,
      errors: [],
    })
  })

  it('rejects an empty title', () => {
    const result = validateExpense({ title: '   ', amount: 20, date: '2026-04-02' })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Title is required.')
  })

  it('rejects a negative or zero amount', () => {
    const result = validateExpense({ title: 'Lunch', amount: 0, date: '2026-04-02' })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Amount must be greater than 0.')
  })

  it('rejects a missing date', () => {
    const result = validateExpense({ title: 'Taxi', amount: 20, date: '   ' })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Date is required.')
  })
})

describe('useExpenses', () => {
  it('throws if used outside provider', () => {
    expect(() => renderHook(() => useExpenses())).toThrowError(
      'useExpenses must be used within an ExpensesProvider.',
    )
  })

  it('creates a valid expense', () => {
    const { result } = renderHook(() => useExpenses(), { wrapper })

    act(() => {
      const created = result.current.addExpense(baseExpenseInput)
      expect(created.id).toBeTruthy()
      expect(created.title).toBe('Groceries')
      expect(created.amount).toBe(82.5)
    })

    expect(result.current.expenses).toHaveLength(1)
  })

  it('reads and retrieves the list of expenses', () => {
    const { result } = renderHook(() => useExpenses(), { wrapper })

    act(() => {
      result.current.addExpense(baseExpenseInput)
      result.current.addExpense({
        ...baseExpenseInput,
        title: 'Fuel',
        amount: 60,
        category: 'Transportation',
      })
    })

    expect(result.current.expenses).toHaveLength(2)
    expect(result.current.expenses.map((expense) => expense.title)).toEqual([
      'Groceries',
      'Fuel',
    ])
  })

  it('updates an existing expense', () => {
    const { result } = renderHook(() => useExpenses(), { wrapper })

    let createdId = ''

    act(() => {
      const created = result.current.addExpense(baseExpenseInput)
      createdId = created.id
    })

    act(() => {
      const updated = result.current.updateExpense(createdId, {
        title: 'Supermarket',
        amount: 90,
      })

      expect(updated?.title).toBe('Supermarket')
      expect(updated?.amount).toBe(90)
    })

    expect(result.current.getExpenseById(createdId)?.title).toBe('Supermarket')
  })

  it('deletes an existing expense', () => {
    const { result } = renderHook(() => useExpenses(), { wrapper })

    let createdId = ''

    act(() => {
      const created = result.current.addExpense(baseExpenseInput)
      createdId = created.id
    })

    act(() => {
      const didDelete = result.current.deleteExpense(createdId)
      expect(didDelete).toBe(true)
    })

    expect(result.current.expenses).toHaveLength(0)
    expect(result.current.getExpenseById(createdId)).toBeUndefined()
  })

  it('returns null/false for update and delete on unknown id', () => {
    const { result } = renderHook(() => useExpenses(), { wrapper })

    act(() => {
      const updated = result.current.updateExpense('missing-id', { title: 'Never applied' })
      expect(updated).toBeNull()
    })

    act(() => {
      const didDelete = result.current.deleteExpense('missing-id')
      expect(didDelete).toBe(false)
    })
  })

  it('clears all expenses', () => {
    const { result } = renderHook(() => useExpenses(), { wrapper })

    act(() => {
      result.current.addExpense(baseExpenseInput)
      result.current.addExpense({
        ...baseExpenseInput,
        title: 'Movie night',
        amount: 30,
        category: 'Entertainment',
      })
    })

    expect(result.current.expenses).toHaveLength(2)

    act(() => {
      result.current.clearExpenses()
    })

    expect(result.current.expenses).toEqual([])
  })

  it('throws when adding invalid expense', () => {
    const { result } = renderHook(() => useExpenses(), { wrapper })

    expect(() => {
      act(() => {
        result.current.addExpense({
          ...baseExpenseInput,
          title: '  ',
        })
      })
    }).toThrowError('Title is required.')
  })

  it('throws when updating expense to invalid data', () => {
    const { result } = renderHook(() => useExpenses(), { wrapper })

    let createdId = ''

    act(() => {
      const created = result.current.addExpense(baseExpenseInput)
      createdId = created.id
    })

    expect(() => {
      act(() => {
        result.current.updateExpense(createdId, {
          amount: -5,
        })
      })
    }).toThrowError('Amount must be greater than 0.')
  })

  it('queues offline create and syncs it automatically when back online', async () => {
    let online = false
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => online,
    })

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === 'string' ? input : input.toString()

        if (init?.method === 'POST' && rawUrl.includes('/expenses')) {
          const payload = JSON.parse(String(init.body)) as ExpenseInput
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: 'server-expense-1', ...payload }),
          } as Response
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [], page: 1, limit: 100, totalItems: 0, totalPages: 0 }),
        } as Response
      })

    const { result } = renderHook(() => useExpenses(), { wrapper })

    act(() => {
      result.current.addExpense(baseExpenseInput)
    })

    expect(result.current.expenses).toHaveLength(1)
    expect(result.current.pendingActions).toBe(1)

    await act(async () => {
      online = true
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => {
      expect(result.current.pendingActions).toBe(0)
      expect(result.current.expenses[0]?.id).toBe('server-expense-1')
    })

    const postCall = fetchMock.mock.calls.find(([, init]) => {
      const method = init?.method
      return method === 'POST'
    })

    expect(postCall).toBeTruthy()
    fetchMock.mockRestore()
  })

  it('merges faker websocket batches into shared expense state in real time', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [], page: 1, limit: 100, totalItems: 0, totalPages: 0 }),
      } as Response
    })

    const sockets: Array<{
      onmessage: ((event: MessageEvent) => void) | null
      onerror: (() => void) | null
      close: () => void
    }> = []

    class MockWebSocket {
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: (() => void) | null = null

      constructor(_url: string) {
        sockets.push(this)
      }

      close() {
        return undefined
      }
    }

    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket

    const { result } = renderHook(() => useExpenses(), { wrapper })

    const wsPayload = JSON.stringify({
      type: 'faker-expenses',
      data: [
        {
          id: 'faker-1',
          title: 'Mock Faker Expense',
          amount: 45,
          category: 'Shopping',
          date: '2026-04-21',
          paymentMethod: 'Credit Card',
          notes: 'live sync',
        },
      ],
    })

    await act(async () => {
      sockets[0]?.onmessage?.({ data: wsPayload } as MessageEvent)
    })

    await waitFor(() => {
      expect(result.current.expenses.some((expense) => expense.id === 'faker-1')).toBe(true)
    })

  })
})
