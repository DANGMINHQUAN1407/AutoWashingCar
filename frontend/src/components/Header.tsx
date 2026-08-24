import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserRole } from '../constants/userRoles'
import { getHomePathForRole, getUserRole } from '../utils/roleUtils'


export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const role = getUserRole(user)
  const dashboardPath = role === UserRole.Customer ? '/customer' : getHomePathForRole(role)
  const [activeSection, setActiveSection] = useState('hero')

  // Scroll Spy using IntersectionObserver
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('')
      return
    }

    const sections = ['hero', 'services', 'process', 'reviews']
    const observers = sections.map(id => {
      const el = document.getElementById(id)
      if (!el) return null

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id)
          }
        },
        {
          rootMargin: '-40% 0px -40% 0px'
        }
      )
      observer.observe(el)
      return { observer, el }
    })

    return () => {
      observers.forEach(obs => {
        if (obs) {
          obs.observer.unobserve(obs.el)
        }
      })
    }
  }, [location.pathname])

  const handleLogout = () => {
    navigate('/auth', { replace: true })
    setTimeout(() => {
      logout()
    }, 0)
  }

  return (
    <header className="navbar">
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-text" style={{ fontSize: '1.25rem', letterSpacing: '-0.05em' }}>M-PERFORMANCE WASH</span>
        </Link>

        {/* Navigation Links */}
        <nav className="navbar-nav">
          <a href="/#hero" className={`nav-link ${location.pathname === '/' && activeSection === 'hero' ? 'active' : ''}`}>DỊCH VỤ</a>
          <a href="/#services" className={`nav-link ${location.pathname === '/' && activeSection === 'services' ? 'active' : ''}`}>CHI NHÁNH</a>
          <a href="/#process" className={`nav-link ${location.pathname === '/' && activeSection === 'process' ? 'active' : ''}`}>QUY TRÌNH</a>
          <a href="/#reviews" className={`nav-link ${location.pathname === '/' && activeSection === 'reviews' ? 'active' : ''}`}>ĐÁNH GIÁ</a>
        </nav>

        {/* Actions */}
        <div className="navbar-actions">
          {user ? (
            <>
              <Link to={dashboardPath} className="btn btn-ghost btn-sm">BẢNG ĐIỀU KHIỂN</Link>
              <button onClick={handleLogout} className="btn btn-primary btn-sm">ĐĂNG XUẤT</button>
            </>
          ) : (() => {
            const isAuthPage = location.pathname === '/auth'
            const searchParams = new URLSearchParams(location.search)
            const currentTab = searchParams.get('tab') || 'login'
            
            const isSignInActive = isAuthPage && currentTab === 'login'
            const isGetStartedActive = !isAuthPage || (isAuthPage && currentTab === 'signup')
            
            return (
              <>
                <Link 
                  to="/auth" 
                  className={`btn btn-sm ${isSignInActive ? 'btn-primary' : 'btn-ghost'}`}
                >
                  ĐĂNG NHẬP
                </Link>
                <Link 
                  to="/auth?tab=signup" 
                  className={`btn btn-sm ${isGetStartedActive ? 'btn-primary' : 'btn-ghost'}`}
                >
                  ĐẶT LỊCH NGAY
                </Link>
              </>
            )
          })()}
        </div>

        {/* Mobile Hamburger placeholder */}
        <button className="navbar-hamburger" aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>
    </header>
  )
}
