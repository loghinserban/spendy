import type { Expense } from '../types'

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

export const getCurrentMonthKey = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const getExpenseMonthKey = (date: string): string | null => {
  if (!/^\d{4}-\d{2}/.test(date)) {
    return null
  }

  return date.slice(0, 7)
}

export const formatMonthLabel = (monthKey: string): string => {
  const [yearPart, monthPart] = monthKey.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return monthKey
  }

  return MONTH_LABEL_FORMATTER.format(new Date(year, month - 1, 1))
}

export const getExpenseMonthOptions = (
  expenses: Expense[],
  selectedMonth: string,
): string[] => {
  const monthKeys = new Set<string>([selectedMonth])

  for (const expense of expenses) {
    const monthKey = getExpenseMonthKey(expense.date)
    if (monthKey) {
      monthKeys.add(monthKey)
    }
  }

  return Array.from(monthKeys).sort((left, right) => right.localeCompare(left))
}

export const filterExpensesByMonth = (
  expenses: Expense[],
  selectedMonth: string,
): Expense[] => expenses.filter((expense) => getExpenseMonthKey(expense.date) === selectedMonth)

