import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

type ProtectedRouteProps = {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="route-loading">
        <span className="spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    const searchParams = new URLSearchParams()
    searchParams.set('redirect', location.pathname + location.search)
    return <Navigate to={`/auth?${searchParams.toString()}`} replace />
  }

  return children
}
