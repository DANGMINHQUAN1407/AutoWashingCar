import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomePathForRole, getUserRole } from '../utils/roleUtils'

export default function RoleRedirect() {
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

  return <Navigate to={getHomePathForRole(getUserRole(user))} replace />
}
