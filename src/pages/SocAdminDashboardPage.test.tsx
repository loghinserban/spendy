import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SocAdminDashboardPage } from './SocAdminDashboardPage'
import { ApiError } from '../utils/apiClient'

const mockApiRequest = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', username: 'secops', role: 'admin', permissions: {} },
    token: 'token-123',
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
  }),
}))

vi.mock('../utils/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../utils/apiClient')>('../utils/apiClient')

  return {
    ...actual,
    apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  }
})

describe('SocAdminDashboardPage', () => {
  beforeEach(() => {
    mockApiRequest.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('loads the SOC overview and lets operators search and paginate audit logs', async () => {
    let observations = [
      {
        flagID: 'flag-1',
        userID: 'user-12',
        reason: 'Brute Force Detected',
        severityLevel: 'High',
        flaggedAt: '2026-05-21T10:00:00.000Z',
      },
      {
        flagID: 'flag-2',
        userID: 'user-44',
        reason: 'OWASP ZAP fuzzing pattern',
        severityLevel: 'Medium',
        flaggedAt: '2026-05-21T11:00:00.000Z',
      },
    ]

    const logs = [
      {
        logID: 'log-1',
        userID: 'user-1',
        groupID: 'User',
        actionInformation: 'POST /api/auth/login payload={"username":"user-1"}',
        timestamp: '2026-05-21T08:00:00.000Z',
      },
      {
        logID: 'log-2',
        userID: 'user-2',
        groupID: 'Admin',
        actionInformation: 'GET /api/admin/observation-list payload={}',
        timestamp: '2026-05-21T08:01:00.000Z',
      },
      {
        logID: 'log-3',
        userID: 'user-3',
        groupID: 'User',
        actionInformation: 'POST /api/search payload={"q":"zap fuzz"}',
        timestamp: '2026-05-21T08:02:00.000Z',
      },
      {
        logID: 'log-4',
        userID: 'user-4',
        groupID: 'User',
        actionInformation: 'GET /api/health payload={}',
        timestamp: '2026-05-21T08:03:00.000Z',
      },
      {
        logID: 'log-5',
        userID: 'user-5',
        groupID: 'User',
        actionInformation: 'POST /api/orders payload={"items":3}',
        timestamp: '2026-05-21T08:04:00.000Z',
      },
      {
        logID: 'log-6',
        userID: 'user-6',
        groupID: 'Admin',
        actionInformation: 'DELETE /api/admin/users/user-6 payload={}',
        timestamp: '2026-05-21T08:05:00.000Z',
      },
      {
        logID: 'log-7',
        userID: 'user-7',
        groupID: 'User',
        actionInformation: 'POST /api/payments payload={"amount":88}',
        timestamp: '2026-05-21T08:06:00.000Z',
      },
      {
        logID: 'log-8',
        userID: 'user-8',
        groupID: 'User',
        actionInformation: 'GET /api/admin/audit-logs payload={"page":1}',
        timestamp: '2026-05-21T08:07:00.000Z',
      },
      {
        logID: 'log-9',
        userID: 'user-9',
        groupID: 'User',
        actionInformation: 'POST /api/metrics payload={"source":"jmeter"}',
        timestamp: '2026-05-21T08:08:00.000Z',
      },
    ]

    mockApiRequest.mockImplementation((path: string) => {
      if (path.includes('/api/admin/observation-list/') && path.endsWith('/review')) {
        observations = observations.filter((observation) => !path.includes(observation.flagID))
        return Promise.resolve({
          flagID: 'flag-1',
          userID: 'user-12',
          reason: 'Brute Force Detected',
          severityLevel: 'High',
          flaggedAt: '2026-05-21T10:00:00.000Z',
          status: 'REVIEWED',
        })
      }

      if (path.includes('/api/admin/observation-list')) {
        return Promise.resolve(observations)
      }

      if (path.includes('/api/admin/audit-logs')) {
        return Promise.resolve(logs)
      }

      return Promise.reject(new Error(`Unexpected path: ${path}`))
    })

    render(<SocAdminDashboardPage />)

    fireEvent.click(screen.getByRole('button', { name: /Observation List/i }))
    expect(await screen.findByText('flag-1')).toBeInTheDocument()

    expect(await screen.findByText('Brute Force Detected')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Ban User/i })).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button', { name: /Dismiss Flag/i })[0])

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('/api/admin/observation-list/flag-1/review', {
        method: 'PATCH',
      })
      expect(screen.queryByText('flag-1')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Raw Audit Logs/i }))
    expect(await screen.findByText('log-1')).toBeInTheDocument()
    expect(screen.queryByText('log-9')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('log-9')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search by User ID or Action'), {
      target: { value: 'jmeter' },
    })

    await waitFor(() => {
      expect(screen.getByText('log-9')).toBeInTheDocument()
      expect(screen.queryByText('log-1')).not.toBeInTheDocument()
    })
  })

  it('shows a strict access denied screen when the backend returns 403', async () => {
    mockApiRequest.mockRejectedValue(new ApiError('Forbidden', 403))

    render(<SocAdminDashboardPage />)

    expect(await screen.findByRole('heading', { name: 'Access Denied' })).toBeInTheDocument()
    expect(screen.getByText('HTTP 401 / 403')).toBeInTheDocument()
  })
})








