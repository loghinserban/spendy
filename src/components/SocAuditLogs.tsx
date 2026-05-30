import { ChevronLeft, ChevronRight, FileSearch, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'

import type { AuditLogEntry } from '../types'

type SocAuditLogsProps = {
  logs: AuditLogEntry[]
  isLoading?: boolean
}

const PAGE_SIZE = 8

const formatTimestamp = (value: string): string => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export function SocAuditLogs({ logs, isLoading = false }: SocAuditLogsProps) {
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return logs
    }

    return logs.filter((entry) => {
      return (
        entry.userID.toLowerCase().includes(normalizedQuery) ||
        entry.actionInformation.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [logs, query])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
  }, [query])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredLogs.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, filteredLogs])

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
  }

  if (isLoading) {
    return (
      <section className="rounded-[24px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
        <div className="flex items-center gap-3 text-cyan-100">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="font-semibold">Loading raw audit logs...</span>
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-2xl border border-slate-800/80 bg-slate-950/50" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[24px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-cyan-100">
            <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
            Activity stream
          </div>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-white">Raw Audit Logs</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Every admin and user action captured by the backend, including endpoint usage and payload snippets.
          </p>
        </div>

        <div className="w-full max-w-xl">
          <label htmlFor="soc-audit-log-search" className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            Search by User ID or Action
          </label>
          <input
            id="soc-audit-log-search"
            type="search"
            value={query}
            onChange={handleQueryChange}
            placeholder="e.g. user-42, /api/auth/login, payload snippet"
            className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/75 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-xs sm:text-sm">
          <thead>
            <tr className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
              <th className="px-3 py-2">Log ID</th>
              <th className="px-3 py-2">User ID</th>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Action Information</th>
              <th className="px-3 py-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No audit log entries match your search.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((entry) => (
                <tr
                  key={entry.logID}
                  className="rounded-2xl border border-slate-800/80 bg-slate-950/55 text-slate-100 transition hover:border-cyan-300/30 hover:bg-slate-900/90"
                >
                  <td className="rounded-l-2xl px-3 py-3 font-mono text-[0.72rem] text-cyan-100 sm:text-xs">{entry.logID}</td>
                  <td className="px-3 py-3 font-mono text-[0.72rem] text-slate-200 sm:text-xs">{entry.userID}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-bold uppercase tracking-[0.18em] ${
                        entry.groupID === 'Admin'
                          ? 'border-violet-400/40 bg-violet-500/10 text-violet-100'
                          : 'border-slate-500/40 bg-slate-700/40 text-slate-100'
                      }`}
                    >
                      {entry.groupID}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-100">
                    <code className="block max-w-[42rem] overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 font-mono text-[0.72rem] text-slate-200">
                      {entry.actionInformation}
                    </code>
                  </td>
                  <td className="rounded-r-2xl px-3 py-3 text-slate-300">{formatTimestamp(entry.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-800/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          Showing{' '}
          <span className="font-semibold text-slate-100">
            {filteredLogs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-slate-100">
            {Math.min(currentPage * PAGE_SIZE, filteredLogs.length)}
          </span>{' '}
          of <span className="font-semibold text-slate-100">{filteredLogs.length}</span> entries
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage <= 1}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Prev
          </button>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-sm font-bold text-cyan-100">
            Page {currentPage} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}

