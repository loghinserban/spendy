import { Activity, FileText, LayoutDashboard, Shield, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type SocAdminSection = 'overview' | 'observations' | 'logs'

type NavItem = {
  id: SocAdminSection
  label: string
  description: string
  icon: LucideIcon
}

type SocAdminLayoutProps = {
  activeSection: SocAdminSection
  onSectionChange: (section: SocAdminSection) => void
  title: string
  subtitle: string
  children: ReactNode
}

const navItems: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Threat posture at a glance',
    icon: LayoutDashboard,
  },
  {
    id: 'observations',
    label: 'Observation List',
    description: 'Flagged users and severity',
    icon: Activity,
  },
  {
    id: 'logs',
    label: 'Raw Audit Logs',
    description: 'Dense activity stream',
    icon: FileText,
  },
]

export function SocAdminLayout({ activeSection, onSectionChange, title, subtitle, children }: SocAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-24 top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:36px_36px] opacity-20" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1600px] gap-5 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="flex flex-col rounded-[28px] border border-cyan-400/15 bg-slate-900/85 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <div className="rounded-[24px] border border-cyan-400/20 bg-slate-950/70 p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              SOC Admin
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-white">Security Operations Center</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
          </div>

          <nav className="mt-5 space-y-2" aria-label="SOC dashboard navigation">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = item.id === activeSection

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-400/10 ${
                    isActive
                      ? 'border-cyan-300/50 bg-cyan-400/15 shadow-lg shadow-cyan-950/20'
                      : 'border-slate-700/80 bg-slate-950/45'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-xl p-2 ${isActive ? 'bg-cyan-400/15 text-cyan-200' : 'bg-slate-800 text-slate-300'}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white">{item.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">{item.description}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-sm text-slate-300">
            <p className="font-semibold text-emerald-200">Session transport</p>
            <p className="mt-1 leading-6">
              All admin requests are sent with <code className="rounded bg-black/30 px-1.5 py-0.5">credentials: &apos;include&apos;</code> to preserve Secure/HttpOnly cookie sessions.
            </p>
          </div>
        </aside>

        <main className="space-y-5 rounded-[28px] border border-slate-800/80 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl lg:p-6">
          <header className="flex flex-col gap-4 rounded-[24px] border border-slate-800/80 bg-slate-900/60 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200/80">Active threat monitoring</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h2>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              Live admin feed
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  )
}


