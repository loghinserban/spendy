import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Statistics } from './Statistics'
import { formatCurrency } from '../utils/format'
import { getCurrentMonthKey } from '../utils/month'

const normalizeCurrency = (value: string): string => value.replace(/\s+/g, '')

const shiftMonthKey = (monthKey: string, offset: number): string => {
  const [yearPart, monthPart] = monthKey.split('-')
  const date = new Date(Number(yearPart), Number(monthPart) - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const mockNavigate = vi.fn()
const mockUseExpenses = vi.fn()

vi.mock('../useExpenses', () => ({
  useExpenses: () => mockUseExpenses(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('recharts', () => {
  const makeComponent = (testId: string) => ({
    children,
  }: {
    children?: ReactNode
  }) => <div data-testid={testId}>{children}</div>

  return {
    ResponsiveContainer: makeComponent('responsive-container'),
    PieChart: makeComponent('pie-chart'),
    Pie: makeComponent('pie'),
    Cell: makeComponent('cell'),
    BarChart: makeComponent('bar-chart'),
    Bar: makeComponent('bar'),
    Tooltip: makeComponent('tooltip'),
    XAxis: makeComponent('x-axis'),
    YAxis: makeComponent('y-axis'),
  }
})

describe('Statistics page', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUseExpenses.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders summary cards and chart sections from expenses data', () => {
    const currentMonth = getCurrentMonthKey()
    const nextMonth = shiftMonthKey(currentMonth, 1)

    mockUseExpenses.mockReturnValue({
      expenses: [
        {
          id: '1',
          title: 'Groceries',
          amount: 120,
          category: 'Food & Dining',
          date: `${currentMonth}-01`,
          paymentMethod: 'Debit Card',
        },
        {
          id: '2',
          title: 'Bus ticket',
          amount: 30,
          category: 'Transportation',
          date: `${currentMonth}-02`,
          paymentMethod: 'Cash',
        },
        {
          id: '3',
          title: 'May taxi',
          amount: 200,
          category: 'Transportation',
          date: `${nextMonth}-02`,
          paymentMethod: 'Cash',
        },
      ],
    })

    render(<Statistics />)

    expect(screen.getByRole('heading', { name: 'Statistics & Insights' })).toBeInTheDocument()
    expect(screen.getByText('Total Expenses')).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => normalizeCurrency(element?.textContent ?? '') === normalizeCurrency(formatCurrency(150))),
    ).toBeInTheDocument()
    expect(screen.getByText('Average Expense')).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => normalizeCurrency(element?.textContent ?? '') === normalizeCurrency(formatCurrency(75))),
    ).toBeInTheDocument()
    expect(screen.getByText('Top Category')).toBeInTheDocument()
    expect(screen.getAllByText('Food & Dining').length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText('Expenses by Category')).toBeInTheDocument()
    expect(screen.getByText('Expenses by Payment Method')).toBeInTheDocument()
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
    expect(screen.getAllByTestId('pie-chart').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThan(0)

    const totalCard = screen.getByText('Total Expenses').closest('article')
    expect(totalCard).not.toBeNull()
    expect(
      within(totalCard as HTMLElement).getByText((_, element) =>
        normalizeCurrency(element?.textContent ?? '') === normalizeCurrency(formatCurrency(150)),
      ),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: nextMonth } })

    expect(screen.getByText('Top Category')).toBeInTheDocument()
    expect(
      within(screen.getByText('Top Category').closest('article') as HTMLElement).getByText('Transportation'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByText('Total Expenses').closest('article') as HTMLElement).getByText((_, element) =>
        normalizeCurrency(element?.textContent ?? '') === normalizeCurrency(formatCurrency(200)),
      ),
    ).toBeInTheDocument()
  })

  it('shows empty-state labels when there are no expenses', () => {
    mockUseExpenses.mockReturnValue({ expenses: [] })

    render(<Statistics />)

    expect(
      screen.getAllByText((_, element) => normalizeCurrency(element?.textContent ?? '') === normalizeCurrency(formatCurrency(0))).length,
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('N/A')).toBeInTheDocument()
    expect(screen.getByText('No data available yet.')).toBeInTheDocument()
    expect(screen.getByText('No category totals yet.')).toBeInTheDocument()
  })

  it('navigates back to dashboard when back button is clicked', () => {
    mockUseExpenses.mockReturnValue({ expenses: [] })

    render(<Statistics />)

    fireEvent.click(screen.getByRole('button', { name: 'Back to Expenses' }))
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })
})
