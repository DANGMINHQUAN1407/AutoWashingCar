import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../constants/userRoles'
import { getHomePathForRole, getUserRole, hasRole } from '../../utils/roleUtils'

type RoleRouteProps = {
  roles: UserRole[]
  children: React.ReactNode
}

export default function RoleRoute({ roles, children }: RoleRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="route-loading">
        <span className="spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (!hasRole(user, roles)) {
    return <Navigate to={getHomePathForRole(getUserRole(user))} replace />
  }

  return children
}
