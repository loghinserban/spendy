import { ArrowRight, WalletCards, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between rounded-2xl bg-white border-2 border-slate-300 px-6 py-4 shadow-lg hover:shadow-xl transition">
          <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Spendy
          </p>
          <Link
            to="/login"
            className="rounded-xl border-2 border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 active:scale-95"
          >
            Sign In
          </Link>
        </header>

        {/* Hero Section - Asymmetric Design */}
        <div className="grid gap-6 lg:grid-cols-2 items-center">
          {/* Left side - Content */}
          <div className="space-y-6">
            <div className="relative">
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-tight">
                Spendy
              </h1>
              <p className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                Track your money
                <span className="block text-transparent bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text">
                  like never before
                </span>
              </p>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-100 rounded-full opacity-20 blur-xl"></div>
            </div>

            <p className="text-lg text-slate-600 leading-relaxed max-w-md">
              Smart spending, simplified
            </p>

            <p className="text-base text-slate-600 leading-relaxed max-w-md">
              A handmade expense tracker that turns financial chaos into clear, useful daily insight.
            </p>

            {/* CTA Buttons - Staggered */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 font-bold text-white transition hover:shadow-lg hover:scale-105 active:scale-95 transform"
              >
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                Start For Free
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-8 py-4 font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 active:scale-95"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right side - Decorative Element */}
          <div className="hidden lg:flex justify-center items-center relative h-96">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border-2 border-dashed border-emerald-200 transform rotate-3"></div>
            <div className="relative z-10 p-8 text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border-3 border-emerald-600 transform -rotate-12">
                <WalletCards className="h-16 w-16 text-emerald-700" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">Smart Spending</p>
            </div>
          </div>
        </div>

        {/* Divider with style */}
        <div className="flex items-center gap-4 py-8">
          <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
          <span className="text-slate-400 text-sm font-medium">*</span>
          <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        </div>

        {/* Features Preview */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 hover:shadow-lg transition transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
              <span className="text-2xl">A</span>
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Quick Stats</h3>
            <p className="text-sm text-slate-600">See your spending at a glance with real-time insights</p>
          </div>

          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 hover:shadow-lg transition transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-4">
              <span className="text-2xl">B</span>
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Easy Logging</h3>
            <p className="text-sm text-slate-600">Add expenses in seconds without the hassle</p>
          </div>

          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 hover:shadow-lg transition transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center mb-4">
              <span className="text-2xl">C</span>
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Control</h3>
            <p className="text-sm text-slate-600">Take charge of your financial decisions</p>
          </div>
        </div>
      </div>
    </main>
  )
}
