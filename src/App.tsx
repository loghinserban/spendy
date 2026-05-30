import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthSessionManager } from './components/AuthSessionManager'
import { RouteActivityTracker } from './components/RouteActivityTracker'
import { RequireAuth } from './components/RequireAuth'
import { AuthProvider } from './context/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { ExpenseDetailPage } from './pages/ExpenseDetailPage'
import { ExpenseFormPage } from './pages/ExpenseFormPage'
import { ForgotPassword } from './pages/ForgotPassword'
import { LandingPage } from './pages/LandingPage'
import { Login } from './pages/Login'
import { SocAdminDashboardPage } from './pages/SocAdminDashboardPage'
import { Register } from './pages/Register'
import { TwoFactorSetupPage } from './pages/TwoFactorSetup'
import { Statistics } from './pages/Statistics'
import { VerifyCode } from './pages/VerifyCode'
import { ExpensesProvider } from './useExpenses'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ExpensesProvider>
          <AuthSessionManager />
          <RouteActivityTracker />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-code" element={<VerifyCode />} />
            <Route
              path="/setup-2fa"
              element={
                <RequireAuth>
                  <TwoFactorSetupPage />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/statistics"
              element={
                <RequireAuth>
                  <Statistics />
                </RequireAuth>
              }
            />
            <Route
              path="/soc-admin"
              element={
                <RequireAuth>
                  <SocAdminDashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/expenses/new"
              element={
                <RequireAuth>
                  <ExpenseFormPage mode="create" />
                </RequireAuth>
              }
            />
            <Route
              path="/expenses/:expenseId"
              element={
                <RequireAuth>
                  <ExpenseDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/expenses/:expenseId/edit"
              element={
                <RequireAuth>
                  <ExpenseFormPage mode="edit" />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ExpensesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
