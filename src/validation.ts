import type { ExpenseInput } from './types'

export interface ExpenseValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateExpense(
  expense: Pick<ExpenseInput, 'title' | 'amount' | 'date'>,
): ExpenseValidationResult {
  const errors: string[] = []

  if (!expense.title.trim()) {
    errors.push('Title is required.')
  }

  if (!(expense.amount > 0)) {
    errors.push('Amount must be greater than 0.')
  }

  if (!expense.date.trim()) {
    errors.push('Date is required.')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

