import { Ban, BellRing, CircleOff, LoaderCircle, ShieldAlert } from 'lucide-react'

import type { ObservationFlag, SeverityLevel } from '../types'

type SocObservationListProps = {
  observations: ObservationFlag[]
  isLoading?: boolean
  pendingFlagId?: string | null
  onDismissFlag?: (observation: ObservationFlag) => void | Promise<void>
  onBanUser?: (observation: ObservationFlag) => void | Promise<void>
}

const severityStyles: Record<SeverityLevel, string> = {
  High: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
  Medium: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
  Low: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
}

const formatTimestamp = (value: string): string => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export function SocObservationList({
  observations,
  isLoading = false,
  pendingFlagId = null,
  onDismissFlag,
  onBanUser,
}: SocObservationListProps) {
  if (isLoading) {
    return (
      <section className="rounded-[24px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
        <div className="flex items-center gap-3 text-cyan-100">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="font-semibold">Loading active threat observations...</span>
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl border border-slate-800/80 bg-slate-950/50" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[24px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-rose-100">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Active threats
          </div>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-white">Observation List</h3>
          <p className="mt-2 text-sm text-slate-400">
            Flagged sessions, suspicious automation, and abuse patterns detected by the backend threat engine.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          {observations.length} flagged {observations.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.2em] text-slate-400">
              <th className="px-4 py-2">Flag ID</th>
              <th className="px-4 py-2">User ID</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Flagged At</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {observations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No active threat observations were returned.
                </td>
              </tr>
            ) : (
              observations.map((observation) => (
                <tr key={observation.flagID} className="group rounded-2xl border border-slate-800/80 bg-slate-950/55 text-slate-100 shadow-sm shadow-slate-950/10 transition hover:border-cyan-300/30 hover:bg-slate-900/90">
                  <td className="rounded-l-2xl px-4 py-4 font-mono text-xs text-cyan-100">{observation.flagID}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-200">{observation.userID}</td>
                  <td className="px-4 py-4 text-slate-100">{observation.reason}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${severityStyles[observation.severityLevel]}`}
                    >
                      <CircleOff className="h-3 w-3" aria-hidden="true" />
                      {observation.severityLevel}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{formatTimestamp(observation.flaggedAt)}</td>
                  <td className="rounded-r-2xl px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void onDismissFlag?.(observation)}
                        disabled={pendingFlagId === observation.flagID || !onDismissFlag}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                        {pendingFlagId === observation.flagID ? 'Dismissing...' : 'Dismiss Flag'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onBanUser?.(observation)}
                        disabled={pendingFlagId === observation.flagID && Boolean(onDismissFlag)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                        Ban User
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}



