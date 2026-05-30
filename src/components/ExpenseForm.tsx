import type { FormEvent } from 'react'

import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseCategory,
  type ExpenseInput,
  type PaymentMethod,
} from '../types'

export interface ExpenseFormErrors {
  title?: string
  amount?: string
  date?: string
  form?: string
}

interface ExpenseFormProps {
  mode: 'create' | 'edit'
  values: ExpenseInput
  errors: ExpenseFormErrors
  onChange: <K extends keyof ExpenseInput>(field: K, value: ExpenseInput[K]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

export function ExpenseForm({
  mode,
  values,
  errors,
  onChange,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const submitLabel = mode === 'create' ? 'Add Expense' : 'Save Changes'

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border-2 border-slate-300 bg-white p-8 shadow-lg">
      <div>
        <label htmlFor="title" className="mb-2 block text-sm font-bold text-slate-700 uppercase tracking-wide">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
          className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
          placeholder="e.g., Grocery shopping"
        />
        {errors.title ? <p className="mt-1 text-sm font-bold text-red-600">{errors.title}</p> : null}
      </div>

      <div>
        <label htmlFor="amount" className="mb-2 block text-sm font-bold text-slate-700 uppercase tracking-wide">
          Amount
        </label>
        <input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={values.amount}
          onChange={(event) => onChange('amount', Number(event.target.value))}
          className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
          placeholder="0.00"
        />
        {errors.amount ? <p className="mt-1 text-sm font-bold text-red-600">{errors.amount}</p> : null}
      </div>

      <div>
        <label htmlFor="category" className="mb-2 block text-sm font-bold text-slate-700 uppercase tracking-wide">
          Category
        </label>
        <select
          id="category"
          value={values.category}
          onChange={(event) => onChange('category', event.target.value as ExpenseCategory)}
          className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
        >
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="date" className="mb-2 block text-sm font-bold text-slate-700 uppercase tracking-wide">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={values.date}
          onChange={(event) => onChange('date', event.target.value)}
          className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
        />
        {errors.date ? <p className="mt-1 text-sm font-bold text-red-600">{errors.date}</p> : null}
      </div>

      <div>
        <label htmlFor="paymentMethod" className="mb-2 block text-sm font-bold text-slate-700 uppercase tracking-wide">
          Payment Method
        </label>
        <select
          id="paymentMethod"
          value={values.paymentMethod}
          onChange={(event) =>
            onChange('paymentMethod', event.target.value as PaymentMethod)
          }
          className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
        >
          {PAYMENT_METHODS.map((paymentMethod) => (
            <option key={paymentMethod} value={paymentMethod}>
              {paymentMethod}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="mb-2 block text-sm font-bold text-slate-700 uppercase tracking-wide">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          rows={4}
          value={values.notes ?? ''}
          onChange={(event) => onChange('notes', event.target.value)}
          className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
          placeholder="Any details to remember"
        />
      </div>

      {errors.form ? <p className="text-sm font-bold text-red-600">{errors.form}</p> : null}

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-bold text-white transition hover:shadow-lg hover:scale-105 active:scale-95"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border-2 border-slate-300 px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 active:scale-95"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

