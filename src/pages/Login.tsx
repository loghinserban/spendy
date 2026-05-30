import { ArrowLeft, Loader } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { writePendingLoginChallenge } from '../utils/authStorage'
import { login as loginApi } from '../utils/authApi'

function validateLoginForm(username: string, password: string): string | null {
  if (!username.trim()) {
    return 'Username is required.'
  }

  if (!password.trim()) {
    return 'Password is required.'
  }

  return null
}

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const timeoutMessage = useMemo(
    () => (searchParams.get('reason') === 'timeout' ? 'You were signed out after inactivity.' : null),
    [searchParams],
  )

  useEffect(() => {
    if (timeoutMessage) {
      setError(timeoutMessage)
    }
  }, [timeoutMessage, location.key])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateLoginForm(username, password)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const response = await loginApi(username, password)
      if (response.preAuthToken) {
        writePendingLoginChallenge({ username, preAuthToken: response.preAuthToken })
        navigate('/verify-code')
        return
      }

      if (response.user && response.token) {
        writePendingLoginChallenge(null)
        login(response.user, response.token)
        navigate('/dashboard')
        return
      }

      setError('Login succeeded, but the server returned an unexpected response.')
    } catch (err) {

      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-100 rounded-full opacity-20 blur-2xl"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-teal-100 rounded-full opacity-20 blur-2xl"></div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 relative z-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-900 hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </button>

        <div className="mx-auto w-full max-w-md">
          <section className="bg-white border-2 border-slate-300 p-8 shadow-lg rounded-3xl relative">
            {/* Decorative accent line */}
            <div className="absolute top-0 left-8 w-16 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>

            <div className="mb-2">
              <h1 className="text-3xl font-black text-slate-900">Login</h1>
              <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              {error && (
                <div className="p-3 bg-red-100 border-2 border-red-300 rounded-lg text-red-700 text-sm font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="login-username" className="mb-2 block text-sm font-bold text-slate-700">
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
                  placeholder="your-username"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-bold text-slate-700">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
                  placeholder="********"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 font-bold text-white transition hover:shadow-lg hover:scale-105 active:scale-95 mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader className="h-4 w-4 animate-spin" />}
                {isLoading ? 'Logging in...' : 'Login'}
              </button>

              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <Link to="/forgot-password" className="font-semibold text-slate-600 hover:text-slate-900 transition">
                  Forgot password?
                </Link>
                <span className="text-slate-400">Need a verification code? We’ll guide you after password entry.</span>
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              No account?{' '}
              <Link to="/register" className="font-bold text-emerald-600 hover:text-emerald-700 transition">
                Register
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}

