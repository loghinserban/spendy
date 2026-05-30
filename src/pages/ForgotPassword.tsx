import { ArrowLeft, Loader } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { forgotPassword, resetPassword } from '../utils/authApi'

export function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receivedToken, setReceivedToken] = useState('')

  const handleRequestToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setStatusMessage(null)
    setIsSubmitting(true)

    try {
      const response = await forgotPassword(email.trim())
      setReceivedToken(response.token ?? '')
      setStatusMessage(response.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Password reset request failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setStatusMessage(null)

    if (!resetToken.trim()) {
      setError('Reset token is required.')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await resetPassword(resetToken.trim(), newPassword)
      setStatusMessage(response.message)
      setTimeout(() => navigate('/login'), 600)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Password reset failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-100 rounded-full opacity-20 blur-2xl"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-teal-100 rounded-full opacity-20 blur-2xl"></div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 relative z-10">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-900 hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to login
        </button>

        <div className="mx-auto w-full max-w-2xl rounded-3xl border-2 border-slate-300 bg-white p-8 shadow-lg">
          <h1 className="text-3xl font-black text-slate-900">Password Recovery</h1>
          <p className="mt-2 text-sm text-slate-500">
            Request a reset token, then use it to set a new password.
          </p>

          <div className="mt-8 grid gap-8">
            <section className="rounded-2xl border-2 border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-900">Step 1: Request a reset token</h2>
              <form onSubmit={handleRequestToken} noValidate className="mt-4 space-y-4">
                <label htmlFor="forgot-email" className="block text-sm font-bold text-slate-700">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                  className="handmade-input w-full rounded-xl border-2 border-slate-300 px-4 py-3"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-bold text-white transition hover:shadow-lg disabled:opacity-50"
                >
                  {isSubmitting && <Loader className="h-4 w-4 animate-spin" />}
                  Send recovery email
                </button>
              </form>
            </section>

            <section className="rounded-2xl border-2 border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-900">Step 2: Reset your password</h2>
              <form onSubmit={handleResetPassword} noValidate className="mt-4 space-y-4">
                <div>
                  <label htmlFor="forgot-token" className="mb-2 block text-sm font-bold text-slate-700">
                    Reset token
                  </label>
                  <input
                    id="forgot-token"
                    type="text"
                    required
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    placeholder="Paste the token from the response"
                    disabled={isSubmitting}
                    className="handmade-input w-full rounded-xl border-2 border-slate-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label htmlFor="forgot-new-password" className="mb-2 block text-sm font-bold text-slate-700">
                    New password
                  </label>
                  <input
                    id="forgot-new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    disabled={isSubmitting}
                    className="handmade-input w-full rounded-xl border-2 border-slate-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="forgot-confirm-password"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="forgot-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={isSubmitting}
                    className="handmade-input w-full rounded-xl border-2 border-slate-300 px-4 py-3"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {isSubmitting && <Loader className="h-4 w-4 animate-spin" />}
                  Reset password
                </button>
              </form>
            </section>
          </div>

          {(error || statusMessage) && (
            <div
              className={`mt-6 rounded-xl border-2 p-4 text-sm font-semibold ${error ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}
            >
              {error ?? statusMessage}
              {receivedToken ? (
                <p className="mt-2 break-all text-xs font-normal opacity-80">Dev token: {receivedToken}</p>
              ) : null}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            Remembered it?{' '}
            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 transition">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

