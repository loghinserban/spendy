import { Eye, Pencil, Trash2 } from 'lucide-react'

import type { Expense } from '../types'
import { formatCurrency } from '../utils/format'

interface ExpenseTableProps {
  expenses: Expense[]
  currentPage: number
  totalPages: number
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onPreviousPage: () => void
  onNextPage: () => void
  onSelectPage: (page: number) => void
}

export function ExpenseTable({
  expenses,
  currentPage,
  totalPages,
  onView,
  onEdit,
  onDelete,
  onPreviousPage,
  onNextPage,
  onSelectPage,
}: ExpenseTableProps) {
  return (
    <section className="rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y-2 divide-slate-300 text-left text-sm">
          <thead className="bg-slate-50 text-slate-900 font-bold">
            <tr>
              <th className="px-4 py-4">Title</th>
              <th className="px-4 py-4">Amount</th>
              <th className="px-4 py-4">Category</th>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500 font-medium">
                  No expenses yet. Add your first expense to get started.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-4 font-semibold text-slate-900">{expense.title}</td>
                  <td className="px-4 py-4 font-bold text-emerald-600">{formatCurrency(expense.amount)}</td>
                  <td className="px-4 py-4 text-slate-700">{expense.category}</td>
                  <td className="px-4 py-4 text-slate-700">{expense.date}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onView(expense.id)}
                        className="rounded-lg border-2 border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100 hover:border-slate-400 active:scale-95"
                        aria-label={`View ${expense.title}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(expense.id)}
                        className="rounded-lg border-2 border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100 hover:border-slate-400 active:scale-95"
                        aria-label={`Edit ${expense.title}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(expense.id)}
                        className="rounded-lg border-2 border-red-300 p-2 text-red-600 transition hover:bg-red-50 hover:border-red-400 active:scale-95"
                        aria-label={`Delete ${expense.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
          className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1
            const isActive = page === currentPage

            return (
              <button
                key={page}
                type="button"
                onClick={() => onSelectPage(page)}
                className={`h-9 w-9 rounded-lg text-sm font-bold transition transform active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                    : 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {page}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        >
          Next
        </button>
      </div>
    </section>
  )
}

