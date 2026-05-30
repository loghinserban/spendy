import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { FormEvent } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ExpenseForm } from './ExpenseForm'
import type { ExpenseInput } from '../types'

const baseValues: ExpenseInput = {
  title: '',
  amount: 0,
  category: 'Food & Dining',
  date: '',
  paymentMethod: 'Credit Card',
  notes: '',
}

describe('ExpenseForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders validation failure messages in the DOM', () => {
    render(
      <ExpenseForm
        mode="create"
        values={baseValues}
        errors={{
          title: 'Title is required.',
          amount: 'Amount must be greater than 0.',
          date: 'Date is required.',
        }}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('Title is required.')).toBeInTheDocument()
    expect(screen.getByText('Amount must be greater than 0.')).toBeInTheDocument()
    expect(screen.getByText('Date is required.')).toBeInTheDocument()
  })

  it('calls submit handler when form is submitted', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
    })

    render(
      <ExpenseForm
        mode="create"
        values={baseValues}
        errors={{
          title: 'Title is required.',
          amount: 'Amount must be greater than 0.',
          date: 'Date is required.',
        }}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
