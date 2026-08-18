import { useState, useEffect, useCallback } from 'react'
import * as api from '../../services/api'
import type { VoucherItem } from '../../services/api'
import type { Tier } from '../../types/tier'
import ConfirmModal from '../../components/ConfirmModal'
import { extractErrorMessage } from '../../utils/errorUtils'
import './AdminBranches.css' // Reuse premium styles from branches
import './AdminUsers.css' // For modal and filters
import '../Dashboard.css'

const APPROVAL_LABELS: Record<number, string> = { 1: 'Chờ duyệt', 2: 'Đã duyệt', 3: 'Từ chối' }

export default function AdminVouchers() {
  const [form, setForm] = useState({
    VoucherCode: '',
    VoucherType: 1 as 1 | 3,
    DiscountType: 1 as 1 | 2,
    DiscountValue: '',
    MinOrderAmount: '',
    MaxDiscountAmount: '',
    Quantity: '',
    StartUtc: '',
    EndUtc: '',
    tierId: '',
    requiredPoints: '',
  })
  
  const [tiers, setTiers] = useState<Tier[]>([])
  
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [vouchers, setVouchers] = useState<VoucherItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  
  // Custom confirm modal state
  const [voucherToToggle, setVoucherToToggle] = useState<VoucherItem | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [voucherToDelete, setVoucherToDelete] = useState<VoucherItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Filters and Pagination
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // '' = all, 'active', 'inactive'
  
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

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
      const [tiersRes, res] = await Promise.all([
        api.getTiers({ page: 1, pageSize: 100 }),
        api.getVouchers({
          page,
          pageSize,
          isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        })
      ])
      
      setTiers(tiersRes.items)
      
      let items = res.items
      if (search.trim()) {
        const q = search.toLowerCase()
        items = items.filter(v => v.voucherCode.toLowerCase().includes(q))
      }

      setVouchers(items)
      // Since we did client side filter we might miscalculate total if backend does pagination, 
      // but assuming the backend handles basic pagination and we refine here. 
      // Ideally backend supports search.
      setTotalCount(res.totalCount)
      setTotalPages(Math.max(1, Math.ceil(res.totalCount / pageSize)))
    } catch (e: any) {
      setListError(e?.message || 'Không tải được danh sách voucher.')
    }
    setListLoading(false)
  }, [page, pageSize, search, statusFilter])

  useEffect(() => { 
    const delayDebounce = setTimeout(() => {
      loadVouchers() 
    }, 350)
    return () => clearTimeout(delayDebounce)
  }, [loadVouchers])

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPage(1)
    showToast('Đã xóa bộ lọc', 'success')
  }

  const handleToggleActive = async (v: VoucherItem) => {
    if (v.isActive) {
      setVoucherToToggle(v)
      return
    }
    try {
      await api.setActiveVoucher(v.voucherId, true)
      showToast(`Đã kích hoạt voucher ${v.voucherCode}`, 'success')
      loadVouchers()
    } catch (e: any) {
      showToast(e?.message || 'Lỗi khi thay đổi trạng thái', 'error')
    }
  }

  const handleConfirmToggleActive = async () => {
    if (!voucherToToggle) return
    setToggleLoading(true)
    try {
      await api.setActiveVoucher(voucherToToggle.voucherId, false)
      showToast(`Đã tạm dừng voucher ${voucherToToggle.voucherCode}`, 'success')
      setVoucherToToggle(null)
      loadVouchers()
    } catch (e: any) {
      showToast(e?.message || 'Lỗi khi thay đổi trạng thái', 'error')
    } finally {
      setToggleLoading(false)
    }
  }

  const handleDeleteVoucherClick = (v: VoucherItem) => {
    setVoucherToDelete(v)
  }

  const handleConfirmDelete = async () => {
    if (!voucherToDelete) return
    setDeleteLoading(true)
    try {
      await api.deleteVoucher(voucherToDelete.voucherId)
      showToast(`Đã xóa voucher ${voucherToDelete.voucherCode} thành công`, 'success')
      setVouchers(prev => prev.filter(item => item.voucherId !== voucherToDelete.voucherId))
      setVoucherToDelete(null)
    } catch (err: any) {
      showToast(extractErrorMessage(err, 'Không thể xóa voucher này vì đã có khách hàng sử dụng. Bạn có thể tạm dừng hoạt động của nó.'), 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.VoucherCode.trim()) { setFormError('Vui lòng nhập mã voucher'); return }
    if (!form.DiscountValue || Number(form.DiscountValue) <= 0) { setFormError('Giá trị giảm phải lớn hơn 0'); return }
    if (form.DiscountType === 1 && Number(form.DiscountValue) > 100) { setFormError('Phần trăm giảm không thể vượt quá 100%'); return }
    if (!form.Quantity || Number(form.Quantity) < 1) { setFormError('Số lượng phải ít nhất là 1'); return }
    if (!form.StartUtc || !form.EndUtc) { setFormError('Vui lòng chọn ngày bắt đầu và kết thúc'); return }
    if (new Date(form.EndUtc) <= new Date(form.StartUtc)) { setFormError('Ngày kết thúc phải sau ngày bắt đầu'); return }
    if (form.VoucherType === 3) {
      if (!form.tierId) { setFormError('Vui lòng chọn hạng thành viên áp dụng'); return }
      if (!form.requiredPoints || Number(form.requiredPoints) <= 0) { setFormError('Điểm yêu cầu quy đổi phải lớn hơn 0'); return }
    }

    setSubmitting(true)
    setFormError('')
    try {
      const createdVoucher = await api.createAdminVoucher({
        VoucherCode: form.VoucherCode.trim(),
        VoucherType: form.VoucherType,
        DiscountType: form.DiscountType,
        DiscountValue: Number(form.DiscountValue),
        MinOrderAmount: form.MinOrderAmount ? Number(form.MinOrderAmount) : undefined,
        MaxDiscountAmount: form.DiscountType === 1 && form.MaxDiscountAmount ? Number(form.MaxDiscountAmount) : undefined,
        Quantity: Number(form.Quantity),
        StartUtc: new Date(form.StartUtc).toISOString(),
        EndUtc: new Date(form.EndUtc).toISOString(),
      })
      
      if (form.VoucherType === 3 && form.tierId && Number(form.requiredPoints) > 0) {
        await api.assignTierVoucher({
          TierId: form.tierId,
          VoucherId: createdVoucher.voucherId,
          RequiredPoints: Number(form.requiredPoints)
        })
      }
      
      showToast(form.VoucherType === 1 ? 'Tạo voucher System thành công!' : 'Tạo voucher Tier thành công!', 'success')
      setForm({ VoucherCode: '', VoucherType: 1, DiscountType: 1, DiscountValue: '', MinOrderAmount: '', MaxDiscountAmount: '', Quantity: '', StartUtc: '', EndUtc: '', tierId: '', requiredPoints: '' })
      setModalOpen(false)
      loadVouchers()
    } catch (e: any) {
      setFormError(e?.message || 'Tạo voucher thất bại.')
    }
    setSubmitting(false)
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
  const fmtDiscount = (v: VoucherItem) =>
    v.discountType === 1 ? `${v.discountValue}%` : `${v.discountValue.toLocaleString('vi-VN')}đ`

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
      <div className="dash-header">
        <div>
          <h2>System Vouchers</h2>
          <p>Tạo và quản lý voucher áp dụng cho toàn bộ hệ thống (không phụ thuộc chi nhánh).</p>
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
          Add Voucher
        </button>
      </div>

      {/* Glassmorphism Filters */}
      <div className="glass-filters">
        <div className="filter-input-wrap">
          <label className="form-label">Search Voucher</label>
          <input
            className="form-input form-input-icon"
            placeholder="Search by code..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <span className="filter-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
        </div>

        <div className="filter-input-wrap">
          <label className="form-label">Status</label>
          <select
            className="form-input form-select-custom"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-reset"
          onClick={handleResetFilters}
          title="Reset filters"
          disabled={!search && !statusFilter}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Clear
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
          <h3>Không tìm thấy voucher</h3>
          <p>Không có voucher nào khớp với bộ lọc hoặc hệ thống chưa có voucher.</p>
        </div>
      ) : (
        <div className="branches-grid">
          {vouchers.map((v, index) => (
            <div 
              key={v.voucherId} 
              className={`branch-card-premium ${v.isActive ? 'active-branch' : 'inactive-branch'}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="branch-card-header">
                <div className="branch-title-area">
                  <h3>{v.voucherCode}</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {!v.branchId && <span className="badge badge-primary branch-code-badge" style={{background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)'}}>Toàn HT</span>}
                    <span className={`badge branch-code-badge ${v.approvalStatus === 1 ? 'badge-warning' : v.approvalStatus === 2 ? 'badge-success' : 'badge-danger'}`}>
                      {APPROVAL_LABELS[v.approvalStatus] ?? '—'}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {v.approvalStatus === 2 && (
                    <label className="switch-premium" title={v.isActive ? 'Tạm dừng' : 'Kích hoạt'}>
                      <input
                        type="checkbox"
                        checked={v.isActive}
                        onChange={() => handleToggleActive(v)}
                      />
                      <span className="slider-premium" />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteVoucherClick(v)}
                    title="Xóa voucher"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff4d4f',
                      cursor: 'pointer',
                      fontSize: '1.05rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      opacity: 0.7,
                      transition: 'opacity 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scale(1.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="branch-body" style={{ marginBottom: '0' }}>
                <div className="branch-detail-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <span>Giảm <strong>{fmtDiscount(v)}</strong></span>
                </div>
                
                {v.minOrderAmount ? (
                  <div className="branch-detail-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>Đơn tối thiểu: {v.minOrderAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                ) : null}

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
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Create Modal */}
      {modalOpen && (
        <div className="confirm-modal-overlay" onClick={() => !submitting && setModalOpen(false)}>
          <div className="confirm-modal-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', textAlign: 'left', alignItems: 'stretch' }}>
            <div className="vehicle-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--color-heading)' }}>Tạo Voucher Admin</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Tạo voucher <strong>System</strong> (toàn hệ thống) hoặc <strong>Tier</strong> (đổi bằng điểm Loyalty theo hạng thành viên).
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
                <input className="form-input" required placeholder="VD: ALLBRANCH2026"
                  value={form.VoucherCode}
                  onChange={e => setForm(f => ({ ...f, VoucherCode: e.target.value.toUpperCase() }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Loại voucher *</label>
                <select className="form-input form-select-custom" value={form.VoucherType}
                  onChange={e => setForm(f => ({ ...f, VoucherType: Number(e.target.value) as 1 | 3, tierId: '', requiredPoints: '' }))}>
                  <option value={1}>🌐 System — Áp dụng toàn hệ thống</option>
                  <option value={3}>⭐ Tier — Đổi bằng điểm Loyalty (theo hạng)</option>
                </select>
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
              
              {form.VoucherType === 3 && (
                <div className="form-row-double animate-slide-in" style={{ marginTop: '4px', padding: '14px', background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-dim)' }}>
                  <div className="form-group">
                    <label className="form-label">Hạng thành viên áp dụng *</label>
                    <select className="form-input form-select-custom" required value={form.tierId} onChange={e => setForm(f => ({ ...f, tierId: e.target.value }))}>
                      <option value="">-- Chọn hạng --</option>
                      {tiers.map(t => (
                        <option key={t.tierId} value={t.tierId}>{t.tierName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Điểm yêu cầu đổi *</label>
                    <input type="number" className="form-input" min="1" required placeholder="Ví dụ: 100" value={form.requiredPoints} onChange={e => setForm(f => ({ ...f, requiredPoints: e.target.value }))} />
                  </div>
                </div>
              )}

              <div className="confirm-modal-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang tạo…' : 'Tạo Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={!!voucherToToggle}
        title="Tạm dừng Voucher"
        variant="warning"
        isLoading={toggleLoading}
        onCancel={() => setVoucherToToggle(null)}
        onConfirm={handleConfirmToggleActive}
        confirmText="Xác nhận"
        cancelText="Hủy bỏ"
        message={
          <>
            Bạn có chắc chắn muốn tạm dừng voucher <strong style={{ color: 'var(--color-heading)' }}>{voucherToToggle?.voucherCode}</strong>?
          </>
        }
      />
      <ConfirmModal
        isOpen={!!voucherToDelete}
        title="Xóa Voucher"
        variant="danger"
        isLoading={deleteLoading}
        onCancel={() => setVoucherToDelete(null)}
        onConfirm={handleConfirmDelete}
        confirmText="Xóa"
        cancelText="Hủy bỏ"
        message={
          <>
            <p>
              Bạn có chắc chắn muốn xóa voucher{' '}
              <strong style={{ color: 'var(--color-heading)' }}>
                {voucherToDelete?.voucherCode}
              </strong> không?
            </p>
            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#ff4d4f' }}>
              ⚠️ Lưu ý: Hành động này không thể hoàn tác và chỉ thực hiện được nếu chưa có lịch sử đặt lịch nào sử dụng voucher này.
            </div>
          </>
        }
      />
    </div>
  )
}
