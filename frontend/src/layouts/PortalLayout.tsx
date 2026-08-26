import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserRole } from '../constants/userRoles'
import { getRoleLabel } from '../utils/roleUtils'
import './PortalLayout.css'

type NavItem = {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  [UserRole.Customer]: [
    {
      to: '/customer',
      label: 'Tổng quan',
      end: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    },
    {
      to: '/customer/vehicles',
      label: 'Xe của tôi',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 13h18"/><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>,
    },
    {
      to: '/customer/bookings',
      label: 'Lịch hẹn của tôi',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
    {
      to: '/customer/loyalty',
      label: 'Tích điểm & Hạng',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    },
    {
      to: '/customer/vouchers',
      label: 'Mã khuyến mãi',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    },
    {
      to: '/customer/profile',
      label: 'Hồ sơ cá nhân',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
  ],
  [UserRole.Staff]: [
    {
      to: '/staff',
      label: 'Vận hành & Đơn hàng',
      end: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
    {
      to: '/staff/customers',
      label: 'Khách trực tiếp (Walk-In)',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      to: '/staff/vouchers',
      label: 'Mã giảm giá',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    },
    {
      to: '/staff/reviews',
      label: 'Đánh giá khách hàng',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/></svg>,
    },
    {
      to: '/staff/profile',
      label: 'Hồ sơ cá nhân',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
  ],
  [UserRole.Manager]: [
    {
      to: '/manager',
      label: 'Tổng quan chi nhánh',
      end: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    },
    {
      to: '/manager/branches',
      label: 'Thông tin chi nhánh',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      to: '/manager/services',
      label: 'Dịch vụ',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    },
    {
      to: '/manager/slots',
      label: 'Quản lý khung giờ',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
      to: '/manager/staff',
      label: 'Quản lý nhân viên',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      to: '/manager/customers',
      label: 'Khách hàng & Điểm thưởng',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      to: '/manager/vouchers',
      label: 'Duyệt Voucher',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    },
    {
      to: '/manager/reviews',
      label: 'Đánh giá khách hàng',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/></svg>,
    },
    {
      to: '/manager/vehicle-catalogs',
      label: 'Danh mục loại xe',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>,
    },
    {
      to: '/manager/profile',
      label: 'Hồ sơ cá nhân',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
  ],
  [UserRole.Admin]: [
    {
      to: '/admin',
      label: 'Tổng quan hệ thống',
      end: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    },
    {
      to: '/admin/users',
      label: 'Quản lý người dùng',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      to: '/admin/branches',
      label: 'Chi nhánh',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      to: '/admin/vehicle-transfers',
      label: 'Chuyển nhượng xe',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    },
    {
      to: '/admin/tiers',
      label: 'Hạng thành viên',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>,
    },
    {
      to: '/admin/vouchers',
      label: 'Mã khuyến mãi',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    },
    {
      to: '/admin/settings',
      label: 'Cài đặt hệ thống',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    },
    {
      to: '/admin/reviews',
      label: 'Đánh giá khách hàng',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/></svg>,
    },
    {
      to: '/admin/vehicle-catalogs',
      label: 'Danh mục loại xe',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>,
    },
  ],
}

const ROLE_BADGE: Record<UserRole, string> = {
  [UserRole.Customer]: 'Thành viên',
  [UserRole.Staff]: 'Nhân viên vận hành',
  [UserRole.Manager]: 'Quản lý chi nhánh',
  [UserRole.Admin]: 'Quản trị viên',
}


type PortalLayoutProps = {
  role: UserRole
}

function PortalLayout({ role }: PortalLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = NAV_BY_ROLE[role]
  const displayName = user?.FullName || user?.fullName || user?.name || 'Người dùng'
  const initials = displayName.substring(0, 2).toUpperCase()

  const handleLogout = () => {
    navigate('/auth', { replace: true })
    setTimeout(() => {
      logout()
    }, 0)
  }

  const getSubTitle = () => {
    if (role === UserRole.Customer) {
      const name = user?.tierName || 'Đồng'
      const lower = name.toLowerCase()
      if (lower.includes('member') || lower.includes('hạng') || lower.includes('thành viên') || lower.includes('bậc')) {
        return name
      }
      return `Thành viên ${name}`
    }
    return ROLE_BADGE[role]
  }

  const getSubTitleClass = () => {
    if (role === UserRole.Customer) {
      const name = (user?.tierName || 'Bronze').split(' ')[0]
      return `tier-${name.toLowerCase()}`
    }
    return `role-${role?.toLowerCase()}`
  }

  return (
    <div className={`portal-layout portal-layout--${role.toLowerCase()}`}>
      <header className="portal-topbar">
        <div className="portal-topbar-inner container">
          <Link 
            to={
              role === UserRole.Customer ? '/' :
              role === UserRole.Admin ? '/admin' : 
              role === UserRole.Manager ? '/manager' : '/staff'
            } 
            className="portal-logo"
          >
            <span>AutoWash<span className="gradient-text">Pro</span></span>
          </Link>

          <div className="portal-topbar-meta">
            {role === UserRole.Customer && (
              <Link to="/" className="btn btn-ghost btn-sm" style={{ marginRight: '12px', display: 'inline-flex', alignItems: 'center' }}>
                Trang chủ
              </Link>
            )}
            <span className="portal-role-badge">{getRoleLabel(role)}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="portal-body container">
        <aside className="portal-sidebar">
          <div className="portal-user">
            <div className="portal-avatar">{initials}</div>
            <div className="portal-user-info">
              <h3>{displayName}</h3>
              <p className={`portal-user-subtitle ${getSubTitleClass()}`}>{getSubTitle()}</p>
            </div>
          </div>

          <nav className="portal-nav">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `portal-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="portal-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function CustomerLayout() {
  return <PortalLayout role={UserRole.Customer} />
}

export function StaffLayout() {
  return <PortalLayout role={UserRole.Staff} />
}

export function ManagerLayout() {
  return <PortalLayout role={UserRole.Manager} />
}

export function AdminLayout() {
  return <PortalLayout role={UserRole.Admin} />
}

export default PortalLayout
