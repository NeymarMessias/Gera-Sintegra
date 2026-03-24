import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, FileText, History, Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'

const navItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/dashboard',
    roles: ['MASTER', 'ADMIN', 'USER'],
  },
  {
    label: 'Empresas',
    icon: Building2,
    to: '/empresas',
    roles: ['MASTER'],
  },
  {
    label: 'Usuários',
    icon: Users,
    to: '/usuarios',
    roles: ['MASTER', 'ADMIN'],
  },
  {
    label: 'Gerar SINTEGRA',
    icon: FileText,
    to: '/gerar',
    roles: ['MASTER', 'ADMIN', 'USER'],
  },
  {
    label: 'Histórico',
    icon: History,
    to: '/historico',
    roles: ['MASTER', 'ADMIN', 'USER'],
  },
  {
    label: 'Configurações',
    icon: Settings,
    to: '/configuracoes',
    roles: ['MASTER'],
  },
]

export default function Sidebar() {
  const { user } = useAuth()

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <aside className="w-64 flex-shrink-0 bg-facil-dark flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Fácil Sintegra" className="w-9 h-9 flex-shrink-0" />
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-white leading-none">Fácil</span>
              <span className="text-lg font-bold leading-none" style={{ color: '#9AC9FF' }}>Sintegra</span>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(154,201,255,0.55)' }}>Sistema de Escrituração Fiscal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-facil text-white'
                  : 'text-facil-light hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={isActive ? 'text-white' : 'text-facil-light/70'}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Company info */}
      {user?.company && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-facil-light/50 uppercase tracking-wide mb-1">Empresa</p>
          <p className="text-xs font-medium text-facil-light truncate">{user.company.name}</p>
        </div>
      )}
    </aside>
  )
}
