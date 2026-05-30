import { ArrowLeft, Loader, ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import $ from 'jquery'

import { useAuth } from '../context/AuthContext'
import { readPendingLoginChallenge, writePendingLoginChallenge } from '../utils/authStorage'
import { verifyTwoFactorLogin } from '../utils/authApi'

export function VerifyCode() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [code, setCode] = useState('')
  const [challenge] = useState(() => readPendingLoginChallenge())
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!challenge) {
      navigate('/login', { replace: true })
    }
  }, [challenge, navigate])

  useEffect(() => {
    if (challenge) {
      window.setTimeout(() => {
        $('#verification-code').trigger('focus')
      }, 0)
    }
  }, [challenge])

  useEffect(() => {
    if (error) {
      const alert = $('#verification-alert')
      alert.stop(true, true).hide().fadeIn(150)
    }
  }, [error])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!challenge) {
      setError('Please return to the login screen and start again.')
      return
    }

    if (!code.trim()) {
      setError('Verification code is required.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await verifyTwoFactorLogin(challenge.preAuthToken, code.trim())

      if (response.user && response.token) {
        login(response.user, response.token)
      } else {
        setError('The server returned an unexpected verification response.')
        return
      }

      writePendingLoginChallenge(null)
      navigate('/dashboard')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Verification failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-vh-100 bg-light py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-7 col-xl-6">
            <button type="button" onClick={() => navigate('/login')} className="btn btn-link px-0 text-decoration-none">
              <ArrowLeft className="me-2" size={16} aria-hidden="true" />
              Back to login
            </button>

            <section className="card shadow border-0 rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="d-inline-flex align-items-center gap-2 rounded-pill bg-success-subtle text-success fw-bold px-3 py-2 mb-3">
                  <ShieldCheck size={16} aria-hidden="true" />
                  2-step authentication
                </div>

                <h1 className="h3 fw-black mb-2">Enter your verification code</h1>
                <p className="text-secondary mb-3">
                  We detected a protected login. Enter the 6-digit code from your authenticator app to continue.
                </p>

                {challenge ? (
                  <div className="alert alert-info py-2 mb-4">
                    Signing in as <strong>{challenge.username}</strong>
                  </div>
                ) : null}

                {error ? (
                  <div id="verification-alert" className="alert alert-danger" role="alert">
                    {error}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit} noValidate className="vstack gap-3">
                  <div>
                    <label htmlFor="verification-code" className="form-label fw-semibold">
                      Verification code
                    </label>
                    <input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      disabled={isSubmitting}
                      placeholder="123456"
                      className="form-control form-control-lg text-center"
                    />
                    <div className="form-text">Use the 6-digit code from your authenticator app.</div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="btn btn-success btn-lg w-100 d-flex justify-content-center align-items-center gap-2">
                    {isSubmitting && <Loader size={18} className="animate-spin" />}
                    Verify and continue
                  </button>
                </form>

                <div className="text-center mt-4">
                  <Link to="/login" className="link-success fw-semibold text-decoration-none">
                    Restart login
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

