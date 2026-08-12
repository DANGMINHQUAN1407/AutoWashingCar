import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api'
import './Staff.css'

type RegisteredCustomer = {
  userId: string
  fullName: string
  phoneNumber?: string
  email?: string
  isGuest: boolean
}

export default function StaffRegister() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RegisteredCustomer | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!fullName.trim()) { setError('Full name is required.'); return }
    setSubmitting(true)
    setError('')
    try {
      const customer = await api.registerWalkInCustomer({
        FullName: fullName.trim(),
        PhoneNumber: phone.trim() || undefined,
        Email: email.trim() || undefined,
      })
      setResult(customer as RegisteredCustomer)
      setFullName('')
      setPhone('')
      setEmail('')
    } catch (e: any) {
      setError(e?.message || 'Registration failed. Please try again.')
    }
    setSubmitting(false)
  }

  const handleReset = () => {
    setResult(null)
    setError('')
  }

  if (result) {
    return (
      <div className="portal-page">
        <div className="ops-header">
          <div>
            <h2>Register Customer</h2>
            <p>Create a new customer account at the counter.</p>
          </div>
        </div>

        <div className="register-layout">
          <div className="register-result">
            <div className="register-result-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="register-result-name">{result.fullName}</div>
            {result.phoneNumber && <div className="register-result-sub">{result.phoneNumber}</div>}
            {result.email && <div className="register-result-sub">{result.email}</div>}
            <span className="tier-badge tier-badge--guest" style={{ marginTop: 4 }}>
              {result.isGuest ? 'Guest Account' : 'Member Account'}
            </span>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Link to="/staff/customers" className="btn btn-primary btn-sm">
                Check In Now →
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={handleReset}>
                Register Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-page">
      <div className="ops-header">
        <div>
          <h2>Register Customer</h2>
          <p>Create a new customer account at the counter.</p>
        </div>
      </div>

      <div className="register-layout">
        {error && (
          <div className="staff-alert staff-alert--error" style={{ marginBottom: 16 }}>
            <span>{error}</span>
            <button className="staff-alert-close" onClick={() => setError('')}>✕</button>
          </div>
        )}

        <form className="checkin-panel" onSubmit={handleSubmit}>
          <div className="checkin-panel-title">Customer Information</div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name *</label>
            <input
              id="reg-name"
              className="form-input"
              placeholder="Nguyen Van A"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">Phone Number</label>
            <input
              id="reg-phone"
              className="form-input"
              placeholder="0901 234 567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="customer@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div style={{ paddingTop: 4 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering…' : 'Create Customer Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
