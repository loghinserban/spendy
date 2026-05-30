import { apiRequest } from './apiClient'
import type { AuditLogEntry, ObservationFlag, ObservationStatus, SeverityLevel } from '../types'

type RawObservation = Partial<Record<'flagID' | 'flagId' | 'userID' | 'userId' | 'reason' | 'severityLevel' | 'flaggedAt' | 'status', unknown>>

type RawAuditLog = Partial<Record<'logID' | 'logId' | 'userID' | 'userId' | 'groupID' | 'groupId' | 'actionInformation' | 'timestamp', unknown>>

type SocWebSocketEvent = {
  type?: string
  observation?: unknown
  log?: unknown
  data?: unknown
  flagId?: unknown
  flagID?: unknown
  logId?: unknown
  logID?: unknown
}

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export const normalizeSeverityLevel = (value: unknown): SeverityLevel => {
  if (typeof value === 'number') {
    if (value >= 8) {
      return 'High'
    }

    if (value >= 7) {
      return 'Medium'
    }

    return 'Low'
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'high') {
      return 'High'
    }

    if (normalized === 'medium') {
      return 'Medium'
    }

    if (normalized === 'low') {
      return 'Low'
    }
  }

  return 'Low'
}

const normalizeObservationStatus = (value: unknown): ObservationStatus => {
  if (typeof value !== 'string') {
    return 'ACTIVE'
  }

  const normalized = value.trim().toUpperCase()

  if (normalized === 'REVIEWED') {
    return 'REVIEWED'
  }

  return 'ACTIVE'
}

const normalizeObservation = (value: unknown): ObservationFlag | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const raw = value as RawObservation
  const flagID = normalizeString(raw.flagID ?? raw.flagId)
  const userID = normalizeString(raw.userID ?? raw.userId)
  const reason = normalizeString(raw.reason)
  const flaggedAt = normalizeString(raw.flaggedAt)

  if (!flagID || !userID || !reason || !flaggedAt) {
    return null
  }

  return {
    flagID,
    userID,
    reason,
    severityLevel: normalizeSeverityLevel(raw.severityLevel),
    flaggedAt,
    status: normalizeObservationStatus(raw.status),
  }
}

export const normalizeObservationListResponse = (payload: unknown): ObservationFlag[] => {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? ((payload as { data: unknown[] }).data as unknown[])
      : []

  return items
    .map((item) => normalizeObservation(item))
    .filter((item): item is ObservationFlag => item !== null)
    .filter((item) => item.status === 'ACTIVE')
}

const formatActionInformation = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (!value || typeof value !== 'object') {
    return ''
  }

  const action = value as Record<string, unknown>
  const method = normalizeString(action.method)
  const endpoint = normalizeString(action.endpoint)
  const summary = normalizeString(action.summary)
  const payloadSnippet = action.payloadSnippet

  if (summary) {
    return summary
  }

  const base = [method, endpoint].filter(Boolean).join(' ')

  if (payloadSnippet === undefined || payloadSnippet === null || payloadSnippet === '') {
    return base
  }

  const payloadText = typeof payloadSnippet === 'string' ? payloadSnippet : JSON.stringify(payloadSnippet)
  return base ? `${base} payload=${payloadText}` : payloadText
}

const normalizeAuditLog = (value: unknown): AuditLogEntry | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const raw = value as RawAuditLog
  const logID = normalizeString(raw.logID ?? raw.logId)
  const userID = normalizeString(raw.userID ?? raw.userId)
  const groupID = normalizeString(raw.groupID ?? raw.groupId)
  const timestamp = normalizeString(raw.timestamp)
  const actionInformation = formatActionInformation(raw.actionInformation)

  if (!logID || !userID || !groupID || !timestamp || !actionInformation) {
    return null
  }

  return {
    logID,
    userID,
    groupID: groupID.toUpperCase() === 'ADMIN' ? 'Admin' : 'User',
    actionInformation,
    timestamp,
  }
}

export const normalizeAuditLogResponse = (payload: unknown): AuditLogEntry[] => {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? ((payload as { data: unknown[] }).data as unknown[])
      : []

  return items.map((item) => normalizeAuditLog(item)).filter((item): item is AuditLogEntry => Boolean(item))
}

export const reviewObservationFlag = async (flagId: string): Promise<ObservationFlag | null> => {
  const response = await apiRequest<unknown>(`/api/admin/observation-list/${encodeURIComponent(flagId)}/review`, {
    method: 'PATCH',
  })

  const reviewed = normalizeObservation(response)
  if (reviewed) {
    return reviewed
  }

  if (response && typeof response === 'object' && 'data' in response) {
    return normalizeObservation((response as { data?: unknown }).data)
  }

  return null
}

export const toObservationKey = (observation: ObservationFlag): string => observation.flagID

export const toAuditLogKey = (entry: AuditLogEntry): string => entry.logID

export const parseSocRealtimeEvent = (payload: unknown): { observation?: ObservationFlag; log?: AuditLogEntry; refresh?: boolean } => {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const raw = payload as SocWebSocketEvent
  const eventType = normalizeString(raw.type)?.toUpperCase()
  const packet = raw.data ?? payload

  if (eventType === 'SOC_REFRESH' || eventType === 'ADMIN_REFRESH' || eventType === 'AUDIT_REFRESH') {
    return { refresh: true }
  }

  const observationCandidate = raw.observation ?? raw.data ?? raw.flagId ?? raw.flagID
  const logCandidate = raw.log ?? raw.data ?? raw.logId ?? raw.logID

  const observation = normalizeObservation(observationCandidate)
  const log = normalizeAuditLog(logCandidate)

  if (observation || log) {
    return { observation: observation ?? undefined, log: log ?? undefined }
  }

  if (packet && typeof packet === 'object') {
    const packetObject = packet as Record<string, unknown>
    if (packetObject.flagId || packetObject.flagID) {
      return { observation: normalizeObservation(packetObject) ?? undefined }
    }

    if (packetObject.logId || packetObject.logID) {
      return { log: normalizeAuditLog(packetObject) ?? undefined }
    }
  }

  return {}
}





