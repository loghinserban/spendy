import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DashboardPage } from './DashboardPage'
import { formatCurrency } from '../utils/format'
import { getCurrentMonthKey } from '../utils/month'

const normalizeCurrency = (value: string): string => value.replace(/\s+/g, '')

const shiftMonthKey = (monthKey: string, offset: number): string => {
  const [yearPart, monthPart] = monthKey.split('-')
  const date = new Date(Number(yearPart), Number(monthPart) - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const mockDeleteExpense = vi.fn().mockReturnValue(true)
const mockUseExpenses = vi.fn()

vi.mock('../useExpenses', () => ({
  useExpenses: () => mockUseExpenses(),
}))

describe('DashboardPage', () => {
  afterEach(() => {
    cleanup()
    mockUseExpenses.mockReset()
  })

  it('filters summary cards and table rows by the selected month', () => {
    const currentMonth = getCurrentMonthKey()
    const nextMonth = shiftMonthKey(currentMonth, 1)

    mockUseExpenses.mockReturnValue({
      expenses: [
        {
          id: 'exp-1',
          title: 'April lunch',
          amount: 15,
          category: 'Food & Dining',
          date: `${currentMonth}-02`,
          paymentMethod: 'Cash',
        },
        {
          id: 'exp-2',
          title: 'May groceries',
          amount: 30,
          category: 'Shopping',
          date: `${nextMonth}-03`,
          paymentMethod: 'Debit Card',
        },
      ],
      deleteExpense: mockDeleteExpense,
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Month')).toHaveValue(currentMonth)
    expect(screen.getByText('April lunch')).toBeInTheDocument()
    expect(screen.queryByText('May groceries')).toBeNull()

    const totalCard = screen.getByText('Total Expenses').closest('div')
    expect(totalCard).not.toBeNull()
    expect(
      within(totalCard as HTMLElement).getByText((_, element) =>
        normalizeCurrency(element?.textContent ?? '') === normalizeCurrency(formatCurrency(15)),
      ),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: nextMonth } })

    expect(screen.getByText('May groceries')).toBeInTheDocument()
    expect(screen.queryByText('April lunch')).toBeNull()

    const updatedTotalCard = screen.getByText('Total Expenses').closest('div')
    expect(updatedTotalCard).not.toBeNull()
    expect(
      within(updatedTotalCard as HTMLElement).getByText((_, element) =>
        normalizeCurrency(element?.textContent ?? '') === normalizeCurrency(formatCurrency(30)),
      ),
    ).toBeInTheDocument()
  })

  it('navigates to landing page when Logout is clicked', () => {
    mockUseExpenses.mockReturnValue({ expenses: [], deleteExpense: mockDeleteExpense })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<div>Landing Route Reached</div>} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(screen.getByText('Landing Route Reached')).toBeInTheDocument()
  })
})

