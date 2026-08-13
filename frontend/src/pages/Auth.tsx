import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { getHomePathForRole, getUserRole } from '../utils/roleUtils'
import { extractErrorMessage } from '../utils/errorUtils'
import './Auth.css'

type Tab = 'login' | 'signup' | 'forgot' | 'reset' | 'claim'

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, user, loading: authLoading } = useAuth()
  
  const [tab, setTab] = useState<Tab>('login')

  const handleTabChange = (newTab: Tab) => {
    const redirect = searchParams.get('redirect')
    if (window.location.pathname === '/reset-password') {
      const redirectQuery = redirect ? `redirect=${encodeURIComponent(redirect)}` : ''
      if (newTab === 'login') {
        navigate(`/auth${redirectQuery ? `?${redirectQuery}` : ''}`, { replace: true })
      } else {
        navigate(`/auth?tab=${newTab}${redirectQuery ? `&${redirectQuery}` : ''}`, { replace: true })
      }
    } else {
      const newParams = new URLSearchParams()
      if (newTab !== 'login') {
        newParams.set('tab', newTab)
      }
      if (redirect) {
        newParams.set('redirect', redirect)
      }
      setSearchParams(newParams, { replace: true })
    }
  }
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  // login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')

  // signup form
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPass, setSignupPass] = useState('')

  // forgot password form
  const [forgotEmail, setForgotEmail] = useState('')

  // reset password form
  const [resetToken, setResetToken] = useState('')
  const [resetPasswordStr, setResetPasswordStr] = useState('')

  // claim form
  const [claimPhone, setClaimPhone] = useState('')
  const [claimEmail, setClaimEmail] = useState('')
  const [claimPass, setClaimPass] = useState('')

  const extractAuthToken = (res: any) =>
    res?.accessToken || res?.AccessToken || res?.data?.accessToken || res?.data?.AccessToken || res?.data?.token || res?.data?.Token || res?.token || res?.Token

  const extractUserData = (res: any, fallbackName: string, fallbackEmail: string) =>
    res?.user || res?.User || res?.data?.user || res?.data?.User || { id: '0', email: fallbackEmail, FullName: fallbackName }

  useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab === 'signup') {
      setTab('signup')
    } else if (urlTab === 'forgot') {
      setTab('forgot')
    } else if (window.location.pathname === '/reset-password' || searchParams.has('token') || urlTab === 'reset') {
      setTab('reset')
      const token = searchParams.get('token')
      if (token) {
        setResetToken(token)
      }
    } else if (urlTab === 'claim') {
      setTab('claim')
    } else {
      setTab('login')
    }
  }, [searchParams])

  useEffect(() => {
    if (!authLoading && user) {
      const redirect = searchParams.get('redirect')
      if (redirect) {
        navigate(redirect, { replace: true })
      } else {
        navigate(getHomePathForRole(getUserRole(user)), { replace: true })
      }
    }
  }, [authLoading, user, navigate, searchParams])

  useEffect(() => {
    setErrorMsg(null)
    setSuccessMsg(null)
  }, [tab])

  const handleGoogleLoginResponse = async (response: any) => {
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const idToken = response.credential
      const res = await api.googleLogin(idToken)
      const token = extractAuthToken(res)
      const userData = extractUserData(res, 'User', '')
      
      if (!token) {
        throw new Error('Google login succeeded but no access token was returned.')
      }
      
      login(token, userData)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(extractErrorMessage(err, 'Đăng nhập bằng Google thất bại.'))
    } finally {
      setLoading(false)
    }
  }

  const googleCallbackRef = useRef<any>(null)
  useEffect(() => {
    googleCallbackRef.current = handleGoogleLoginResponse
  }, [handleGoogleLoginResponse])

  // Google Login scripts loading and button rendering
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      const google = (window as any).google
      if (!google) return

      if (!(window as any).googleSignInInitialized) {
        google.accounts.id.initialize({
          client_id: '982513284646-4omqupenieegvbvsdk2rqv70ksaco7mi.apps.googleusercontent.com',
          callback: (res: any) => googleCallbackRef.current?.(res),
        })
        ;(window as any).googleSignInInitialized = true
      }

      const loginBtn = document.getElementById('google-signin-btn-login')
      if (loginBtn) {
        google.accounts.id.renderButton(loginBtn, {
          theme: 'outline',
          size: 'large',
          width: 380,
        })
      }

      const signupBtn = document.getElementById('google-signin-btn-signup')
      if (signupBtn) {
        google.accounts.id.renderButton(signupBtn, {
          theme: 'outline',
          size: 'large',
          width: 380,
        })
      }
    }

    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script')
      script.id = 'google-gsi-client'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        initializeGoogleSignIn()
      }
      document.body.appendChild(script)
    } else if ((window as any).google) {
      initializeGoogleSignIn()
    }
  }, [tab, authLoading, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^0[0-9]{9}$/

    if (tab === 'login') {
      if (!emailRegex.test(loginEmail.trim())) {
        setErrorMsg('Invalid email format.')
        setLoading(false)
        return
      }
    } else if (tab === 'signup') {
      const name = signupName.trim()
      if (name.length < 2 || name.length > 100) {
        setErrorMsg('Full name must be between 2 and 100 characters.')
        setLoading(false)
        return
      }

      const phone = signupPhone.trim()
      if (!phoneRegex.test(phone)) {
        setErrorMsg('Phone number must be exactly 10 digits and start with 0.')
        setLoading(false)
        return
      }

      const email = signupEmail.trim()
      if (!emailRegex.test(email)) {
        setErrorMsg('Invalid email format.')
        setLoading(false)
        return
      }

      if (signupPass.length < 8) {
        setErrorMsg('Password must be at least 8 characters.')
        setLoading(false)
        return
      }
    } else if (tab === 'forgot') {
      const email = forgotEmail.trim()
      if (!emailRegex.test(email)) {
        setErrorMsg('Invalid email format.')
        setLoading(false)
        return
      }
    } else if (tab === 'reset') {
      if (resetPasswordStr.length < 8) {
        setErrorMsg('Password must be at least 8 characters.')
        setLoading(false)
        return
      }
    } else if (tab === 'claim') {
      const phone = claimPhone.trim()
      if (!phoneRegex.test(phone)) {
        setErrorMsg('Phone number must be exactly 10 digits and start with 0.')
        setLoading(false)
        return
      }

      const email = claimEmail.trim()
      if (!emailRegex.test(email)) {
        setErrorMsg('Invalid email format.')
        setLoading(false)
        return
      }

      if (claimPass.length < 8) {
        setErrorMsg('Password must be at least 8 characters.')
        setLoading(false)
        return
      }
    }

    try {
      if (tab === 'login') {
        const res = await api.login({ Email: loginEmail, Password: loginPass })
        const token = extractAuthToken(res)
        const userData = extractUserData(res, 'User', loginEmail)
        if (!token) {
          throw new Error('Login succeeded but no access token was returned.')
        }
        
        const refreshToken = res?.refreshToken || res?.RefreshToken
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken)
        }

        login(token, userData)
      } else if (tab === 'signup') {
        const res = await api.register({
          FullName: signupName,
          Email: signupEmail,
          PhoneNumber: signupPhone,
          Password: signupPass
        })
        const token = extractAuthToken(res)
        const userData = extractUserData(res, signupName, signupEmail)
        if (!token) {
          throw new Error('Registration succeeded but no access token was returned.')
        }

        const refreshToken = res?.refreshToken || res?.RefreshToken
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken)
        }

        login(token, userData)
      } else if (tab === 'forgot') {
        await api.forgotPassword({ Email: forgotEmail })
        setSuccessMsg('Instructions sent! Please check your email for the reset token.')
        // Switch to reset tab automatically after sending
        setTimeout(() => handleTabChange('reset'), 2000)
      } else if (tab === 'reset') {
        await api.resetPassword({
          Token: resetToken,
          NewPassword: resetPasswordStr
        })
        setSuccessMsg('Password has been successfully reset! You can now log in.')
        setResetToken('')
        setResetPasswordStr('')
        setTimeout(() => handleTabChange('login'), 2000)
      } else if (tab === 'claim') {
        const res = await api.claimGuestAccount({
          PhoneNumber: claimPhone,
          Email: claimEmail,
          Password: claimPass
        })
        const token = extractAuthToken(res)
        const userData = extractUserData(res, 'User', claimEmail)
        if (!token) {
          throw new Error('Claim account succeeded but no access token was returned.')
        }

        const refreshToken = res?.refreshToken || res?.RefreshToken
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken)
        }

        login(token, userData)
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(extractErrorMessage(err, 'Xác thực thất bại. Vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }

  const isRightPanelActive = tab === 'signup' || tab === 'claim'

  return (
    <div className="auth-page">
      {/* Background Effects */}
      <div className="auth-bg-glow auth-bg-glow-1" />
      <div className="auth-bg-glow auth-bg-glow-2" />
      <div className="auth-bg-grid" />

      <div className={`auth-container auth-tab-${tab} ${isRightPanelActive ? 'right-panel-active' : ''}`}>
        
        {/* Sign In & Password Management Container */}
        <div className="auth-form-container auth-signin-container">
          <div className="auth-card">
            {/* Mobile Header (Brand & Back) */}
            <div className="auth-mobile-header">
              <Link to="/" className="auth-back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back to Home
              </Link>
              <div className="auth-brand">
                <div className="auth-brand-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M19 7H5C3.34 7 2 8.34 2 10v6c0 1.66 1.34 3 3 3h1a2 2 0 0 0 4 0h4a2 2 0 0 0 4 0h1c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3z" fill="url(#authCarGradMobSignIn)"/>
                    <path d="M15.5 7L14 3H10L8.5 7" stroke="url(#authCarStrokeMobSignIn)" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="7.5" cy="17.5" r="1.5" fill="white" opacity="0.9"/>
                    <circle cx="16.5" cy="17.5" r="1.5" fill="white" opacity="0.9"/>
                    <defs>
                      <linearGradient id="authCarGradMobSignIn" x1="2" y1="7" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e90ff"/><stop offset="1" stopColor="#00d4ff"/>
                      </linearGradient>
                      <linearGradient id="authCarStrokeMobSignIn" x1="8" y1="3" x2="16" y2="7" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e90ff"/><stop offset="1" stopColor="#00d4ff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span>AutoWash<span className="gradient-text">Pro</span></span>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="auth-tabs-mobile">
              <button
                type="button"
                className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                onClick={() => handleTabChange('login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                onClick={() => handleTabChange('signup')}
              >
                Create Account
              </button>
              <div className={`auth-tab-indicator ${tab === 'signup' ? 'right' : ''}`} />
            </div>

            {/* Login Form */}
            {tab === 'login' && (
              <form onSubmit={handleSubmit} className="auth-form auth-form-login" key="login">
                <div className="auth-form-header">
                  <h2>Welcome back</h2>
                  <p>Sign in to manage your bookings and account.</p>
                </div>

                {errorMsg && <div className="badge badge-danger" style={{ display: 'block', padding: '10px' }}>{errorMsg}</div>}
                {successMsg && <div className="badge badge-success" style={{ display: 'block', padding: '10px' }}>{successMsg}</div>}

                {/* Social Sign In */}
                <div className="auth-socials">
                  <div className="auth-google-btn-wrapper" style={{ position: 'relative', width: '100%' }}>
                    <button type="button" className="btn btn-ghost auth-social-btn w-full">
                      <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                    <div 
                      id="google-signin-btn-login"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0.01,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                    />
                  </div>
                </div>

                <div className="auth-divider">
                  <span>or sign in with email</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Email address</label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <div className="form-label-row">
                    <label className="form-label" htmlFor="login-password">Password</label>
                    <button type="button" className="link-btn form-link" onClick={() => handleTabChange('forgot')}>Forgot password?</button>
                  </div>
                  <div className="input-wrapper">
                    <input
                      id="login-password"
                      name="password"
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      value={loginPass}
                      onChange={e => setLoginPass(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button type="button" className="input-icon-btn" onClick={() => setShowPass(v => !v)}>
                      {showPass
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? <span className="spinner" /> : null}
                  {loading ? 'Signing In…' : 'Sign In'}
                </button>

                <p className="auth-switch">
                  Don't have an account?{' '}
                  <button type="button" className="link-btn" onClick={() => handleTabChange('signup')}>
                    Create one free
                  </button>
                </p>
                
                <p className="auth-switch" style={{ marginTop: '10px' }}>
                  Bạn là khách vãng lai?{' '}
                  <button type="button" className="link-btn" onClick={() => handleTabChange('claim')}>
                    Kích hoạt tài khoản tại đây
                  </button>
                </p>
              </form>
            )}

            {/* Forgot Password Form */}
            {tab === 'forgot' && (
              <form onSubmit={handleSubmit} className="auth-form" key="forgot">
                <div className="auth-form-header">
                  <h2>Reset password</h2>
                  <p>Enter your email and we'll send you instructions to reset your password.</p>
                </div>

                {errorMsg && <div className="badge badge-danger" style={{ display: 'block', padding: '10px' }}>{errorMsg}</div>}
                {successMsg && <div className="badge badge-success" style={{ display: 'block', padding: '10px' }}>{successMsg}</div>}

                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label className="form-label" htmlFor="forgot-email">Email address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '10px' }}>
                  {loading ? <span className="spinner" /> : null}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <p className="auth-switch" style={{ marginTop: '20px' }}>
                  Remember your password?{' '}
                  <button type="button" className="link-btn" onClick={() => handleTabChange('login')}>
                    Back to sign in
                  </button>
                </p>
              </form>
            )}

            {/* Reset Password Form */}
            {tab === 'reset' && (
              <form onSubmit={handleSubmit} className="auth-form" key="reset">
                <div className="auth-form-header">
                  <h2>Reset Your Password</h2>
                  <p>Please enter your new password below to reset your account credentials.</p>
                </div>

                {errorMsg && <div className="badge badge-danger" style={{ display: 'block', padding: '10px' }}>{errorMsg}</div>}
                {successMsg && <div className="badge badge-success" style={{ display: 'block', padding: '10px' }}>{successMsg}</div>}

                {successMsg ? null : !resetToken ? (
                  <div className="badge badge-danger animate-fade-in" style={{ display: 'block', padding: '14px', marginTop: '20px', lineHeight: '1.4' }}>
                    Không tìm thấy mã đặt lại mật khẩu trong liên kết của bạn. Vui lòng click vào đường dẫn từ email hoặc yêu cầu mã mới.
                  </div>
                ) : (
                  <>
                    <div className="form-group" style={{ marginTop: '20px' }}>
                      <label className="form-label" htmlFor="reset-password">New Password</label>
                      <div className="input-wrapper">
                        <input
                          id="reset-password"
                          type={showPass ? 'text' : 'password'}
                          className="form-input"
                          placeholder="At least 8 characters"
                          value={resetPasswordStr}
                          onChange={e => setResetPasswordStr(e.target.value)}
                          required
                          minLength={8}
                        />
                        <button type="button" className="input-icon-btn" onClick={() => setShowPass(v => !v)}>
                          {showPass
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          }
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '10px' }}>
                      {loading ? <span className="spinner" /> : null}
                      {loading ? 'Resetting...' : 'Change Password'}
                    </button>
                  </>
                )}

                <p className="auth-switch" style={{ marginTop: '20px' }}>
                  <button type="button" className="link-btn" onClick={() => handleTabChange('login')}>
                    Back to sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Sign Up Container */}
        <div className="auth-form-container auth-signup-container">
          <div className="auth-card">
            {/* Mobile Header (Brand & Back) */}
            <div className="auth-mobile-header">
              <Link to="/" className="auth-back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back to Home
              </Link>
              <div className="auth-brand">
                <div className="auth-brand-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M19 7H5C3.34 7 2 8.34 2 10v6c0 1.66 1.34 3 3 3h1a2 2 0 0 0 4 0h4a2 2 0 0 0 4 0h1c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3z" fill="url(#authCarGradMobSignUp)"/>
                    <path d="M15.5 7L14 3H10L8.5 7" stroke="url(#authCarStrokeMobSignUp)" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="7.5" cy="17.5" r="1.5" fill="white" opacity="0.9"/>
                    <circle cx="16.5" cy="17.5" r="1.5" fill="white" opacity="0.9"/>
                    <defs>
                      <linearGradient id="authCarGradMobSignUp" x1="2" y1="7" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e90ff"/><stop offset="1" stopColor="#00d4ff"/>
                      </linearGradient>
                      <linearGradient id="authCarStrokeMobSignUp" x1="8" y1="3" x2="16" y2="7" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e90ff"/><stop offset="1" stopColor="#00d4ff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span>AutoWash<span className="gradient-text">Pro</span></span>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="auth-tabs-mobile">
              <button
                type="button"
                className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                onClick={() => handleTabChange('login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                onClick={() => handleTabChange('signup')}
              >
                Create Account
              </button>
              <div className={`auth-tab-indicator ${tab === 'signup' ? 'right' : ''}`} />
            </div>

            {/* Signup Form */}
            {tab === 'signup' && (
              <form onSubmit={handleSubmit} className="auth-form auth-form-signup" key="signup">
                <div className="auth-form-header">
                  <h2>Create your account</h2>
                  <p>Get started in seconds. No credit card required.</p>
                </div>

                {errorMsg && <div className="badge badge-danger" style={{ display: 'block', padding: '10px' }}>{errorMsg}</div>}

                <div className="auth-socials">
                  <div className="auth-google-btn-wrapper" style={{ position: 'relative', width: '100%' }}>
                    <button type="button" className="btn btn-ghost auth-social-btn w-full">
                      <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                    <div 
                      id="google-signin-btn-signup"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0.01,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                    />
                  </div>
                </div>

                <div className="auth-divider">
                  <span>or sign up with email</span>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-name">Full Name</label>
                    <input
                      id="signup-name"
                      type="text"
                      className="form-input"
                      placeholder="Nguyen Van A"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-phone">Phone</label>
                    <input
                      id="signup-phone"
                      type="tel"
                      className="form-input"
                      placeholder="0901234567"
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value)}
                      required
                      pattern="0[0-9]{9}"
                      title="Phone number must be exactly 10 digits and start with 0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-email">Email address</label>
                  <input
                    id="signup-email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-password">Password</label>
                  <div className="input-wrapper">
                    <input
                      id="signup-password"
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="At least 8 characters"
                      value={signupPass}
                      onChange={e => setSignupPass(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button type="button" className="input-icon-btn" onClick={() => setShowPass(v => !v)}>
                      {showPass
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? <span className="spinner" /> : null}
                  {loading ? 'Creating Account…' : 'Create Free Account'}
                </button>

                <p className="auth-terms">
                  By creating an account you agree to our{' '}
                  <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </p>

                <p className="auth-switch">
                  Already have an account?{' '}
                  <button type="button" className="link-btn" onClick={() => handleTabChange('login')}>
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {/* Claim Form */}
            {tab === 'claim' && (
              <form onSubmit={handleSubmit} className="auth-form auth-form-signup" key="claim">
                <div className="auth-form-header">
                  <h2>Kích hoạt tài khoản</h2>
                  <p>Dành cho khách vãng lai đã sử dụng dịch vụ tại cửa hàng.</p>
                </div>

                {errorMsg && <div className="badge badge-danger" style={{ display: 'block', padding: '10px' }}>{errorMsg}</div>}

                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label className="form-label" htmlFor="claim-phone">Số điện thoại</label>
                  <input
                    id="claim-phone"
                    type="tel"
                    className="form-input"
                    placeholder="0901234567"
                    value={claimPhone}
                    onChange={e => setClaimPhone(e.target.value)}
                    required
                    pattern="0[0-9]{9}"
                    title="Phone number must be exactly 10 digits and start with 0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="claim-email">Email</label>
                  <input
                    id="claim-email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={claimEmail}
                    onChange={e => setClaimEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="claim-password">Mật khẩu mới</label>
                  <div className="input-wrapper">
                    <input
                      id="claim-password"
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Ít nhất 8 ký tự"
                      value={claimPass}
                      onChange={e => setClaimPass(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button type="button" className="input-icon-btn" onClick={() => setShowPass(v => !v)}>
                      {showPass
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? <span className="spinner" /> : null}
                  {loading ? 'Đang kích hoạt…' : 'Kích hoạt tài khoản'}
                </button>

                <p className="auth-switch">
                  Đã có tài khoản?{' '}
                  <button type="button" className="link-btn" onClick={() => handleTabChange('login')}>
                    Đăng nhập
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Overlay Container (Desktop only) */}
        <div className="auth-overlay-container">
          <div className="auth-overlay">
            
            {/* Left Overlay Panel (Prompt to Sign In) */}
            <div className="auth-overlay-panel auth-overlay-left">
              <Link to="/" className="auth-back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back to Home
              </Link>
              
              <div className="auth-brand">
                <div className="auth-brand-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M19 7H5C3.34 7 2 8.34 2 10v6c0 1.66 1.34 3 3 3h1a2 2 0 0 0 4 0h4a2 2 0 0 0 4 0h1c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3z" fill="url(#authCarGradOverlayLeft)"/>
                    <path d="M15.5 7L14 3H10L8.5 7" stroke="url(#authCarStrokeOverlayLeft)" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="7.5" cy="17.5" r="1.5" fill="white" opacity="0.9"/>
                    <circle cx="16.5" cy="17.5" r="1.5" fill="white" opacity="0.9"/>
                    <defs>
                      <linearGradient id="authCarGradOverlayLeft" x1="2" y1="7" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e90ff"/><stop offset="1" stopColor="#00d4ff"/>
                      </linearGradient>
                      <linearGradient id="authCarStrokeOverlayLeft" x1="8" y1="3" x2="16" y2="7" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e90ff"/><stop offset="1" stopColor="#00d4ff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span>AutoWash<span className="gradient-text">Pro</span></span>
              </div>

              <h1>Welcome Back!</h1>
              <p>To keep connected with us please login with your personal info</p>
              
              <button type="button" className="btn btn-overlay btn-lg" style={{ marginTop: '20px' }} onClick={() => handleTabChange('login')}>
                Sign In
              </button>

              <div className="auth-features" style={{ marginTop: '40px', textAlign: 'left', width: '100%', maxWidth: '320px' }}>
                {[
                  { icon: '🚀', text: 'Book in under 60 seconds' },
                  { icon: '🛡️', text: 'Certified & insured technicians' },
                ].map((f, i) => (
                  <div key={i} className="auth-feature-item" style={{ justifyContent: 'flex-start' }}>
                    <span>{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Overlay Panel (Prompt to Sign Up) */}
            <div className="auth-overlay-panel auth-overlay-right">
              <Link to="/" className="auth-back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back to Home
              </Link>
              
              <div className="auth-brand">
                <div className="auth-brand-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M19 7H5C3.34 7 2 8.34 2 10v6c0 1.66 1.34 3 3 3h1a2 2 0 0 0 4 0h4a2 2 0 0 0 4 0h1c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3z" fill="url(#authCarGradOverlayRight)"/>
                    <path d="M15.5 7L14 3H10L8.5 7" stroke="url(#authCarStrokeOverlayRight)" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="7.5" cy="17.5" r="1.5" fill="white" opacity="0.9"/>
                    <circle cx="16.5" cy="17.5" r="1.5" fill="white" opacity="0.9"/>
                    <defs>
                      <linearGradient id="authCarGradOverlayRight" x1="2" y1="7" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e90ff"/><stop offset="1" stopColor="#00d4ff"/>
                      </linearGradient>
                      <linearGradient id="authCarStrokeOverlayRight" x1="8" y1="3" x2="16" y2="7" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e90ff"/><stop offset="1" stopColor="#00d4ff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span>AutoWash<span className="gradient-text">Pro</span></span>
              </div>

              <h1>Hello, Friend!</h1>
              <p>Enter your personal details and start your journey with us</p>
              
              <button type="button" className="btn btn-overlay btn-lg" style={{ marginTop: '20px' }} onClick={() => handleTabChange('signup')}>
                Create Account
              </button>

              <div className="auth-features" style={{ marginTop: '40px', textAlign: 'left', width: '100%', maxWidth: '320px' }}>
                {[
                  { icon: '🌿', text: 'Eco-friendly products only' },
                  { icon: '⭐', text: '4.9/5 from 12,000+ reviews' },
                ].map((f, i) => (
                  <div key={i} className="auth-feature-item" style={{ justifyContent: 'flex-start' }}>
                    <span>{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
