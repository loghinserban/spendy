import { BarChart3, LogOut, MessageCircle, PlusCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ChatPanel } from '../components/ChatPanel'
import { ExpenseTable } from '../components/ExpenseTable'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/format'
import {
  filterExpensesByMonth,
  formatMonthLabel,
  getCurrentMonthKey,
  getExpenseMonthOptions,
} from '../utils/month'
import { useExpenses } from '../useExpenses'

const PAGE_SIZE = 5

function parsePage(rawPage: string | null): number {
  const page = Number(rawPage)

  if (!Number.isInteger(page) || page < 1) {
    return 1
  }

  return page
}

export function DashboardPage() {
  const { expenses, deleteExpense } = useExpenses()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isChatOpen, setIsChatOpen] = useState(false)

  const requestedPage = parsePage(searchParams.get('page'))
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonthKey())

  const monthOptions = useMemo(
    () => getExpenseMonthOptions(expenses, selectedMonth),
    [expenses, selectedMonth],
  )

  const filteredExpenses = useMemo(
    () => filterExpensesByMonth(expenses, selectedMonth),
    [expenses, selectedMonth],
  )

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE))
  const safePage = Math.min(requestedPage, totalPages)

  const paginatedExpenses = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredExpenses.slice(start, start + PAGE_SIZE)
  }, [filteredExpenses, safePage])

  const setPage = useCallback(
    (page: number) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('page', String(page))
        return next
      })
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (requestedPage > totalPages) {
      setPage(totalPages)
    }
  }, [requestedPage, setPage, totalPages])

  const handleMonthChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setSelectedMonth(event.target.value)
      setPage(1)
    },
    [setPage],
  )

  const handleDelete = (id: string) => {
    const removed = deleteExpense(id)

    if (!removed) {
      return
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Keep cards and table perfectly in sync by deriving both from the same array.
  const summary = useMemo(() => {
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const totalLogged = filteredExpenses.length
    const average = totalLogged > 0 ? total / totalLogged : 0

    return { total, totalLogged, average }
  }, [filteredExpenses])

  const canAccessAdminTools = user?.role === 'admin' || Boolean(user?.permissions?.manage_users)

  return (
    <main className="min-h-screen px-4 py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-50 rounded-full opacity-30 blur-3xl"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-50 rounded-full opacity-30 blur-3xl"></div>

      <div className="mx-auto w-full max-w-6xl space-y-6 relative z-10">
        {/* Header Section */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900">Dashboard</h1>
              {user && (
                <p className="mt-2 text-slate-600">
                  Welcome, <span className="font-bold text-emerald-600">{user.username}</span> (
                  <span className="capitalize font-bold text-teal-600">{user.role}</span>)
                </p>
              )}
              <p className="mt-1 text-slate-600">Manage your expenses with ease</p>
              {canAccessAdminTools && (
                <p className="mt-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  Admin tools enabled
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-white px-4 py-2.5 font-bold text-emerald-600 transition hover:bg-emerald-50 hover:border-emerald-400 active:scale-95"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Chat
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-red-300 bg-white px-4 py-2.5 font-bold text-red-600 transition hover:bg-red-50 hover:border-red-400 active:scale-95"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
              <Link
                to="/setup-2fa"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-white px-4 py-2.5 font-bold text-emerald-600 transition hover:bg-emerald-50 hover:border-emerald-400 active:scale-95"
              >
                Enable 2FA
              </Link>
              <Link
                to="/statistics"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 active:scale-95"
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                Stats
              </Link>
              <Link
                to="/expenses/new"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 font-bold text-white transition hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Add Expense
              </Link>
              {canAccessAdminTools && (
                <Link
                  to="/soc-admin"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-indigo-300 bg-white px-4 py-2.5 font-bold text-indigo-600 transition hover:bg-indigo-50 hover:border-indigo-400 active:scale-95"
                >
                  Admin Console
                </Link>
              )}
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="dashboard-month-filter" className="text-sm font-bold text-slate-700">
              Month
            </label>
            <select
              id="dashboard-month-filter"
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

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 hover:shadow-lg transition">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Total Expenses</p>
              <p className="mt-3 text-3xl font-black text-emerald-600">{formatCurrency(summary.total)}</p>
            </div>
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 hover:shadow-lg transition">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Total Logged</p>
              <p className="mt-3 text-3xl font-black text-teal-600">{summary.totalLogged}</p>
            </div>
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 hover:shadow-lg transition">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Average</p>
              <p className="mt-3 text-3xl font-black text-cyan-600">{formatCurrency(summary.average)}</p>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <ExpenseTable
          expenses={paginatedExpenses}
          currentPage={safePage}
          totalPages={totalPages}
          onView={(id) => navigate(`/expenses/${id}`)}
          onEdit={(id) => navigate(`/expenses/${id}/edit`)}
          onDelete={handleDelete}
          onPreviousPage={() => setPage(Math.max(1, safePage - 1))}
          onNextPage={() => setPage(Math.min(totalPages, safePage + 1))}
         onSelectPage={setPage}
         />
       </div>

       {/* Chat Panel */}
       <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
     </main>
   )
 }

