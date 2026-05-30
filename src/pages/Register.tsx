import { ArrowLeft, Loader } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { writePendingLoginChallenge } from '../utils/authStorage'
import { register as registerApi } from '../utils/authApi'

function validateRegisterForm(username: string, email: string, password: string, confirmPassword: string): string | null {
  if (!username.trim()) {
    return 'Full name is required.'
  }

  if (!email.trim()) {
    return 'Email is required.'
  }

  if (!password.trim()) {
    return 'Password is required.'
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long.'
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.'
  }

  return null
}

export function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateRegisterForm(username, email, password, confirmPassword)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const response = await registerApi(username, email, password)
      writePendingLoginChallenge(null)
      login(response.user, response.token)
      navigate('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-teal-100 rounded-full opacity-20 blur-2xl"></div>
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-100 rounded-full opacity-20 blur-2xl"></div>

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
            <div className="absolute top-0 right-8 w-16 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>

            <div className="mb-2">
              <h1 className="text-3xl font-black text-slate-900">Register</h1>
              <p className="text-sm text-slate-500 mt-1">Create your account and start tracking</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              {error && (
                <div className="p-3 bg-red-100 border-2 border-red-300 rounded-lg text-red-700 text-sm font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="register-name" className="mb-2 block text-sm font-bold text-slate-700">
                  Full Name
                </label>
                <input
                  id="register-name"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
                  placeholder="John Doe"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="register-email" className="mb-2 block text-sm font-bold text-slate-700">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
                  placeholder="********"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="register-confirm-password"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Confirm Password
                </label>
                <input
                  id="register-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="handmade-input w-full border-2 border-slate-300 rounded-xl px-4 py-3"
                  placeholder="********"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3.5 font-bold text-white transition hover:shadow-lg hover:scale-105 active:scale-95 mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader className="h-4 w-4 animate-spin" />}
                {isLoading ? 'Registering...' : 'Register'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-teal-600 hover:text-teal-700 transition">
                Login
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}

