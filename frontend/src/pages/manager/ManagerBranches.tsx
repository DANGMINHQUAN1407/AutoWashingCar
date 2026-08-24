import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBranch, getBranchServices } from '../../services/api'
import type { Branch, BranchService } from '../../types/branch'
import { extractErrorMessage } from '../../utils/errorUtils'
import './ManagerBranches.css'

export default function ManagerBranches() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [services, setServices] = useState<BranchService[]>([])

  useEffect(() => {
    let isCancelled = false

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const myBranch = await getMyBranch()
        if (isCancelled) return

        if (!myBranch?.branchId) {
          setBranch(null)
          return
        }

        setBranch(myBranch)

        const svcList = await getBranchServices(myBranch.branchId)
        if (isCancelled) return
        setServices(svcList)
      } catch (err) {
        if (!isCancelled) {
          setError(extractErrorMessage(err, 'Không thể tải thông tin chi nhánh.'))
        }
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    loadData()
    return () => { isCancelled = true }
  }, [])

  const activeServices = services.filter((s) => s.isActive)
  const inactiveServices = services.filter((s) => !s.isActive)

  if (loading) {
    return (
      <div className="mgr-branches">
        <header className="mgr-dash-header">
          <div>
            <h2>Thông tin chi nhánh</h2>
            <p>Đang tải thông tin chi nhánh của bạn...</p>
          </div>
        </header>
        <div className="mgr-branch-loading">
          <div className="mgr-branch-loading-spinner" />
          <span>Đang tải thông tin...</span>
        </div>
      </div>
    )
  }

  if (error || !branch) {
    return (
      <div className="mgr-branches">
        <header className="mgr-dash-header">
          <div>
            <h2>Thông tin chi nhánh</h2>
            <p>Quản lý thông tin chi nhánh được phân công.</p>
          </div>
        </header>
        <div className="mgr-branch-no-assign">
          <div className="mgr-branch-no-assign-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h3>Chưa được phân công chi nhánh</h3>
          <p>{error || 'Tài khoản của bạn hiện chưa được liên kết với chi nhánh nào. Vui lòng liên hệ Quản trị viên.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mgr-branches">
      <header className="mgr-dash-header">
        <div>
          <h2>Thông tin chi nhánh</h2>
          <p>Chi tiết vận hành và các gói dịch vụ tại chi nhánh.</p>
        </div>
        <Link to="/manager/services" className="mgr-btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          Quản lý dịch vụ
        </Link>
      </header>

      {/* Branch Overview Card */}
      <section className="mgr-branch-detail-card">
        <div className="mgr-branch-detail-glow" />
        <div className="mgr-branch-detail-header">
          <div className={`mgr-branch-icon mgr-branch-icon--${branch.isActive ? 'active' : 'closed'} mgr-branch-icon--lg`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="mgr-branch-detail-title">
            <h3>{branch.name}</h3>
            <span className="mgr-branch-id">Mã chi nhánh: {branch.branchCode || branch.branchId}</span>
          </div>
          <span className={`mgr-status-pill mgr-status-pill--${branch.isActive ? 'active' : 'closed'}`}>
            <span className="mgr-status-pill-dot" />
            {branch.isActive ? 'ĐANG MỞ CỬA' : 'ĐÃ ĐÓNG CỬA'}
          </span>
        </div>

        <div className="mgr-branch-detail-grid">
          <div className="mgr-branch-detail-field">
            <div className="mgr-field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Địa chỉ
            </div>
            <div className="mgr-field-value">
              {[branch.address, branch.city].filter(Boolean).join(', ') || '—'}
            </div>
          </div>

          {branch.phone && (
            <div className="mgr-branch-detail-field">
              <div className="mgr-field-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" />
                </svg>
                Số điện thoại
              </div>
              <div className="mgr-field-value">{branch.phone}</div>
            </div>
          )}

          {branch.managerName && (
            <div className="mgr-branch-detail-field">
              <div className="mgr-field-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Quản lý
              </div>
              <div className="mgr-field-value">{branch.managerName}</div>
            </div>
          )}

          <div className="mgr-branch-detail-field">
            <div className="mgr-field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              Trạng thái phục vụ
            </div>
            <div className="mgr-field-value">
              {branch.isActive ? 'Đang mở cửa tiếp nhận đặt lịch' : 'Tạm thời đóng cửa'}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="mgr-bento-grid">
        <div className="mgr-bento-card">
          <div className="mgr-bento-card-header">
            <span className="mgr-bento-label">Tổng số dịch vụ</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#A5E7FF" aria-hidden>
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div className="mgr-bento-value-row">
            <span className="mgr-bento-value">{services.length}</span>
            <span className="mgr-bento-trend mgr-bento-trend--muted">Gói dịch vụ</span>
          </div>
        </div>

        <div className="mgr-bento-card">
          <div className="mgr-bento-card-header">
            <span className="mgr-bento-label">Đang phục vụ</span>
            <svg width="22" height="17" viewBox="0 0 22 17" fill="#00FFC2" aria-hidden>
              <path d="M2 17C1.45 17 0.98 16.8 0.59 16.41C0.2 16.02 0 15.55 0 15C0 14.45 0.2 13.98 0.59 13.59C0.98 13.2 1.45 13 2 13H7.05L9.5 9.95L13.5 11.05L18.05 7.5C18.98 8.41 21 6.45 22 7C22 7.55 21.8 8.02 21.41 8.41C21.02 8.8 20.55 9 20 9H15.95L12.05 12.5L9.5 9.95L3.95 14.5C3.8 15.55 2.55 17 2 17Z" />
            </svg>
          </div>
          <div className="mgr-bento-value-row">
            <span className="mgr-bento-value">{activeServices.length}</span>
            <span className="mgr-bento-trend mgr-bento-trend--up">Khả dụng</span>
          </div>
          <div className="mgr-bento-progress">
            <div
              className="mgr-bento-progress-fill"
              style={{ width: services.length > 0 ? `${(activeServices.length / services.length) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <div className="mgr-bento-card">
          <div className="mgr-bento-card-header">
            <span className="mgr-bento-label">Đang tạm dừng</span>
            <svg width="22" height="19" viewBox="0 0 22 19" fill="#FF4B4B" aria-hidden>
              <path d="M0 19L11 0L22 19H0ZM11 16C11.28 16 11.52 15.9 11.71 15.71C11.9 15.52 12 15.28 12 15C12 14.72 11.9 14.48 11.71 14.29C11.52 14.1 11.28 14 11 14C10.72 14 10.48 14.1 10.29 14.29C10.1 14.48 10 14.72 10 15C10 15.28 10.1 15.52 10.29 15.71C10.48 15.9 10.72 16 11 16ZM10 13H12V8H10V13Z" />
            </svg>
          </div>
          <div className="mgr-bento-value-row">
            <span className="mgr-bento-value">{String(inactiveServices.length).padStart(2, '0')}</span>
            <span className="mgr-bento-trend mgr-bento-trend--down">Tạm dừng</span>
          </div>
          <p className="mgr-bento-note">Dịch vụ chưa mở bán</p>
        </div>
      </section>

      {/* Services Table */}
      <section className="mgr-branches-table-wrap">
        <div className="mgr-branch-section-header">
          <h3>Dịch vụ tại chi nhánh</h3>
          <Link to="/manager/services" className="mgr-link-btn">Quản lý dịch vụ →</Link>
        </div>

        <table className="mgr-branches-table">
          <thead>
            <tr>
              <th>Tên dịch vụ</th>
              <th>Giá niêm yết</th>
              <th>Thời gian dự kiến</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && (
              <tr>
                <td colSpan={4} className="mgr-branches-empty">
                  Chưa có dịch vụ nào được gán cho chi nhánh này.
                </td>
              </tr>
            )}
            {services.map((svc) => (
              <tr key={svc.branchServiceId ?? svc.serviceId}>
                <td>
                  <div className="mgr-branch-name">{svc.serviceName}</div>
                </td>
                <td>
                  {svc.basePrice != null
                    ? `${new Intl.NumberFormat('vi-VN').format(svc.basePrice)} đ`
                    : '—'}
                </td>
                <td>{svc.durationMinutes != null ? `${svc.durationMinutes} phút` : '—'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                    <span className={`mgr-status-pill mgr-status-pill--${svc.isActive ? 'active' : 'closed'}`}>
                      <span className="mgr-status-pill-dot" />
                      {svc.isActive ? 'HOẠT ĐỘNG' : 'TẠM DỪNG'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
