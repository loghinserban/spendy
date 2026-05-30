import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ExpenseDetailPage } from './ExpenseDetailPage'
import { formatCurrency } from '../utils/format'

const normalizeCurrency = (value: string): string => value.replace(/\s+/g, '')

const mockUseParams = vi.fn()
const mockUseExpenses = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => mockUseParams(),
  }
})

vi.mock('../useExpenses', () => ({
  useExpenses: () => mockUseExpenses(),
}))

describe('ExpenseDetailPage', () => {
  beforeEach(() => {
    mockUseParams.mockReset()
    mockUseExpenses.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders full details for a specific expense', () => {
    mockUseParams.mockReturnValue({ expenseId: 'exp-1' })
    mockUseExpenses.mockReturnValue({
      getExpenseById: vi.fn().mockReturnValue({
        id: 'exp-1',
        title: 'Electricity Bill',
        amount: 95.5,
        category: 'Bills & Utilities',
        date: '2026-04-02',
        paymentMethod: 'Bank Transfer',
        notes: 'Monthly bill',
      }),
    })

    render(
      <MemoryRouter>
        <ExpenseDetailPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Electricity Bill' })).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => normalizeCurrency(element?.textContent ?? '') === normalizeCurrency(formatCurrency(95.5))),
    ).toBeInTheDocument()
    expect(screen.getByText('Bills & Utilities')).toBeInTheDocument()
    expect(screen.getByText('2026-04-02')).toBeInTheDocument()
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument()
    expect(screen.getByText('Monthly bill')).toBeInTheDocument()
  })

  it('renders not-found state when expense does not exist', () => {
    mockUseParams.mockReturnValue({ expenseId: 'missing' })
    mockUseExpenses.mockReturnValue({
      getExpenseById: vi.fn().mockReturnValue(undefined),
    })

    render(
      <MemoryRouter>
        <ExpenseDetailPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Expense not found.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Back to Dashboard' }).length).toBeGreaterThan(0)
  })
})
