import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import '../customer/CustomerProfile.css'
import '../Dashboard.css'
import '../staff/Staff.css'

export default function ManagerProfile() {
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
      setProfileMessage({ text: 'Vui lòng nhập họ và tên.', type: 'error' })
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

      setProfileMessage({ text: 'Cập nhật thông tin cá nhân thành công!', type: 'success' })
    } catch (err: any) {
      console.error(err)
      setProfileMessage({ text: extractErrorMessage(err, 'Lỗi cập nhật thông tin cá nhân. Vui lòng thử lại.'), type: 'error' })
    } finally {
      setProfileLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ text: 'Vui lòng điền đầy đủ các thông tin mật khẩu.', type: 'error' })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ text: 'Mật khẩu mới phải có ít nhất 8 ký tự.', type: 'error' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'Mật khẩu mới và mật khẩu xác nhận không trùng khớp.', type: 'error' })
      return
    }

    try {
      setPasswordLoading(true)
      setPasswordMessage(null)
      await api.changePassword({
        OldPassword: oldPassword,
        NewPassword: newPassword
      })

      setPasswordMessage({ text: 'Đổi mật khẩu thành công!', type: 'success' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error(err)
      setPasswordMessage({ text: extractErrorMessage(err, 'Lỗi đổi mật khẩu. Vui lòng thử lại.'), type: 'error' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const memberSince = user && (user as any).createdAtUtc
    ? new Date((user as any).createdAtUtc).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown'

  return (
    <div className="portal-page">
      <div className="ops-header">
        <div>
          <h2>Thông tin cá nhân</h2>
          <p>Cập nhật thông tin cá nhân và thay đổi mật khẩu tài khoản của bạn.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 32, alignItems: 'start' }}>
        {/* Left Card: Account Overview & Details */}
        <div className="card profile-card-overview" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="profile-avatar-large" style={{ width: 112, height: 112, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 800, color: '#fff', boxShadow: '0 8px 32px rgba(99,102,241,0.25)', marginBottom: 20 }}>
            {(fullName || 'QL').substring(0, 2).toUpperCase()}
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: 8, fontWeight: 700 }}>{fullName || 'Quản lý'}</h3>
          <span style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', border: '1px solid var(--color-border)', marginBottom: 32 }}>
            QUẢN LÝ CỬA HÀNG
          </span>
          
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--color-border-dim)' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Vai trò</span>
              <strong style={{ color: 'var(--color-heading)', fontSize: '0.9rem' }}>Quản lý chi nhánh</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--color-border-dim)' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Ngày tham gia</span>
              <strong style={{ color: 'var(--color-heading)', fontSize: '0.9rem' }}>{memberSince}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Trạng thái</span>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontSize: '0.9rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 10px var(--color-success)' }}></span>
                Hoạt động
              </strong>
            </div>
          </div>
        </div>

        {/* Right Card: Personal info edit & Password change */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Card 1: Edit Details */}
          <div className="card profile-form-card" style={{ padding: 32 }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </span>
              Thông Tin Cá Nhân
            </h3>
            
            {profileMessage && (
              <div className={`staff-alert staff-alert--${profileMessage.type}`} style={{ marginBottom: 24 }}>
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Họ và tên <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên"
                  disabled={profileLoading}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Địa chỉ Email</label>
                  <input
                    type="email"
                    className="form-input"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    disabled={profileLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phoneNumber">Số điện thoại</label>
                  <input
                    type="tel"
                    className="form-input"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Nhập số điện thoại"
                    disabled={profileLoading}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={profileLoading}
                  style={{ padding: '10px 24px', fontSize: '0.95rem' }}
                >
                  {profileLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Security / Password change */}
          <div className="card profile-form-card" style={{ padding: 32 }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </span>
              Bảo Mật & Mật Khẩu
            </h3>

            {passwordMessage && (
              <div className={`staff-alert staff-alert--${passwordMessage.type}`} style={{ marginBottom: 24 }}>
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="oldPassword">Mật khẩu hiện tại <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="password"
                  className="form-input"
                  id="oldPassword"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={passwordLoading}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="newPassword">Mật khẩu mới <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input
                    type="password"
                    className="form-input"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    disabled={passwordLoading}
                    required
                    minLength={8}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">Xác nhận mật khẩu <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input
                    type="password"
                    className="form-input"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    disabled={passwordLoading}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordLoading}
                  style={{ padding: '10px 24px', fontSize: '0.95rem' }}
                >
                  {passwordLoading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
