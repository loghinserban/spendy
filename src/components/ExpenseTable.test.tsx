import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ExpenseTable } from './ExpenseTable'
import { formatCurrency } from '../utils/format'

const normalizeCurrency = (value: string): string => value.replace(/\s+/g, '')

afterEach(() => {
  cleanup()
})

describe('ExpenseTable', () => {
  it('calls pagination handlers when Next and Previous are clicked', () => {
    const onView = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const onPreviousPage = vi.fn()
    const onNextPage = vi.fn()
    const onSelectPage = vi.fn()

    render(
      <ExpenseTable
        expenses={[
          {
            id: 'exp-1',
            title: 'Dinner',
            amount: 42,
            category: 'Food & Dining',
            date: '2026-04-02',
            paymentMethod: 'Cash',
          },
        ]}
        currentPage={2}
        totalPages={3}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        onSelectPage={onSelectPage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      screen.getByText((_, element) => normalizeCurrency(element?.textContent ?? '') === normalizeCurrency(formatCurrency(42))),
    ).toBeInTheDocument()
    expect(onPreviousPage).toHaveBeenCalledTimes(1)
    expect(onNextPage).toHaveBeenCalledTimes(1)
  })

  it('calls delete handler when Delete action is clicked', () => {
    const onDelete = vi.fn()

    render(
      <ExpenseTable
        expenses={[
          {
            id: 'exp-2',
            title: 'Cinema',
            amount: 18,
            category: 'Entertainment',
            date: '2026-04-02',
            paymentMethod: 'Debit Card',
          },
        ]}
        currentPage={1}
        totalPages={1}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onPreviousPage={vi.fn()}
        onNextPage={vi.fn()}
        onSelectPage={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete Cinema' }))

    expect(onDelete).toHaveBeenCalledWith('exp-2')
  })
})
