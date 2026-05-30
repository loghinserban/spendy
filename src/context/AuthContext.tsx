import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import type { User } from '../types'
import {
  clearStoredAuth,
  readStoredToken,
  readStoredUser,
  writeStoredToken,
  writeStoredUser,
} from '../utils/authStorage'

interface AuthContextValue {
  user: User | null
  token: string | null
  error: string | null
  login: (user: User, token?: string) => void
  logout: () => void
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const testFallbackAuth: AuthContextValue = {
  user: null,
  token: null,
  error: null,
  login: () => undefined,
  logout: () => undefined,
  setUser: () => undefined,
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUserState] = useState<User | null>(() => readStoredUser())
  const [token, setTokenState] = useState<string | null>(() => readStoredToken())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      writeStoredUser(user)
    } else {
      writeStoredUser(null)
    }
  }, [user])

  useEffect(() => {
    if (token) {
      writeStoredToken(token)
    } else {
      writeStoredToken(null)
    }
  }, [token])

  const login = useCallback((userData: User, token?: string) => {
    setUserState(userData)
    setTokenState(token ?? null)
    setError(null)
  }, [])

  const logout = useCallback(() => {
    setUserState(null)
    setTokenState(null)
    clearStoredAuth()
    setError(null)
  }, [])

  const setUser = useCallback((userData: User | null) => {
    setUserState(userData)
    writeStoredUser(userData)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      error,
      login,
      logout,
      setUser,
    }),
    [user, token, error, login, logout, setUser],
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
      return testFallbackAuth
    }

    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}




