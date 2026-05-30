import { ArrowLeft, CalendarDays, CreditCard, FolderKanban, StickyNote } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { useExpenses } from '../useExpenses'
import { formatCurrency } from '../utils/format'

export function ExpenseDetailPage() {
  const { expenseId = '' } = useParams()
  const { getExpenseById } = useExpenses()
  const expense = getExpenseById(expenseId)

  if (!expense) {
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

  return (
    <main className="min-h-screen px-4 py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-teal-100 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-emerald-100 rounded-full opacity-20 blur-3xl"></div>

      <div className="mx-auto w-full max-w-3xl space-y-6 relative z-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-slate-900 hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>

        <section className="bg-white border-2 border-slate-300 rounded-3xl p-8 shadow-lg">
          <div className="mb-2">
            <h1 className="text-4xl font-black text-slate-900">{expense.title}</h1>
            <p className="mt-3 text-5xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {formatCurrency(expense.amount)}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-slate-300 p-5 bg-slate-50 hover:bg-slate-100 transition">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                <FolderKanban className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                Category
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">{expense.category}</p>
            </div>
            <div className="rounded-2xl border-2 border-slate-300 p-5 bg-slate-50 hover:bg-slate-100 transition">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                <CalendarDays className="h-5 w-5 text-teal-600" aria-hidden="true" />
                Date
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">{expense.date}</p>
            </div>
            <div className="rounded-2xl border-2 border-slate-300 p-5 bg-slate-50 hover:bg-slate-100 transition">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                <CreditCard className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                Payment Method
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">{expense.paymentMethod}</p>
            </div>
            <div className="rounded-2xl border-2 border-slate-300 p-5 bg-slate-50 hover:bg-slate-100 transition">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                <StickyNote className="h-5 w-5 text-amber-600" aria-hidden="true" />
                Notes
              </p>
              <p className="mt-2 text-sm text-slate-700 font-medium">{expense.notes?.trim() ? expense.notes : 'No notes'}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

