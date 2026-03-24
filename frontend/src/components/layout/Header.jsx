import { useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import Badge from '../ui/Badge.jsx'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/empresas': 'Empresas',
  '/usuarios': 'Usuários',
  '/gerar': 'Gerar SINTEGRA',
  '/historico': 'Histórico de Gerações',
}

const roleBadgeVariant = {
  MASTER: 'error',
  ADMIN: 'info',
  USER: 'gray',
}

const roleLabel = {
  MASTER: 'Master',
  ADMIN: 'Admin',
  USER: 'Usuário',
}

export default function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const pageTitle = pageTitles[location.pathname] || 'Fácil Sintegra'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      {/* User info + logout */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <Badge variant={roleBadgeVariant[user?.role] || 'gray'}>
          {roleLabel[user?.role] || user?.role}
        </Badge>
        <button
          onClick={logout}
          title="Sair"
          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
