import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import App from './App'
import { DashboardPage } from './pages/DashboardPage'
import { ExpenseFormPage } from './pages/ExpenseFormPage'
import type { ExpenseInput } from './types'
import { ExpensesProvider, useExpenses } from './useExpenses'
import { getCurrentMonthKey } from './utils/month'

function setNavigatorOnlineStatus(isOnline: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => isOnline,
  })
}

function makeExpense(index: number): ExpenseInput {
  const monthKey = getCurrentMonthKey()

  return {
    title: `Seed expense ${index}`,
    amount: index * 10,
    category: 'Shopping',
    date: `${monthKey}-${String(index).padStart(2, '0')}`,
    paymentMethod: 'Debit Card',
    notes: '',
  }
}

function SeedExpenses({ count }: { count: number }) {
  const { addExpense } = useExpenses()

  useEffect(() => {
    for (let index = 1; index <= count; index += 1) {
      addExpense(makeExpense(index))
    }
  }, [addExpense, count])

  return null
}

afterEach(() => {
  setNavigatorOnlineStatus(true)
  cleanup()
  vi.restoreAllMocks()
})

describe('Spendy UI routes and behavior', () => {
  it('renders landing page on root and redirects unknown routes to landing', async () => {
    window.history.replaceState({}, '', '/')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Spendy' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeTruthy()
    expect(screen.getByText('Smart spending, simplified')).toBeTruthy()

    cleanup()

    window.history.replaceState({}, '', '/unknown-route')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Smart spending, simplified')).toBeTruthy()
    })
  })

  it('shows 5 expenses per page and paginates correctly', async () => {
    setNavigatorOnlineStatus(false)

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ExpensesProvider>
          <SeedExpenses count={6} />
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </ExpensesProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Seed expense 1')).toBeTruthy()
    })

    expect(screen.getByText('Seed expense 5')).toBeTruthy()
    expect(screen.queryByText('Seed expense 6')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByText('Seed expense 6')).toBeTruthy()
    })

    expect(screen.queryByText('Seed expense 1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))

    await waitFor(() => {
      expect(screen.getByText('Seed expense 1')).toBeTruthy()
    })
  })

  it('shows validation errors in create form', async () => {
    render(
      <MemoryRouter initialEntries={['/expenses/new']}>
        <ExpensesProvider>
          <Routes>
            <Route path="/expenses/new" element={<ExpenseFormPage mode="create" />} />
          </Routes>
        </ExpensesProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }))

    await waitFor(() => {
      expect(screen.getByText('Title is required.')).toBeTruthy()
      expect(screen.getByText('Amount must be greater than 0.')).toBeTruthy()
      expect(screen.getByText('Date is required.')).toBeTruthy()
    })
  })

  it('shows validation errors in edit form', async () => {
    setNavigatorOnlineStatus(false)

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ExpensesProvider>
          <SeedExpenses count={1} />
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/expenses/:expenseId/edit" element={<ExpenseFormPage mode="edit" />} />
          </Routes>
        </ExpensesProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit Seed expense 1' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit Seed expense 1' }))

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(screen.getByText('Title is required.')).toBeTruthy()
      expect(screen.getByText('Amount must be greater than 0.')).toBeTruthy()
    })
  })

  it('edits an existing expense successfully and returns to dashboard', async () => {
    setNavigatorOnlineStatus(false)
    const currentMonth = getCurrentMonthKey()

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ExpensesProvider>
          <SeedExpenses count={1} />
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/expenses/:expenseId/edit" element={<ExpenseFormPage mode="edit" />} />
          </Routes>
        </ExpensesProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit Seed expense 1' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit Seed expense 1' }))
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Seed expense 1 - updated' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '55' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: `${currentMonth}-09` } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(screen.getByText('Seed expense 1 - updated')).toBeTruthy()
    })
  })

  it('deletes an expense row from dashboard table', async () => {
    setNavigatorOnlineStatus(false)

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ExpensesProvider>
          <SeedExpenses count={1} />
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </ExpensesProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Seed expense 1')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Seed expense 1' }))

    await waitFor(() => {
      expect(screen.queryByText('Seed expense 1')).toBeNull()
    })
  })
})
