import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { ExpenseForm, type ExpenseFormErrors } from '../components/ExpenseForm'
import { trackActivity } from '../tracker'
import type { ExpenseInput } from '../types'
import { useExpenses } from '../useExpenses'
import { validateExpense } from '../validation'

interface ExpenseFormPageProps {
  mode: 'create' | 'edit'
}

function buildDefaultExpenseInput(): ExpenseInput {
  return {
    title: '',
    amount: 0,
    category: 'Food & Dining',
    date: '',
    paymentMethod: 'Credit Card',
    notes: '',
  }
}

function mapValidationErrors(messages: string[]): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {}

  for (const message of messages) {
    if (message === 'Title is required.') {
      errors.title = message
    }

    if (message === 'Amount must be greater than 0.') {
      errors.amount = message
    }

    if (message === 'Date is required.') {
      errors.date = message
    }
  }

  return errors
}

export function ExpenseFormPage({ mode }: ExpenseFormPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { expenseId = '' } = useParams()
  const { addExpense, updateExpense, getExpenseById } = useExpenses()
  const selectedExpense = mode === 'edit' ? getExpenseById(expenseId) : undefined

  const [values, setValues] = useState<ExpenseInput>(() =>
    selectedExpense
      ? {
          title: selectedExpense.title,
          amount: selectedExpense.amount,
          category: selectedExpense.category,
          date: selectedExpense.date,
          paymentMethod: selectedExpense.paymentMethod,
          notes: selectedExpense.notes ?? '',
        }
      : buildDefaultExpenseInput(),
  )
  const [errors, setErrors] = useState<ExpenseFormErrors>({})

  const title = useMemo(
    () => (mode === 'create' ? 'Add New Expense' : 'Edit Expense'),
    [mode],
  )

  if (mode === 'edit' && !selectedExpense) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border-2 border-red-300 bg-white p-8 shadow-lg">
          <p className="text-lg font-bold text-red-600">Expense not found.</p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 transition hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  const handleChange = <K extends keyof ExpenseInput>(field: K, value: ExpenseInput[K]) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }))
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined, form: undefined }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    trackActivity(`${location.pathname}${location.search}`)

    const validation = validateExpense(values)
    if (!validation.isValid) {
      setErrors(mapValidationErrors(validation.errors))
      return
    }

    try {
      if (mode === 'create') {
        addExpense(values)
      } else {
        const updated = updateExpense(expenseId, values)

        if (!updated) {
          setErrors({ form: 'Expense could not be updated.' })
          return
        }
      }

      navigate('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.'
      setErrors({ ...mapValidationErrors([message]), form: message })
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-100 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-100 rounded-full opacity-20 blur-3xl"></div>

      <div className="mx-auto w-full max-w-3xl space-y-6 relative z-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-slate-900 hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>

        <section>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">All data is kept in RAM and resets on refresh.</p>
        </section>

        <ExpenseForm
          mode={mode}
          values={values}
          errors={errors}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/dashboard')}
        />
      </div>
    </main>
  )
}

