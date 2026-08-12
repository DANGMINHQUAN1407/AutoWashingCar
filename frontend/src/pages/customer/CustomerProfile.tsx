import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import AnimatedButton from '../../components/AnimatedButton'
import './CustomerProfile.css'
import '../Dashboard.css'

export default function CustomerProfile() {
  const { user, login } = useAuth()
  
  // Profile Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Password Form State
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Sync state with context user data
  useEffect(() => {
    if (user) {
      setFullName(user.FullName || user.fullName || user.name || '')
      setEmail(user.Email || user.email || '')
      setPhoneNumber(user.PhoneNumber || user.phone || '')
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setProfileMessage({ text: 'Please enter your full name.', type: 'error' })
      return
    }

    try {
      setProfileLoading(true)
      setProfileMessage(null)
      const updatedUser = await api.updateProfile({
        FullName: fullName.trim(),
        Email: email.trim() || undefined,
        PhoneNumber: phoneNumber.trim() || undefined
      })

      // Sync the context state
      if (updatedUser) {
        // Keep the tierName we previously fetched
        const syncedUser = {
          ...user,
          ...updatedUser,
          fullName: updatedUser.fullName ?? updatedUser.FullName,
          FullName: updatedUser.fullName ?? updatedUser.FullName,
          email: updatedUser.email ?? updatedUser.Email,
          Email: updatedUser.email ?? updatedUser.Email,
          phone: updatedUser.phoneNumber ?? updatedUser.PhoneNumber,
          PhoneNumber: updatedUser.phoneNumber ?? updatedUser.PhoneNumber,
        }
        
        // Re-save token and update context
        const token = localStorage.getItem('token')
        if (token) {
          login(token, syncedUser)
        }
      }

      setProfileMessage({ text: 'Profile details updated successfully!', type: 'success' })
    } catch (err: any) {
      console.error(err)
      setProfileMessage({ text: extractErrorMessage(err, 'Failed to update profile information. Please try again.'), type: 'error' })
    } finally {
      setProfileLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ text: 'Please fill in all password fields.', type: 'error' })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ text: 'New password must be at least 8 characters long.', type: 'error' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'New password and confirm password do not match.', type: 'error' })
      return
    }

    try {
      setPasswordLoading(true)
      setPasswordMessage(null)
      await api.changePassword({
        OldPassword: oldPassword,
        NewPassword: newPassword
      })

      setPasswordMessage({ text: 'Password updated successfully!', type: 'success' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error(err)
      setPasswordMessage({ text: extractErrorMessage(err, 'Failed to change password. Please try again.'), type: 'error' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const memberTier = user?.tierName || 'Bronze'
  const memberSince = user && (user as any).createdAtUtc
    ? new Date((user as any).createdAtUtc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown'

  return (
    <div className="portal-page profile-page-container">
      <div className="dash-header">
        <div>
          <h2>Account Settings</h2>
          <p>Update your personal information and manage your account security settings.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left Card: Account Overview & Details */}
        <div className="profile-left-column">
          <div className="card profile-card-overview">
            <div className="profile-avatar-large">
              {(fullName || 'U').substring(0, 2).toUpperCase()}
            </div>
            <h3>{fullName || 'Customer'}</h3>
            <span className="profile-tier-badge">{memberTier} Member</span>
            
            <div className="profile-meta-info-list">
              <div className="profile-meta-row">
                <span className="meta-label">Role:</span>
                <span className="meta-val">Customer</span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Joined:</span>
                <span className="meta-val">{memberSince}</span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Status:</span>
                <span className="meta-val status-active">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Personal info edit & Password change */}
        <div className="profile-right-column">
          {/* Card 1: Edit Details */}
          <div className="card profile-form-card">
            <h3 className="form-card-title">👤 Personal Information</h3>
            
            {profileMessage && (
              <div className={`profile-alert alert-${profileMessage.type}`}>
                {profileMessage.type === 'success' ? '✅' : '❌'} {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name <span className="req-star">*</span></label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    disabled={profileLoading}
                    required
                  />
                </div>
              </div>

              <div className="form-group-row two-cols">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    disabled={profileLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    disabled={profileLoading}
                  />
                </div>
              </div>

              <AnimatedButton
                type="submit"
                variant="primary"
                className="btn-save"
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </AnimatedButton>
            </form>
          </div>

          {/* Card 2: Security / Password change */}
          <div className="card profile-form-card">
            <h3 className="form-card-title">🔒 Security & Password</h3>

            {passwordMessage && (
              <div className={`profile-alert alert-${passwordMessage.type}`}>
                {passwordMessage.type === 'success' ? '✅' : '❌'} {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="oldPassword">Current Password <span className="req-star">*</span></label>
                  <input
                    type="password"
                    id="oldPassword"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={passwordLoading}
                    required
                  />
                </div>
              </div>

              <div className="form-group-row two-cols">
                <div className="form-group">
                  <label htmlFor="newPassword">New Password <span className="req-star">*</span></label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    disabled={passwordLoading}
                    required
                    minLength={8}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password <span className="req-star">*</span></label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retype new password"
                    disabled={passwordLoading}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <AnimatedButton
                type="submit"
                variant="primary"
                className="btn-save"
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Changing password...' : 'Update Password'}
              </AnimatedButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
