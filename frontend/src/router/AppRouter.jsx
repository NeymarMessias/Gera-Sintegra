import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import AppShell from '../components/layout/AppShell.jsx'
import RoleGuard from '../components/guards/RoleGuard.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import CompaniesPage from '../pages/master/CompaniesPage.jsx'
import SettingsPage from '../pages/master/SettingsPage.jsx'
import UsersPage from '../pages/admin/UsersPage.jsx'
import GeneratePage from '../pages/sintegra/GeneratePage.jsx'
import HistoryPage from '../pages/sintegra/HistoryPage.jsx'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>Carregando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>Carregando...</span>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />

        <Route
          path="empresas"
          element={
            <RoleGuard roles={['MASTER']}>
              <CompaniesPage />
            </RoleGuard>
          }
        />

        <Route
          path="usuarios"
          element={
            <RoleGuard roles={['MASTER', 'ADMIN']}>
              <UsersPage />
            </RoleGuard>
          }
        />

        <Route path="gerar" element={<GeneratePage />} />
        <Route path="historico" element={<HistoryPage />} />

        <Route
          path="configuracoes"
          element={
            <RoleGuard roles={['MASTER']}>
              <SettingsPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
