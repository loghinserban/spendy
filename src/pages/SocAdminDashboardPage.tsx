import { AlertTriangle, FileText, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SocAccessDenied } from '../components/SocAccessDenied'
import { SocAdminLayout, type SocAdminSection } from '../components/SocAdminLayout'
import { SocAuditLogs } from '../components/SocAuditLogs'
import { SocObservationList } from '../components/SocObservationList'
import { useAuth } from '../context/AuthContext'
import type { AuditLogEntry, ObservationFlag } from '../types'
import { ApiError, apiRequest } from '../utils/apiClient'
import { getWebSocketUrl } from '../utils/expenseSync'
import {
  normalizeAuditLogResponse,
  normalizeObservationListResponse,
  parseSocRealtimeEvent,
  reviewObservationFlag,
} from '../utils/socAdminApi'

const formatTimestamp = (value: string): string => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export function SocAdminDashboardPage() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<SocAdminSection>('overview')
  const [observations, setObservations] = useState<ObservationFlag[]>([])
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [pendingFlagId, setPendingFlagId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const refreshDashboard = useCallback(async (background = false) => {
    if (background) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError(null)
    setAccessDenied(false)

    try {
      const [observationResult, auditLogResult] = await Promise.allSettled([
        apiRequest<unknown>('/api/admin/observation-list'),
        apiRequest<unknown>('/api/admin/audit-logs'),
      ])

      if (!isMountedRef.current) {
        return
      }

      if (observationResult.status === 'rejected' && observationResult.reason instanceof ApiError) {
        if (observationResult.reason.status === 401 || observationResult.reason.status === 403) {
          setAccessDenied(true)
          return
        }
      }

      if (auditLogResult.status === 'rejected' && auditLogResult.reason instanceof ApiError) {
        if (auditLogResult.reason.status === 401 || auditLogResult.reason.status === 403) {
          setAccessDenied(true)
          return
        }
      }

      if (observationResult.status === 'fulfilled') {
        setObservations(normalizeObservationListResponse(observationResult.value))
      }

      if (auditLogResult.status === 'fulfilled') {
        setLogs(normalizeAuditLogResponse(auditLogResult.value))
      }

      if (observationResult.status === 'fulfilled' || auditLogResult.status === 'fulfilled') {
        setLastSyncedAt(new Date().toISOString())
      }

      if (observationResult.status === 'rejected' || auditLogResult.status === 'rejected') {
        let failure: unknown = null

        if (observationResult.status === 'rejected') {
          failure = observationResult.reason
        } else if (auditLogResult.status === 'rejected') {
          failure = auditLogResult.reason
        }

        setError(failure instanceof Error ? failure.message : 'Failed to load the SOC dashboard.')
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return
      }

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setAccessDenied(true)
        return
      }

      setError(err instanceof Error ? err.message : 'Failed to load the SOC dashboard.')
    } finally {
      if (isMountedRef.current) {
        if (background) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    void refreshDashboard()
    return () => {
      isMountedRef.current = false
    }
  }, [refreshDashboard])

  useEffect(() => {
    if (!user) {
      return
    }

    const pollingIntervalMs = 30_000
    const pollHandle = window.setInterval(() => {
      void refreshDashboard(true)
    }, pollingIntervalMs)

    return () => {
      window.clearInterval(pollHandle)
    }
  }, [refreshDashboard, user])

  useEffect(() => {
    if (!user || typeof WebSocket === 'undefined') {
      return
    }

    const wsUrl = getWebSocketUrl()
    if (!wsUrl) {
      return
    }

    let isCancelled = false
    const socket = new WebSocket(wsUrl)

    socket.onmessage = (event: MessageEvent) => {
      if (isCancelled) {
        return
      }

      try {
        const parsed = JSON.parse(String(event.data)) as unknown
        const realtimeEvent = parseSocRealtimeEvent(parsed)

        if (realtimeEvent.refresh) {
          void refreshDashboard(true)
          return
        }

        if (realtimeEvent.observation) {
          setObservations((current) => {
            const next = current.filter((item) => item.flagID !== realtimeEvent.observation!.flagID)
            if (realtimeEvent.observation!.status === 'ACTIVE') {
              return [realtimeEvent.observation!, ...next].sort((left, right) => {
                const severityOrder = { High: 3, Medium: 2, Low: 1 } as const
                const severityDelta = severityOrder[right.severityLevel] - severityOrder[left.severityLevel]
                if (severityDelta !== 0) {
                  return severityDelta
                }

                return new Date(right.flaggedAt).getTime() - new Date(left.flaggedAt).getTime()
              })
            }

            return next
          })
        }

        if (realtimeEvent.log) {
          setLogs((current) => [realtimeEvent.log!, ...current.filter((item) => item.logID !== realtimeEvent.log!.logID)])
        }

        setLastSyncedAt(new Date().toISOString())
      } catch {
        // Ignore malformed websocket payloads; polling will resync.
      }
    }

    return () => {
      isCancelled = true
      socket.close()
    }
  }, [refreshDashboard, user])

  const handleDismissFlag = useCallback(
    async (observation: ObservationFlag) => {
      setPendingFlagId(observation.flagID)
      setStatusMessage(null)

      try {
        const reviewed = await reviewObservationFlag(observation.flagID)

        if (!isMountedRef.current) {
          return
        }

        setObservations((current) => current.filter((item) => item.flagID !== observation.flagID))
        setStatusMessage(
          reviewed?.status === 'REVIEWED'
            ? `Observation ${observation.flagID} marked as reviewed.`
            : `Observation ${observation.flagID} was reviewed.`,
        )
        setLastSyncedAt(new Date().toISOString())
        void refreshDashboard(true)
      } catch (err) {
        if (!isMountedRef.current) {
          return
        }

        setError(err instanceof Error ? err.message : 'Failed to review the selected observation.')
      } finally {
        if (isMountedRef.current) {
          setPendingFlagId(null)
        }
      }
    },
    [refreshDashboard],
  )

  const handleBanUser = useCallback((observation: ObservationFlag) => {
    setStatusMessage(
      `Ban User is currently a mock operator control for ${observation.userID}. Wire a moderation endpoint to make it destructive.`,
    )
  }, [])

  const overview = useMemo(() => {
    const highSeverity = observations.filter((item) => item.severityLevel === 'High').length
    const mediumSeverity = observations.filter((item) => item.severityLevel === 'Medium').length
    const lowSeverity = observations.filter((item) => item.severityLevel === 'Low').length
    const uniqueUsers = new Set(logs.map((entry) => entry.userID)).size
    const latestFlaggedAt = [...observations.map((item) => item.flaggedAt), ...logs.map((entry) => entry.timestamp)]
      .filter(Boolean)
      .reduce<string | null>((latest, candidate) => {
        if (!latest) {
          return candidate
        }

        return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest
      }, null)

    return {
      flaggedUsers: observations.length,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      auditEvents: logs.length,
      uniqueUsers,
      latestFlaggedAt,
    }
  }, [logs, observations])

  if (accessDenied) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-4xl items-center justify-center py-16">
          <SocAccessDenied />
        </div>
      </main>
    )
  }

  const renderOverview = () => (
    <div className="space-y-5">
      {error && (
        <div className="rounded-[24px] border border-rose-500/30 bg-rose-950/45 p-5 text-rose-100 shadow-lg shadow-rose-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-black uppercase tracking-[0.22em] text-rose-200">Dashboard error</p>
              <p className="mt-2 text-sm leading-6 text-rose-100/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshDashboard()}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-300/40 bg-white/5 px-4 py-2 text-sm font-bold text-rose-100 transition hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[24px] border border-rose-500/20 bg-gradient-to-br from-rose-500/15 to-slate-900/70 p-5 shadow-lg shadow-rose-950/15">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-200">Flagged users</p>
            <AlertTriangle className="h-5 w-5 text-rose-200" aria-hidden="true" />
          </div>
          <p className="mt-4 text-4xl font-black text-white">{overview.flaggedUsers}</p>
          <p className="mt-2 text-sm text-rose-100/80">Active observations returned by the backend threat engine.</p>
        </article>

        <article className="rounded-[24px] border border-amber-400/20 bg-gradient-to-br from-amber-500/15 to-slate-900/70 p-5 shadow-lg shadow-amber-950/15">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-100">High severity</p>
            <ShieldCheck className="h-5 w-5 text-amber-100" aria-hidden="true" />
          </div>
          <p className="mt-4 text-4xl font-black text-white">{overview.highSeverity}</p>
          <p className="mt-2 text-sm text-amber-100/80">Cases likely to require immediate investigation or mitigation.</p>
        </article>

        <article className="rounded-[24px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-slate-900/70 p-5 shadow-lg shadow-cyan-950/15">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">Audit events</p>
            <FileText className="h-5 w-5 text-cyan-100" aria-hidden="true" />
          </div>
          <p className="mt-4 text-4xl font-black text-white">{overview.auditEvents}</p>
          <p className="mt-2 text-sm text-cyan-100/80">Every system action the backend has recorded for review.</p>
        </article>

        <article className="rounded-[24px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 to-slate-900/70 p-5 shadow-lg shadow-emerald-950/15">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-100">Tracked users</p>
            <Users className="h-5 w-5 text-emerald-100" aria-hidden="true" />
          </div>
          <p className="mt-4 text-4xl font-black text-white">{overview.uniqueUsers}</p>
          <p className="mt-2 text-sm text-emerald-100/80">Unique user IDs appearing in the current audit stream.</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="rounded-[24px] border border-slate-800/80 bg-slate-900/60 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200/80">Threat posture</p>
          <h3 className="mt-3 text-2xl font-black text-white">SOC signals at a glance</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            This dashboard is designed to expose brute-force attempts, fuzzing, DDoS-like bursts, suspicious endpoint
            usage, and any other activity flagged by the active threat detection backend.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-100">High</p>
              <p className="mt-2 text-2xl font-black text-white">{overview.highSeverity}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-100">Medium</p>
              <p className="mt-2 text-2xl font-black text-white">{overview.mediumSeverity}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">Low</p>
              <p className="mt-2 text-2xl font-black text-white">{overview.lowSeverity}</p>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-800/80 bg-slate-900/60 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Session context</p>
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-semibold text-slate-200">{user?.username ?? 'Unknown operator'}</p>
            <p className="mt-1 text-sm text-slate-400 capitalize">Role: {user?.role ?? 'unknown'}</p>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              The dashboard uses secure cookie authentication, so every request is sent with credentials included.
            </p>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Latest activity</p>
            <p className="mt-2 font-mono text-sm text-cyan-100">{overview.latestFlaggedAt ? formatTimestamp(overview.latestFlaggedAt) : 'No activity yet'}</p>
          </div>
        </article>
      </section>
    </div>
  )

  return (
    <SocAdminLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      title="Security Operations Center"
      subtitle="Monitor threats, inspect raw audit trails, and triage suspicious behavior in real time."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-800/80 bg-slate-900/50 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Authenticated operator</p>
          <p className="mt-1 text-sm text-slate-200">
            Signed in as <span className="font-semibold text-white">{user?.username ?? 'unknown'}</span>
            {user?.role ? (
              <span className="ml-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
                {user.role}
              </span>
            ) : null}
          </p>
        </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                {isLoading ? 'Loading live feeds...' : isRefreshing ? 'Background refresh running...' : 'Live sync ready'}
              </div>
              <button
                type="button"
                onClick={() => void refreshDashboard()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm font-bold text-slate-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh feed
              </button>
            </div>
      </div>

          {statusMessage && (
            <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 px-5 py-4 text-sm text-cyan-100">
              {statusMessage}
            </div>
          )}

      {activeSection === 'overview' && renderOverview()}
          {activeSection === 'observations' && (
            <SocObservationList
              observations={observations}
              isLoading={isLoading}
              pendingFlagId={pendingFlagId}
              onDismissFlag={handleDismissFlag}
              onBanUser={handleBanUser}
            />
          )}
      {activeSection === 'logs' && <SocAuditLogs logs={logs} isLoading={isLoading} />}

          <div className="rounded-[24px] border border-slate-800/80 bg-slate-900/40 px-5 py-4 text-xs text-slate-400">
            Last sync:{' '}
            <span className="font-semibold text-slate-100">{lastSyncedAt ? formatTimestamp(lastSyncedAt) : 'Not yet synced'}</span>
          </div>
    </SocAdminLayout>
  )
}







