import { ArrowLeft } from 'lucide-react'
import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../types'
import { useExpenses } from '../useExpenses'
import { formatCurrency } from '../utils/format'
import {
  filterExpensesByMonth,
  formatMonthLabel,
  getCurrentMonthKey,
  getExpenseMonthOptions,
} from '../utils/month'

const CHART_COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#15803d']


export function Statistics() {
  const navigate = useNavigate()
  const { expenses } = useExpenses()
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonthKey())

  const monthOptions = useMemo(
    () => getExpenseMonthOptions(expenses, selectedMonth),
    [expenses, selectedMonth],
  )

  const filteredExpenses = useMemo(
    () => filterExpensesByMonth(expenses, selectedMonth),
    [expenses, selectedMonth],
  )

  const handleMonthChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(event.target.value)
  }, [])

  const insights = useMemo(() => {
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const average = filteredExpenses.length > 0 ? total / filteredExpenses.length : 0

    const categoryTotals = EXPENSE_CATEGORIES.map((category) => {
      const totalAmount = filteredExpenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0)

      return {
        category,
        totalAmount,
      }
    })

    const paymentMethodTotals = PAYMENT_METHODS.map((paymentMethod) => {
      const totalAmount = filteredExpenses
        .filter((expense) => expense.paymentMethod === paymentMethod)
        .reduce((sum, expense) => sum + expense.amount, 0)

      return {
        paymentMethod,
        totalAmount,
      }
    })

    const rankedCategories = [...categoryTotals]
      .filter((entry) => entry.totalAmount > 0)
      .sort((left, right) => right.totalAmount - left.totalAmount)

    const topCategory = rankedCategories[0]?.category ?? 'N/A'

    const pieData = categoryTotals
      .filter((entry) => entry.totalAmount > 0)
      .map((entry) => ({
        name: entry.category,
        value: entry.totalAmount,
      }))

    return {
      total,
      average,
      topCategory,
      pieData,
      paymentMethodTotals,
      rankedCategories,
    }
  }, [filteredExpenses])

  return (
    <main className="min-h-screen px-4 py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-50 rounded-full opacity-40 blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-50 rounded-full opacity-40 blur-3xl"></div>

      <div className="mx-auto w-full max-w-6xl space-y-6 relative z-10">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-4 mb-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Expenses
          </button>
          <h1 className="text-4xl font-black text-slate-900">Statistics & Insights</h1>
        </header>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="statistics-month-filter" className="text-sm font-bold text-slate-700">
            Month
          </label>
          <select
            id="statistics-month-filter"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="w-full max-w-xs rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-emerald-500 focus:outline-none"
          >
            {monthOptions.map((monthKey) => (
              <option key={monthKey} value={monthKey}>
                {formatMonthLabel(monthKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Key Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
            <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Total Expenses</p>
            <p className="mt-3 text-3xl font-black text-emerald-600">{formatCurrency(insights.total)}</p>
          </article>

          <article className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
            <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Average Expense</p>
            <p className="mt-3 text-3xl font-black text-teal-600">{formatCurrency(insights.average)}</p>
          </article>

          <article className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
            <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Top Category</p>
            <p className="mt-3 text-2xl font-black text-cyan-600">{insights.topCategory}</p>
          </article>
        </section>

        {/* Charts */}
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-black text-slate-900">Expenses by Category</h2>
            <div className="mt-4 h-72">
              {insights.pieData.length === 0 ? (
                <p className="pt-12 text-center text-slate-500">No data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insights.pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={105}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {insights.pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-black text-slate-900">Expenses by Payment Method</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.paymentMethodTotals}>
                  <XAxis dataKey="paymentMethod" interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Bar dataKey="totalAmount" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        {/* Breakdown Table */}
        <section className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-black text-slate-900">Category Breakdown</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b-2 border-slate-300 bg-slate-50 text-slate-900 font-bold">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {insights.rankedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      No category totals yet.
                    </td>
                  </tr>
                ) : (
                  insights.rankedCategories.map((entry, index) => (
                    <tr key={entry.category} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.category}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(entry.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

