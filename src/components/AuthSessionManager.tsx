import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

const DEFAULT_INACTIVITY_MINUTES = 5
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'mousedown', 'scroll', 'touchstart'] as const

const getInactivityTimeoutMs = (): number => {
  const raw = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_INACTIVITY_TIMEOUT_MINUTES : undefined
  const parsed = Number(raw)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_INACTIVITY_MINUTES * 60 * 1000
  }

  return parsed * 60 * 1000
}

export function AuthSessionManager() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user || !token) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }

      return
    }

    const timeoutMs = getInactivityTimeoutMs()

    const resetTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }

      timerRef.current = window.setTimeout(() => {
        logout()
        navigate('/login?reason=timeout', { replace: true })
      }, timeoutMs)
    }

    const handleActivity = () => {
      resetTimer()
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true })
    }

    resetTimer()

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity)
      }
    }
  }, [logout, navigate, token, user])

  return null
}

