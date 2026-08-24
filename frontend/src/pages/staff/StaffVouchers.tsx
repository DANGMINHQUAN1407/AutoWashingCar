import { useState, useEffect, useCallback } from 'react'
import * as api from '../../services/api'
import type { VoucherItem } from '../../services/api'
import '../admin/AdminBranches.css'
import '../admin/AdminUsers.css'
import '../Dashboard.css'
import './Staff.css'

const APPROVAL_LABELS: Record<number, string> = { 1: 'Pending', 2: 'Approved', 3: 'Rejected' }

export default function StaffVouchers() {
  const [form, setForm] = useState({
    VoucherCode: '',
    DiscountType: 1 as 1 | 2,
    DiscountValue: '',
    MinOrderAmount: '',
    MaxDiscountAmount: '',
    Quantity: '',
    StartUtc: '',
    EndUtc: '',
    requiredPoints: '',
  })
  
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [vouchers, setVouchers] = useState<VoucherItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<number | ''>('')
  
  // Custom Toasts
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
        pageSize: 100,
        approvalStatus: statusFilter !== '' ? statusFilter : undefined,
      })
      
      let items = res.items || []
      if (search.trim()) {
        const q = search.toLowerCase()
        items = items.filter(v => v.voucherCode.toLowerCase().includes(q))
      }

      setVouchers(items)
    } catch (e: any) {
      setListError(e?.message || 'Failed to load vouchers list.')
    }
    setListLoading(false)
  }, [search, statusFilter])

  useEffect(() => { 
    const delayDebounce = setTimeout(() => {
      loadVouchers() 
    }, 350)
    return () => clearTimeout(delayDebounce)
  }, [loadVouchers])

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('')
    showToast('Filters cleared', 'success')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.VoucherCode.trim()) { setFormError('Please enter a voucher code'); return }
    if (!form.DiscountValue || Number(form.DiscountValue) <= 0) { setFormError('Discount value must be greater than 0'); return }
    if (form.DiscountType === 1 && Number(form.DiscountValue) > 100) { setFormError('Discount percentage cannot exceed 100%'); return }
    if (!form.Quantity || Number(form.Quantity) < 1) { setFormError('Quantity must be at least 1'); return }
    if (!form.StartUtc || !form.EndUtc) { setFormError('Please select start and end dates'); return }
    if (new Date(form.EndUtc) <= new Date(form.StartUtc)) { setFormError('End date must be after start date'); return }
    if (form.requiredPoints && Number(form.requiredPoints) < 0) { setFormError('Required points cannot be negative'); return }

    setSubmitting(true)
    setFormError('')
    try {
      await api.createDraftVoucher({
        VoucherCode: form.VoucherCode.trim(),
        VoucherType: 2,
        DiscountType: form.DiscountType,
        DiscountValue: Number(form.DiscountValue),
        MinOrderAmount: form.MinOrderAmount ? Number(form.MinOrderAmount) : undefined,
        MaxDiscountAmount: form.DiscountType === 1 && form.MaxDiscountAmount ? Number(form.MaxDiscountAmount) : undefined,
        Quantity: Number(form.Quantity),
        StartUtc: new Date(form.StartUtc).toISOString(),
        EndUtc: new Date(form.EndUtc).toISOString(),
        RequiredPoints: form.requiredPoints ? Number(form.requiredPoints) : 0,
      })

      showToast('Draft voucher created! Pending manager approval.', 'success')
      setForm({
        VoucherCode: '',
        DiscountType: 1,
        DiscountValue: '',
        MinOrderAmount: '',
        MaxDiscountAmount: '',
        Quantity: '',
        StartUtc: '',
        EndUtc: '',
        requiredPoints: ''
      })
      setModalOpen(false)
      loadVouchers()
    } catch (e: any) {
      setFormError(e?.message || 'Failed to create draft voucher.')
    }
    setSubmitting(false)
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US') : '—'
  const fmtDiscount = (v: VoucherItem) =>
    v.discountType === 1 ? `${v.discountValue}%` : `${v.discountValue.toLocaleString('en-US')} VND`

  return (
    <div className="portal-page branches-page">
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

      {/* Page Header */}
      <div className="ops-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Đề xuất mã khuyến mãi</h2>
          <p>Tạo bản thảo voucher và gửi yêu cầu phê duyệt đến quản lý chi nhánh.</p>
        </div>
        <button 
          type="button" 
          className="btn btn-primary btn-premium-glow"
          onClick={() => {
            setFormError('')
            setModalOpen(true)
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tạo đề xuất voucher
        </button>
      </div>

      {/* Glassmorphism Filters */}
      <div className="glass-filters">
        <div className="filter-input-wrap">
          <label className="form-label">Tìm voucher</label>
          <input
            className="form-input form-input-icon"
            placeholder="Tìm theo mã..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="filter-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
        </div>

        <div className="filter-input-wrap">
          <label className="form-label">Trạng thái duyệt</label>
          <select
            className="form-input form-select-custom"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Tất cả trạng thái</option>
            <option value={1}>Chờ duyệt</option>
            <option value={2}>Đã duyệt</option>
            <option value={3}>Từ chối</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-reset"
          onClick={handleResetFilters}
          title="Đặt lại bộ lọc"
          disabled={!search && statusFilter === ''}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Đặt lại
        </button>
      </div>

      {/* Grid View */}
      {listError && (
        <div className="empty-state-premium">
          <div className="empty-state-icon-premium">⚠️</div>
          <h3>Lỗi tải dữ liệu</h3>
          <p>{listError}</p>
          <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={loadVouchers}>Thử lại</button>
        </div>
      )}

      {listLoading ? (
        <div className="branches-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="skeleton-user-card skeleton-shimmer" style={{ height: '200px' }} />
          ))}
        </div>
      ) : vouchers.length === 0 && !listError ? (
        <div className="empty-state-premium animate-fade-in">
          <div className="empty-state-icon-premium">🎟️</div>
          <h3>Không tìm thấy voucher nào</h3>
          <p>Không có mã khuyến mãi nào phù hợp với bộ lọc hoặc chưa có mã nào được tạo.</p>
        </div>
      ) : (
        <div className="branches-grid">
          {vouchers.map((v, index) => (
            <div 
              key={v.voucherId} 
              className="branch-card-premium active-branch"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="branch-card-header">
                <div className="branch-title-area">
                  <h3>{v.voucherCode}</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`badge branch-code-badge ${v.approvalStatus === 1 ? 'badge-warning' : v.approvalStatus === 2 ? 'badge-success' : 'badge-danger'}`}>
                      {APPROVAL_LABELS[v.approvalStatus] ?? '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="branch-body" style={{ marginBottom: '0' }}>
                <div className="branch-detail-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <span>Giảm giá: <strong>{fmtDiscount(v)}</strong></span>
                </div>
                
                {v.minOrderAmount ? (
                  <div className="branch-detail-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>Đơn tối thiểu: {v.minOrderAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                ) : null}

                {v.requiredPoints > 0 && (
                  <div className="branch-detail-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>Điểm đổi: <strong>{v.requiredPoints} điểm</strong></span>
                  </div>
                )}

                <div className="branch-detail-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>Số lượng: {v.quantity} (Đã dùng: {v.usedCount})</span>
                </div>

                <div className="branch-detail-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>{fmtDate(v.startUtc)} → {fmtDate(v.endUtc)}</span>
                </div>
                
                {v.approvedByUserName && (
                  <div className="branch-detail-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span style={{ fontSize: '0.85rem' }}>{v.approvalStatus === 2 ? 'Người duyệt' : 'Xử lý bởi'}: {v.approvedByUserName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="confirm-modal-overlay" onClick={() => !submitting && setModalOpen(false)}>
          <div className="confirm-modal-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', textAlign: 'left', alignItems: 'stretch' }}>
            <div className="vehicle-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--color-heading)' }}>Tạo Đề Xuất Voucher</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Voucher sẽ được gửi ở trạng thái chờ duyệt tới Quản lý chi nhánh.
                </p>
              </div>
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setModalOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div className="badge badge-danger" style={{ display: 'block', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Mã voucher *</label>
                <input className="form-input" required placeholder="Ví dụ: SUMMER2026"
                  value={form.VoucherCode}
                  onChange={e => setForm(f => ({ ...f, VoucherCode: e.target.value.toUpperCase() }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Loại giảm giá *</label>
                <select className="form-input form-select-custom" value={form.DiscountType}
                  onChange={e => setForm(f => ({ ...f, DiscountType: Number(e.target.value) as 1 | 2, MaxDiscountAmount: '' }))}>
                  <option value={1}>Phần trăm (%)</option>
                  <option value={2}>Số tiền cố định (đ)</option>
                </select>
              </div>

              <div className="form-row-double">
                <div className="form-group">
                  <label className="form-label">Giá trị giảm * {form.DiscountType === 1 ? '(%)' : '(đ)'}</label>
                  <input type="number" className="form-input" min="0.01" step="any" required
                    max={form.DiscountType === 1 ? 100 : undefined}
                    placeholder={form.DiscountType === 1 ? '10' : '50000'}
                    value={form.DiscountValue}
                    onChange={e => setForm(f => ({ ...f, DiscountValue: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số lượng *</label>
                  <input type="number" className="form-input" min="1" required placeholder="100"
                    value={form.Quantity}
                    onChange={e => setForm(f => ({ ...f, Quantity: e.target.value }))} />
                </div>
              </div>

              <div className="form-row-double">
                <div className="form-group">
                  <label className="form-label">Đơn tối thiểu (đ)</label>
                  <input type="number" className="form-input" min="0" placeholder="Tùy chọn"
                    value={form.MinOrderAmount}
                    onChange={e => setForm(f => ({ ...f, MinOrderAmount: e.target.value }))} />
                </div>
                {form.DiscountType === 1 ? (
                  <div className="form-group">
                    <label className="form-label">Giảm tối đa (đ)</label>
                    <input type="number" className="form-input" min="0" placeholder="Tùy chọn"
                      value={form.MaxDiscountAmount}
                      onChange={e => setForm(f => ({ ...f, MaxDiscountAmount: e.target.value }))} />
                  </div>
                ) : <div />}
              </div>

              <div className="form-row-double">
                <div className="form-group">
                  <label className="form-label">Ngày bắt đầu *</label>
                  <input type="datetime-local" className="form-input" required
                    value={form.StartUtc}
                    onChange={e => setForm(f => ({ ...f, StartUtc: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày kết thúc *</label>
                  <input type="datetime-local" className="form-input" required
                    value={form.EndUtc}
                    onChange={e => setForm(f => ({ ...f, EndUtc: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Điểm Loyalty cần để đổi</label>
                <input type="number" className="form-input" min="0" placeholder="0 nếu miễn phí"
                  value={form.requiredPoints}
                  onChange={e => setForm(f => ({ ...f, requiredPoints: e.target.value }))} />
              </div>

              <div className="confirm-modal-actions" style={{ marginTop: '14px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang gửi…' : 'Gửi yêu cầu duyệt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
