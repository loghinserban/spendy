import { ArrowLeft, CheckCircle2, Copy, Loader, ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import $ from 'jquery'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { confirmTwoFactorSetup, setupTwoFactor } from '../utils/authApi'

export function TwoFactorSetupPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [secret, setSecret] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null)

  const loadSetup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await setupTwoFactor()
      setSecret(response.base32)
      setQrDataUrl(response.qrDataUrl)
      setOtpauthUrl(response.otpauth_url)

      window.setTimeout(() => {
        $('#setup-verification-code').trigger('focus')
        $('#qr-panel').hide().fadeIn(200)
      }, 0)
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Failed to generate 2FA setup data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSetup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (error) {
      $('#setup-error').stop(true, true).hide().fadeIn(150)
    }
  }, [error])

  const handleCopySecret = async () => {
    if (!secret) {
      return
    }

    try {
      await navigator.clipboard.writeText(secret)
      setSuccess('Secret copied to clipboard.')
      $('#setup-success').stop(true, true).hide().fadeIn(150)
    } catch {
      setError('Unable to copy the secret. Please copy it manually.')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!secret) {
      setError('The setup secret is missing. Please generate a new QR code.')
      return
    }

    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit code from your authenticator app.')
      return
    }

    setIsSubmitting(true)

    try {
      await confirmTwoFactorSetup(secret, verificationCode.trim())
      setSuccess('2FA is now enabled for your account.')
      window.setTimeout(() => {
        navigate('/dashboard')
      }, 900)
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Could not enable 2FA.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-vh-100 bg-light py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-link px-0 text-decoration-none mb-3">
              <ArrowLeft className="me-2" size={16} aria-hidden="true" />
              Back
            </button>

            <div className="row g-4 align-items-stretch">
              <div className="col-12 col-lg-6">
                <section className="card shadow border-0 rounded-4 h-100">
                  <div className="card-body p-4 p-md-5">
                    <div className="d-inline-flex align-items-center gap-2 rounded-pill bg-success-subtle text-success fw-bold px-3 py-2 mb-3">
                      <ShieldCheck size={16} aria-hidden="true" />
                      2FA setup
                    </div>

                    <h1 className="h3 fw-black mb-2">Secure your account</h1>
                    <p className="text-secondary mb-4">
                      {user ? (
                        <>
                          {user.username}, scan the QR code in your authenticator app, then confirm the 6-digit code to enable 2FA.
                        </>
                      ) : (
                        <>Scan the QR code in your authenticator app, then confirm the 6-digit code to enable 2FA.</>
                      )}
                    </p>

                    {error ? (
                      <div id="setup-error" className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    ) : null}

                    {success ? (
                      <div id="setup-success" className="alert alert-success d-flex align-items-center gap-2" role="alert">
                        <CheckCircle2 size={16} aria-hidden="true" />
                        {success}
                      </div>
                    ) : null}

                    <div className="vstack gap-3">
                      <button type="button" className="btn btn-outline-success" onClick={() => void loadSetup()} disabled={isLoading || isSubmitting}>
                        {isLoading ? (
                          <span className="d-inline-flex align-items-center gap-2">
                            <Loader size={16} className="animate-spin" />
                            Generating QR code...
                          </span>
                        ) : (
                          'Regenerate QR code'
                        )}
                      </button>

                      <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center gap-2" onClick={handleCopySecret} disabled={!secret || isSubmitting}>
                        <Copy size={16} aria-hidden="true" />
                        Copy secret key
                      </button>
                    </div>

                    <hr className="my-4" />

                    <form onSubmit={handleSubmit} noValidate className="vstack gap-3">
                      <div>
                        <label htmlFor="setup-verification-code" className="form-label fw-semibold">
                          Verification code
                        </label>
                        <input
                          id="setup-verification-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          className="form-control form-control-lg text-center"
                          placeholder="123456"
                          value={verificationCode}
                          onChange={(event) => setVerificationCode(event.target.value)}
                          disabled={isSubmitting}
                        />
                        <div className="form-text">Enter the code currently shown in your authenticator app.</div>
                      </div>

                      <button type="submit" className="btn btn-success btn-lg d-flex justify-content-center align-items-center gap-2" disabled={isSubmitting || isLoading}>
                        {isSubmitting && <Loader size={18} className="animate-spin" />}
                        Enable 2FA
                      </button>
                    </form>
                  </div>
                </section>
              </div>

              <div className="col-12 col-lg-6" id="qr-panel">
                <section className="card shadow border-0 rounded-4 h-100">
                  <div className="card-body p-4 p-md-5 d-flex flex-column justify-content-center">
                    <h2 className="h4 fw-bold mb-3">Scan this QR code</h2>

                    {qrDataUrl ? (
                      <div className="text-center">
                        <img src={qrDataUrl} alt="2FA QR code" className="img-fluid border rounded-4 p-3 bg-white shadow-sm" />
                      </div>
                    ) : (
                      <div className="alert alert-warning">
                        QR generation failed. Use the manual secret below in your authenticator app.
                      </div>
                    )}

                    <div className="mt-4">
                      <label htmlFor="manual-secret" className="form-label fw-semibold">
                        Manual secret
                      </label>
                      <textarea
                        id="manual-secret"
                        readOnly
                        className="form-control font-monospace"
                        rows={3}
                        value={secret ?? otpauthUrl ?? ''}
                      />
                      <div className="form-text">If your authenticator app cannot scan the QR, paste this secret manually.</div>
                    </div>

                    <div className="alert alert-info mt-4 mb-0">
                      After you scan the QR code, return here and confirm the 6-digit code to finish turning on 2FA.
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
