import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

export default function RoleGuard({ roles, children }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
