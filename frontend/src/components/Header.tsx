import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { UserRole } from '../constants/userRoles'
import { getHomePathForRole, getUserRole } from '../utils/roleUtils'

function NavThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      className="nav-theme-btn"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span className={`theme-toggle-track ${isDark ? '' : 'theme-toggle-track--light'}`}>
        <span className="theme-toggle-thumb">
          {isDark ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </span>
      </span>
    </button>
  )
}

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
          <div className="navbar-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 7H5C3.34 7 2 8.34 2 10v6c0 1.66 1.34 3 3 3h1a2 2 0 0 0 4 0h4a2 2 0 0 0 4 0h1c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3z" fill="url(#carGrad)" />
              <path d="M15.5 7L14 3H10L8.5 7" stroke="url(#carGrad2)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="7.5" cy="17.5" r="1.5" fill="#fff" opacity="0.9" />
              <circle cx="16.5" cy="17.5" r="1.5" fill="#fff" opacity="0.9" />
              <path d="M6 12h12" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
              <defs>
                <linearGradient id="carGrad" x1="2" y1="7" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1e90ff" />
                  <stop offset="1" stopColor="#00d4ff" />
                </linearGradient>
                <linearGradient id="carGrad2" x1="8" y1="3" x2="16" y2="7" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1e90ff" />
                  <stop offset="1" stopColor="#00d4ff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="navbar-logo-text">AutoWash<span>Pro</span></span>
        </Link>

        {/* Navigation Links */}
        <nav className="navbar-nav">
          <a href="/#hero" className={`nav-link ${location.pathname === '/' && activeSection === 'hero' ? 'active' : ''}`}>Home</a>
          <a href="/#services" className={`nav-link ${location.pathname === '/' && activeSection === 'services' ? 'active' : ''}`}>Services</a>
          <a href="/#process" className={`nav-link ${location.pathname === '/' && activeSection === 'process' ? 'active' : ''}`}>Process</a>
          <a href="/#reviews" className={`nav-link ${location.pathname === '/' && activeSection === 'reviews' ? 'active' : ''}`}>Reviews</a>
        </nav>

        {/* Actions */}
        <div className="navbar-actions">
          <NavThemeToggle />
          {user ? (
            <>
              <Link to={dashboardPath} className="btn btn-ghost btn-sm">Dashboard</Link>
              <button onClick={handleLogout} className="btn btn-primary btn-sm">Sign Out</button>
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
                  Sign In
                </Link>
                <Link 
                  to="/auth?tab=signup" 
                  className={`btn btn-sm ${isGetStartedActive ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Get Started
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
