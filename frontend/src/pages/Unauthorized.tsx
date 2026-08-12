import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomePathForRole, getUserRole } from '../utils/roleUtils'

export default function Unauthorized() {
  const { user } = useAuth()
  const homePath = getHomePathForRole(getUserRole(user))

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card card">
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <Link to={homePath} className="btn btn-primary">
          Go to My Dashboard
        </Link>
      </div>
    </div>
  )
}
