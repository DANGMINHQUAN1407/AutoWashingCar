import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserRole } from '../constants/userRoles'
import { getHomePathForRole, getUserRole } from '../utils/roleUtils'
import Header from '../components/Header'
import Footer from '../components/Footer'
import './MainLayout.css'

function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const role = getUserRole(user)
  const dashboardPath = role === UserRole.Customer ? '/customer' : getHomePathForRole(role)

  useEffect(() => {
    if (!loading && user && role && role !== UserRole.Customer) {
      if (location.pathname !== '/unauthorized') {
        navigate(dashboardPath, { replace: true })
      }
    }
  }, [user, role, loading, dashboardPath, navigate, location.pathname])

  // Scroll to hash on load or hash change
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '')
      const timer = setTimeout(() => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, location.hash])

  return (
    <div className="layout">
      {/* ── Navbar ── */}
      <Header />

      {/* ── Page Content ── */}
      <main className="layout-main">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <Footer />
    </div>
  )
}

export default MainLayout
