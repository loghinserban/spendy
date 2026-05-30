import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

type RequireAuthProps = {
  children: ReactNode
  allowedRoles?: Array<'admin' | 'user' | 'moderator'>
}

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { user, token } = useAuth()
  const location = useLocation()

  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

