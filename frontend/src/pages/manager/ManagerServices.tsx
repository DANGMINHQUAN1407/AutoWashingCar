import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import type { BranchService } from '../../types/branch'
import { extractErrorMessage } from '../../utils/errorUtils'
import '../Dashboard.css'

export default function ManagerServices() {
  // Chỉ hiển thị dịch vụ của chi nhánh mà Manager được gán vào (bảng BranchService)
  const [services, setServices] = useState<BranchService[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [noBranch, setNoBranch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    Name: '',
    Description: '',
    BasePrice: '',
    DurationMinutes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchServices = async () => {
    try {
      setLoading(true)
      setError('')
      // 1. Xác định chi nhánh Manager đang quản lý
      let bid = branchId
      if (!bid) {
        try {
          const branch = await api.getMyBranch()
          bid = branch.branchId
          setBranchId(bid)
        } catch {
          // getMyBranch trả 404 khi Manager chưa được gán vào chi nhánh nào
          setNoBranch(true)
          setServices([])
          return
        }
      }
      setNoBranch(false)
      // 2. Chỉ lấy dịch vụ thuộc chi nhánh đó
      const list = await api.getBranchServices(bid)
      setServices(list || [])
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to load services list'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenModal = (service?: BranchService) => {
    if (service) {
      setEditingId(service.serviceId)
      setFormData({
        Name: service.serviceName,
        Description: service.description || '',
        BasePrice: service.basePrice.toString(),
        DurationMinutes: service.durationMinutes.toString()
      })
    } else {
      setEditingId(null)
      setFormData({ Name: '', Description: '', BasePrice: '', DurationMinutes: '' })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        ServiceName: formData.Name,
        Description: formData.Description,
        BasePrice: Number(formData.BasePrice),
        DurationMinutes: Number(formData.DurationMinutes)
      }
      
      if (editingId) {
        await api.updateServiceCatalog(editingId, payload)
      } else {
        await api.createServiceCatalog(payload)
      }
      
      handleCloseModal()
      await fetchServices()
    } catch (err: any) {
      alert(extractErrorMessage(err, 'Failed to save service'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (service: BranchService) => {
    if (!branchId) return
    if (!window.confirm(`Are you sure you want to ${service.isActive ? 'deactivate' : 'activate'} "${service.serviceName}" at this branch?`)) return

    try {
      // Bật/tắt ở cấp chi nhánh (BranchService), không đụng dịch vụ toàn hệ thống
      await api.toggleBranchService(branchId, service.serviceId, !service.isActive)
      await fetchServices()
    } catch (err: any) {
      alert(extractErrorMessage(err, 'Failed to change service status'))
    }
  }

  return (
    <div className="portal-page">
      <div className="dash-header">
        <div>
          <h2>Danh mục dịch vụ</h2>
          <p>Quản lý các gói dịch vụ và bảng giá áp dụng tại chi nhánh của bạn.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => handleOpenModal()} disabled={noBranch}>
          + Thêm dịch vụ
        </button>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', color: 'red' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Đang tải danh mục dịch vụ...</div>
      ) : noBranch ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Tài khoản của bạn chưa được phân công chi nhánh. Vui lòng liên hệ Quản trị viên.
        </div>
      ) : services.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Chưa có dịch vụ nào cho chi nhánh này. Bấm "Thêm dịch vụ" để bắt đầu thiết lập.
        </div>
      ) : (
        <div className="service-catalog-grid">
          {services.map(s => (
            <div
              key={s.serviceId}
              className={`manager-service-card ${!s.isActive ? 'manager-service-card--inactive' : ''}`}
            >
              <div className="service-card-header">
                <div className="service-card-title-group">
                  <h3>{s.serviceName}</h3>
                  <div className="service-card-badge-row">
                    <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {s.isActive ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                    <span className={`service-tier-tag ${
                      s.basePrice < 150000 ? 'service-tier-tag--basic' :
                      s.basePrice < 300000 ? 'service-tier-tag--standard' : 'service-tier-tag--premium'
                    }`}>
                      {s.basePrice < 150000 ? 'Cơ bản' :
                       s.basePrice < 300000 ? 'Tiêu chuẩn' : 'Cao cấp'}
                    </span>
                  </div>
                </div>
                <div className="service-card-price-box">
                  <span className="service-card-price-value">{new Intl.NumberFormat('vi-VN').format(s.basePrice)}</span>
                  <span className="service-card-price-unit">đ</span>
                </div>
              </div>
              
              <div className="service-card-desc">
                {s.description || 'Không có mô tả chi tiết.'}
              </div>
              
              <div className="service-card-meta-grid">
                <div className="service-card-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>{s.durationMinutes} phút</span>
                </div>
              </div>
              
              <div className="service-card-action-bar">
                <button 
                  className="btn btn-sm btn-card-edit" 
                  onClick={() => handleOpenModal(s)}
                >
                  <svg style={{ marginRight: '4px' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                  Chỉnh sửa
                </button>
                <button 
                  className={`btn btn-sm ${s.isActive ? 'btn-card-status--deactivate' : 'btn-card-status--activate'}`}
                  onClick={() => handleToggleStatus(s)}
                >
                  {s.isActive ? (
                    <>
                      <svg style={{ marginRight: '4px' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                      Tạm dừng
                    </>
                  ) : (
                    <>
                      <svg style={{ marginRight: '4px' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Kích hoạt
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>{editingId ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#0f172a' }}>Tên gói dịch vụ <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={formData.Name} 
                  onChange={e => setFormData({...formData, Name: e.target.value})} 
                  placeholder="Ví dụ: Rửa xe cao cấp + Phủ bóng Nano..."
                  style={{ width: '100%' }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#0f172a' }}>Giá niêm yết (đ) <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required min="0"
                    value={formData.BasePrice} 
                    onChange={e => setFormData({...formData, BasePrice: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#0f172a' }}>Thời gian (phút) <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required min="1"
                    value={formData.DurationMinutes} 
                    onChange={e => setFormData({...formData, DurationMinutes: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#0f172a' }}>Mô tả quy trình dịch vụ</label>
                <textarea 
                  className="form-input" 
                  rows={4}
                  value={formData.Description} 
                  onChange={e => setFormData({...formData, Description: e.target.value})} 
                  placeholder="Mô tả các bước trong quy trình rửa xe..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={handleCloseModal} disabled={isSubmitting}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu dịch vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
