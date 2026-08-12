import { useState } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import WaterSplashIntro from './components/WaterSplashIntro'

function AppContent({
  showRoutes,
  fadeInUI,
  handleCleanStart,
}: {
  showRoutes: boolean
  fadeInUI: boolean
  handleCleanStart: () => void
}) {
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  return (
    <>
      <WaterSplashIntro onCleanStart={handleCleanStart} isActive={isHomePage} />
      <div className={`app-routes-wrapper ${fadeInUI ? 'fade-in-active' : ''}`}>
        {showRoutes && <AppRoutes />}
      </div>
    </>
  )
}

function App() {
  const isHome = window.location.pathname === '/'
  const [showRoutes, setShowRoutes] = useState(!isHome)
  const [fadeInUI, setFadeInUI] = useState(!isHome)

  const handleCleanStart = () => {
    setShowRoutes(true)
    setTimeout(() => {
      setFadeInUI(true)
    }, 50)
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent
            showRoutes={showRoutes}
            fadeInUI={fadeInUI}
            handleCleanStart={handleCleanStart}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
