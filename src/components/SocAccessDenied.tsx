import { ShieldAlert, Slash } from 'lucide-react'

type SocAccessDeniedProps = {
  title?: string
  message?: string
}

export function SocAccessDenied({
  title = 'Access Denied',
  message = 'This Security Operations Center is restricted to administrators. Your session does not have permission to view these controls.',
}: SocAccessDeniedProps) {
  return (
    <section className="rounded-3xl border border-rose-500/30 bg-rose-950/60 p-8 text-rose-50 shadow-2xl shadow-rose-950/30 backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-rose-200">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-rose-100">
            <Slash className="h-3.5 w-3.5" aria-hidden="true" />
            HTTP 401 / 403
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-rose-100/90 sm:text-base">{message}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-rose-400/20 bg-black/20 p-4 text-sm text-rose-100/80">
        The backend has refused this request. Verify that you are signed in with an administrator account and that your
        session cookies are still valid.
      </div>
    </section>
  )
}

