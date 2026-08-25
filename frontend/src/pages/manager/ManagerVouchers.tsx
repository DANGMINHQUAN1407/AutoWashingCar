import { useState, useEffect, useCallback } from 'react'
import * as api from '../../services/api'
import type { VoucherItem } from '../../services/api'
import '../Dashboard.css' // Use dashboard styles for standard premium look

const APPROVAL_LABELS: Record<number, string> = { 1: 'Chờ duyệt', 2: 'Đã duyệt', 3: 'Từ chối' }

export default function ManagerVouchers() {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [filterStatus, setFilterStatus] = useState<number | ''>(1) // Default show pending
  
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error'; message: string }>>([])
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const loadVouchers = useCallback(async () => {
    setListLoading(true)
    setListError('')
    try {
      const res = await api.getVouchers({
        page,
        pageSize,
        approvalStatus: filterStatus !== '' ? filterStatus : undefined,
      })
      setVouchers(res.items)
      setTotalCount(res.totalCount || 0)
      setTotalPages(res.totalPages || Math.max(1, Math.ceil((res.totalCount || 0) / pageSize)))
    } catch (e: any) {
      setListError(e?.message || 'Không tải được danh sách voucher.')
    }
    setListLoading(false)
  }, [filterStatus, page, pageSize])

  useEffect(() => { loadVouchers() }, [loadVouchers])

  const handleApprove = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn phê duyệt voucher này?')) return
    try {
      await api.approveVoucher(id)
      showToast('Phê duyệt thành công', 'success')
      loadVouchers()
    } catch (e: any) {
      showToast(e?.message || 'Lỗi khi phê duyệt.', 'error')
    }
  }

  const handleReject = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn từ chối voucher này?')) return
    try {
      await api.rejectVoucher(id)
      showToast('Từ chối thành công', 'success')
      loadVouchers()
    } catch (e: any) {
      showToast(e?.message || 'Lỗi khi từ chối.', 'error')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      if (!window.confirm('Bạn có chắc chắn muốn tạm dừng voucher này?')) return
    }
    try {
      await api.setActiveVoucher(id, !currentStatus)
      showToast(`Đã ${!currentStatus ? 'kích hoạt' : 'tạm dừng'} voucher`, 'success')
      loadVouchers()
    } catch (e: any) {
      showToast(e?.message || 'Lỗi khi thay đổi trạng thái hoạt động.', 'error')
    }
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
  const fmtDiscount = (v: VoucherItem) =>
    v.discountType === 1 ? `${v.discountValue}%` : `${v.discountValue.toLocaleString('vi-VN')}đ`

  return (
    <div className="portal-page">
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} className="animate-slide-in" style={{ 
            padding: '12px 20px', 
            background: 'var(--color-bg-card)', 
            borderLeft: `4px solid ${t.type === 'success' ? 'var(--color-primary)' : 'var(--color-danger)'}`, 
            borderRadius: 'var(--radius-sm)', 
            boxShadow: 'var(--shadow-card)', 
            color: 'var(--color-heading)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            minWidth: '250px'
          }}>
            {t.type === 'success' ? '✅' : '❌'} {t.message}
          </div>
        ))}
      </div>

      <div className="dash-header">
        <div>
          <h2>Phê duyệt mã khuyến mãi</h2>
          <p>Duyệt các voucher do nhân viên tạo hoặc xem voucher toàn hệ thống do Admin phát hành.</p>
        </div>
      </div>

      {/* Glassmorphism Filters */}
      <div className="glass-filters" style={{ marginBottom: '20px' }}>
        <div className="filter-input-wrap" style={{ flex: 1, maxWidth: '300px' }}>
          <label className="form-label">Lọc theo trạng thái duyệt</label>
          <select
            className="form-input form-select-custom"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value={1}>Chờ duyệt (Staff tạo)</option>
            <option value={2}>Đã duyệt / Phát hành</option>
            <option value={3}>Từ chối</option>
          </select>
        </div>
        
        <button className="btn btn-ghost btn-sm mt-4" onClick={loadVouchers} disabled={listLoading} style={{ alignSelf: 'flex-end', height: '42px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Làm mới
        </button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {listError && (
          <div style={{ padding: '20px' }}>
            <div className="badge badge-danger" style={{ display: 'block', padding: '10px 14px' }}>
              {listError}
            </div>
          </div>
        )}

        {listLoading ? (
          <div style={{ padding: '20px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer" style={{ height: '80px', marginBottom: '10px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : vouchers.length === 0 ? (
          <div className="empty-state-premium">
            <div className="empty-state-icon-premium">📭</div>
            <h3>Không có voucher nào</h3>
            <p>Không tìm thấy voucher trong trạng thái này.</p>
          </div>
        ) : (
          <div className="custom-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--color-border-dim)' }}>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-heading)' }}>Mã Voucher</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-heading)' }}>Chiết khấu</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-heading)' }}>Thời hạn</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-heading)' }}>Nguồn gốc</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-heading)' }}>Trạng thái</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-heading)', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => {
                  const isGlobal = !v.branchId;
                  const canDeactivate = v.approvalStatus === 2 && !isGlobal;

                  return (
                    <tr key={v.voucherId} style={{ borderBottom: '1px solid var(--color-border-dim)', transition: 'background 0.2s', ...(!v.isActive && v.approvalStatus === 2 ? { opacity: 0.6 } : {}) }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-cyan)', fontSize: '1.05rem', letterSpacing: '0.5px' }}>{v.voucherCode}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          SL: {v.quantity} (Đã dùng: {v.usedCount}) {v.requiredPoints > 0 ? `| 🪙 ${v.requiredPoints} điểm` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '0.95rem' }}>{fmtDiscount(v)}</div>
                        {v.minOrderAmount ? <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Min: {v.minOrderAmount.toLocaleString('vi-VN')}đ</div> : null}
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        <div>{fmtDate(v.startUtc)}</div>
                        <div style={{ color: 'var(--color-text-dim)' }}>đến {fmtDate(v.endUtc)}</div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {isGlobal ? (
                          <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)' }}>Hệ thống (Admin)</span>
                        ) : (
                          <div>
                            <span className="badge badge-secondary">Nội bộ (Staff)</span>
                            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--color-text-dim)' }}>Bởi: {v.createdByUserName}</div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                          <span className={`badge ${v.approvalStatus === 1 ? 'badge-warning' : v.approvalStatus === 2 ? 'badge-success' : 'badge-danger'}`}>
                            {APPROVAL_LABELS[v.approvalStatus] ?? '—'}
                          </span>
                          {v.approvalStatus === 2 && (
                            <span className={`badge ${v.isActive ? 'badge-primary' : 'badge-danger'}`} style={v.isActive ? {background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'} : {}}>
                              {v.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {v.approvalStatus === 1 && !isGlobal && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => handleApprove(v.voucherId)}>Phê duyệt</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleReject(v.voucherId)}>Từ chối</button>
                            </>
                          )}
                          
                          {canDeactivate && (
                            <label className="switch-premium" title={v.isActive ? 'Tạm dừng voucher này' : 'Kích hoạt voucher này'}>
                              <input
                                type="checkbox"
                                checked={v.isActive}
                                onChange={() => handleToggleActive(v.voucherId, v.isActive)}
                              />
                              <span className="slider-premium" />
                            </label>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!listLoading && !listError && vouchers.length > 0 && (
        <div className="pagination-container-premium animate-fade-in" style={{ marginTop: '20px' }}>
          <div className="pagination-stats" style={{ fontSize: '0.85rem' }}>
            Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng: {totalCount})
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
            <button
              type="button"
              className="btn-page-nav"
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages || vouchers.length < pageSize}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
