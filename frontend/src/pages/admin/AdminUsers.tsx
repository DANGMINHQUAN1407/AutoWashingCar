import { useEffect, useState } from 'react'
import api, { type UserDto, type UsersPageResult } from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import ConfirmModal from '../../components/ConfirmModal'
import './AdminUsers.css'
import '../Dashboard.css'

type ModalMode = 'create' | 'edit' | null

export default function AdminUsers() {
  // Filter States
  const [search, setSearch] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [role, setRole] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('all') // 'all', 'active', 'inactive'

  // Pagination States
  const [page, setPage] = useState(1)
  const [pageSize] = useState(6)

  // Data States
  const [users, setUsers] = useState<UserDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Interactive Operations
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserDto | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Modal States (Create/Edit)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null)
  const [modalForm, setModalForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    role: 'Staff',
  })
  const [modalFormLoading, setModalFormLoading] = useState(false)
  const [modalFormError, setModalFormError] = useState<string | null>(null)

  // Custom Toast Notifications State
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error'; message: string }>>([])

  // Helper: Trigger custom toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const activeParam = isActiveFilter === 'active' 
        ? true 
        : isActiveFilter === 'inactive' 
          ? false 
          : undefined

      const result: UsersPageResult = await api.getUsers({
        page,
        pageSize,
        role: role || undefined,
        isActive: activeParam,
        search: search.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
      })

      setUsers(result.items)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
    } catch (err: any) {
      console.error(err)
      const cleanErr = extractErrorMessage(err, 'Không thể tải danh sách người dùng.')
      setError(cleanErr)
      showToast(cleanErr, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Debounced API Fetch Effect
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers()
    }, 350)

    return () => clearTimeout(delayDebounce)
  }, [search, phoneNumber, role, isActiveFilter, page])

  // Reset Filters helper
  const handleResetFilters = () => {
    setSearch('')
    setPhoneNumber('')
    setRole('')
    setIsActiveFilter('all')
    setPage(1)
    showToast('Đã xóa toàn bộ bộ lọc', 'success')
  }

  // Toggle User Active Status
  const handleToggleActive = async (user: UserDto) => {
    setActionLoadingId(user.userId)
    const targetStatus = !user.isActive
    try {
      if (targetStatus) {
        await api.activateUser(user.userId)
        showToast(`Đã kích hoạt tài khoản cho ${user.fullName}`, 'success')
      } else {
        await api.deactivateUser(user.userId)
        showToast(`Đã vô hiệu hóa tài khoản của ${user.fullName}`, 'success')
      }
      // Update local state
      setUsers(prev => prev.map(u => u.userId === user.userId ? { ...u, isActive: targetStatus } : u))
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Thao tác thất bại.'), 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Soft Delete User
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    setDeleteLoading(true)
    try {
      await api.deleteUser(userToDelete.userId)
      showToast(`Đã xóa thành công người dùng: ${userToDelete.fullName}`, 'success')
      setUserToDelete(null)
      fetchUsers() // Refresh list
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Xóa người dùng thất bại.'), 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (user: UserDto) => {
    setSelectedUser(user)
    setModalForm({
      fullName: user.fullName,
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role || 'Customer',
    })
    setModalFormError(null)
    setModalMode('edit')
  }

  // Open Create Modal
  const openCreateModal = () => {
    setModalForm({
      fullName: '',
      email: '',
      phoneNumber: '',
      role: 'Staff',
    })
    setModalFormError(null)
    setModalMode('create')
  }

  // Handle Modal Form Submit
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalFormLoading(true)
    setModalFormError(null)

    try {
      const payload = {
        FullName: modalForm.fullName.trim(),
        Email: modalForm.email.trim() || undefined,
        PhoneNumber: modalForm.phoneNumber.trim() || undefined,
        Role: modalForm.role,
      }

      if (modalMode === 'create') {
        await api.createStaff(payload)
        showToast('Tạo tài khoản nhân viên thành công. Nếu có email hợp lệ, hệ thống sẽ gửi mật khẩu tạm thời.', 'success')
      } else if (modalMode === 'edit' && selectedUser) {
        await api.updateUser(selectedUser.userId, payload)
        showToast('Cập nhật thông tin người dùng thành công.', 'success')
      }

      setModalMode(null)
      fetchUsers() // Refresh list
    } catch (err: any) {
      console.error(err)
      setModalFormError(extractErrorMessage(err, 'Thao tác thất bại. Vui lòng thử lại.'))
    } finally {
      setModalFormLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
      : 'U'
  }

  return (
    <div className="portal-page users-page">
      {/* Page Header */}
      <div className="dash-header">
        <div>
          <h2>User Management</h2>
          <p>Create and manage branch staff, manager, and customer accounts.</p>
        </div>
        <button 
          type="button" 
          className="btn btn-primary btn-premium-glow"
          onClick={openCreateModal}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Staff
        </button>
      </div>

      {/* Modern Filter Bar */}
      <div className="glass-filters">
        {/* Search filter */}
        <div className="filter-input-wrap">
          <label className="form-label" htmlFor="search-input">Search by Name</label>
          <input
            id="search-input"
            className="form-input form-input-icon"
            placeholder="Search by name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <span className="filter-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
        </div>

        {/* Phone filter */}
        <div className="filter-input-wrap">
          <label className="form-label" htmlFor="phone-input">Phone Number</label>
          <input
            id="phone-input"
            className="form-input form-input-icon"
            placeholder="Filter by phone..."
            value={phoneNumber}
            onChange={e => { setPhoneNumber(e.target.value); setPage(1); }}
          />
          <span className="filter-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </span>
        </div>

        {/* Role filter */}
        <div className="filter-input-wrap">
          <label className="form-label" htmlFor="role-select">Role</label>
          <select
            id="role-select"
            className="form-input form-select-custom"
            value={role}
            onChange={e => { setRole(e.target.value); setPage(1); }}
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Staff">Staff</option>
            <option value="Customer">Customer</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="filter-input-wrap">
          <label className="form-label" htmlFor="status-select">Status</label>
          <select
            id="status-select"
            className="form-input form-select-custom"
            value={isActiveFilter}
            onChange={e => { setIsActiveFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="btn-reset"
          onClick={handleResetFilters}
          title="Reset filters"
          disabled={!search && !phoneNumber && !role && isActiveFilter === 'all'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Clear
        </button>
      </div>

      {/* Users List Area */}
      <div className="users-list-container">
        {loading ? (
          // Skeletons
          Array.from({ length: pageSize }).map((_, index) => (
            <div key={index} className="skeleton-user-card skeleton-shimmer">
              <div className="skeleton-avatar" />
              <div className="skeleton-info">
                <div className="skeleton-line skeleton-line-title" />
                <div className="skeleton-line skeleton-line-sub" />
              </div>
              <div className="skeleton-actions">
                <div className="skeleton-btn" />
                <div className="skeleton-btn-circle" />
                <div className="skeleton-btn-circle" />
              </div>
            </div>
          ))
        ) : error ? (
          // Error state
          <div className="empty-state-premium">
            <div className="empty-state-icon-premium">⚠️</div>
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={fetchUsers}>
              Try Again
            </button>
          </div>
        ) : users.length === 0 ? (
          // Empty State
          <div className="empty-state-premium animate-fade-in">
            <div className="empty-state-icon-premium">👥</div>
            <h3>No users found</h3>
            <p>We couldn't find any users matching your filter criteria. Try adjusting your search query.</p>
          </div>
        ) : (
          // Users List
          users.map((u, index) => {
            const initials = getInitials(u.fullName)
            const isSelf = false // Note: Could be connected to current user ID to prevent self-actions

            return (
              <div 
                key={u.userId} 
                className={`user-card-premium ${u.isActive ? 'active-user' : 'inactive-user'}`}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                {/* User Info Block */}
                <div className="user-info-section">
                  <div className="user-avatar-wrap">
                    <div className="user-avatar-premium">{initials}</div>
                    <span className={`status-indicator-dot ${u.isActive ? 'status-dot-active' : 'status-dot-inactive'}`} />
                  </div>

                  <div className="user-details-text">
                    <h3>{u.fullName}</h3>
                    <div className="user-meta-row">
                      <span className={`badge ${
                        u.role === 'Admin' ? 'badge-danger' : 
                        u.role === 'Manager' ? 'badge-warning' : 
                        u.role === 'Staff' ? 'badge-primary' : 'badge-success'
                      }`}>
                        {u.role}
                      </span>
                      
                      {u.email && (
                        <div className="meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          {u.email}
                        </div>
                      )}

                      {u.phoneNumber && (
                        <div className="meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          {u.phoneNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Block */}
                <div className="user-actions-section">
                  {/* Active Toggle Switch */}
                  <label className="switch-premium" title={u.isActive ? 'Deactivate user' : 'Activate user'}>
                    <input
                      type="checkbox"
                      checked={u.isActive}
                      disabled={actionLoadingId === u.userId || u.role === 'Admin'}
                      onChange={() => handleToggleActive(u)}
                    />
                    <span className="slider-premium" />
                  </label>

                  {/* Edit details */}
                  <button
                    type="button"
                    className="action-btn-circle"
                    title="Edit user details"
                    style={{ color: 'var(--color-primary)' }}
                    onClick={() => openEditModal(u)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>

                  {/* Delete user */}
                  <button
                    type="button"
                    className="action-btn-circle"
                    title="Delete user"
                    disabled={isSelf || u.role === 'Admin'}
                    onClick={() => setUserToDelete(u)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination Container */}
      {!loading && !error && users.length > 0 && (
        <div className="pagination-container-premium animate-fade-in">
          <div className="pagination-stats">
            Showing <strong>{((page - 1) * pageSize) + 1}</strong> to <strong>{Math.min(page * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> users
          </div>
          <div className="pagination-buttons">
            <button
              type="button"
              className="btn-page-nav"
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="page-indicator-text">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn-page-nav"
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Staff Modal ── */}
      {modalMode && (
        <div className="confirm-modal-overlay" onClick={() => !modalFormLoading && setModalMode(null)}>
          <div className="confirm-modal-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', textAlign: 'left', alignItems: 'stretch' }}>
            <div className="vehicle-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--color-heading)' }}>{modalMode === 'edit' ? 'Edit User Details' : 'Create Staff Account'}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {modalMode === 'edit' ? 'Update fullname, phone, and role.' : 'Register a new branch staff or manager account.'}
                </p>
              </div>
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setModalMode(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {modalFormError && (
                <div className="badge badge-danger" style={{ display: 'block', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  {modalFormError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="staff-name">Full Name *</label>
                <input
                  id="staff-name"
                  className="form-input"
                  required
                  placeholder="e.g. Nguyen Van A"
                  value={modalForm.fullName}
                  onChange={e => setModalForm(prev => ({ ...prev, fullName: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="staff-email">Email Address</label>
                <input
                  id="staff-email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. staff@autowashpro.com"
                  value={modalForm.email}
                  disabled={modalMode === 'edit'} // Email is usually unique identity, modify with care
                  onChange={e => setModalForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="staff-phone">Phone Number</label>
                <input
                  id="staff-phone"
                  className="form-input"
                  placeholder="e.g. 0912345678"
                  value={modalForm.phoneNumber}
                  onChange={e => setModalForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="staff-role">Role *</label>
                {modalMode === 'edit' && selectedUser?.role === 'Admin' ? (
                  <select
                    id="staff-role"
                    className="form-input form-select-custom"
                    value={modalForm.role}
                    disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  >
                    <option value={modalForm.role}>{modalForm.role}</option>
                  </select>
                ) : (
                  <select
                    id="staff-role"
                    className="form-input form-select-custom"
                    value={modalForm.role}
                    onChange={e => setModalForm(prev => ({ ...prev, role: e.target.value }))}
                  >
                    {modalMode === 'edit' && <option value="Customer">Customer</option>}
                    <option value="Staff">Staff</option>
                    <option value="Manager">Manager</option>
                  </select>
                )}
              </div>

              <div className="confirm-modal-actions" style={{ marginTop: '14px' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setModalMode(null)} 
                  disabled={modalFormLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={modalFormLoading}
                >
                  {modalFormLoading 
                    ? (modalMode === 'edit' ? 'Updating...' : 'Creating...') 
                    : (modalMode === 'edit' ? 'Save Changes' : 'Create Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Delete Account"
        variant="danger"
        isLoading={deleteLoading}
        onCancel={() => setUserToDelete(null)}
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        message={
          <p>
            Are you sure you want to delete the user{' '}
            <strong className="highlight-plate">
              {userToDelete?.fullName}
            </strong>?
          </p>
        }
      />

      {/* Custom Toast Notifications Stack */}
      <div className="toast-container-custom">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast-custom ${toast.type === 'success' ? 'toast-custom-success' : 'toast-custom-error'}`}
          >
            {toast.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 16 14"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
            <span style={{ fontSize: '0.92rem', color: 'var(--color-heading)', fontWeight: 500 }}>
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
