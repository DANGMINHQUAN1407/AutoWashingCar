import { useEffect, useState } from 'react'
import api, { type VehicleCatalogItem } from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import AnimatedButton from '../../components/AnimatedButton'
import Pagination from '../../components/Pagination'
import './AdminVehicleCatalogs.css'
import '../Dashboard.css'

type ActiveTab = 'engine' | 'bodyStyle'
type ModalMode = 'create' | 'edit' | null

export default function AdminVehicleCatalogs() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('engine')
  const [items, setItems] = useState<VehicleCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Search & Pagination
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // Modals & Forms
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedItem, setSelectedItem] = useState<VehicleCatalogItem | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: '',
    name: '',
    isActive: true,
  })

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error'; message: string }>>([])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Load Catalogs
  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    try {
      let res
      if (activeTab === 'engine') {
        res = await api.getEngineTypes({ page, pageSize, search: search.trim() || undefined })
      } else {
        res = await api.getBodyStyles({ page, pageSize, search: search.trim() || undefined })
      }
      setItems(res.items)
      setTotalCount(res.totalCount)
    } catch (err: any) {
      console.error(err)
      setError(extractErrorMessage(err, 'Không thể tải danh sách catalog.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [activeTab, page, search])

  // Reset page when switching tabs or searching
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab)
    setPage(1)
    setSearch('')
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  // Handle Toggle Status
  const handleToggleStatus = async (item: VehicleCatalogItem) => {
    try {
      if (item.isActive) {
        if (activeTab === 'engine') {
          await api.deactivateEngineType(item.id)
        } else {
          await api.deactivateBodyStyle(item.id)
        }
        showToast('Vô hiệu hóa thành công')
      } else {
        if (activeTab === 'engine') {
          await api.activateEngineType(item.id)
        } else {
          await api.activateBodyStyle(item.id)
        }
        showToast('Kích hoạt thành công')
      }
      fetchItems()
    } catch (err: any) {
      showToast(extractErrorMessage(err, 'Không thể thay đổi trạng thái hoạt động.'), 'error')
    }
  }

  // Handle Form Modal Open
  const handleOpenCreateModal = () => {
    setForm({
      code: '',
      name: '',
      isActive: true,
    })
    setFormError(null)
    setModalMode('create')
  }

  const handleOpenEditModal = (item: VehicleCatalogItem) => {
    setSelectedItem(item)
    setForm({
      code: item.code,
      name: item.name,
      isActive: item.isActive,
    })
    setFormError(null)
    setModalMode('edit')
  }

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Tên catalog không được để trống.')
      return
    }
    if (modalMode === 'create' && !form.code.trim()) {
      setFormError('Mã catalog không được để trống.')
      return
    }

    setFormLoading(true)
    setFormError(null)
    try {
      if (modalMode === 'create') {
        const payload = {
          Code: form.code.trim().toUpperCase(),
          Name: form.name.trim(),
        }
        if (activeTab === 'engine') {
          await api.createEngineType(payload)
        } else {
          await api.createBodyStyle(payload)
        }
        showToast('Thêm danh mục mới thành công!')
      } else if (modalMode === 'edit' && selectedItem) {
        const payload = {
          Name: form.name.trim(),
          IsActive: form.isActive,
        }
        if (activeTab === 'engine') {
          await api.updateEngineType(selectedItem.id, payload)
        } else {
          await api.updateBodyStyle(selectedItem.id, payload)
        }
        showToast('Cập nhật danh mục thành công!')
      }
      setModalMode(null)
      fetchItems()
    } catch (err: any) {
      setFormError(extractErrorMessage(err, 'Lỗi khi lưu thông tin danh mục.'))
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="portal-page catalogs-page-container">
      {/* Toast Notification Container */}
      <div className="toast-container" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-card toast-${toast.type}`} style={{ padding: '12px 24px', borderRadius: 'var(--radius-sm)', background: toast.type === 'success' ? '#10B981' : '#EF4444', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '240px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'slide-in 0.3s ease-out' }}>
            <span>{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', marginLeft: '12px' }}>&times;</button>
          </div>
        ))}
      </div>

      <div className="dash-header">
        <div>
          <h2>Quản lý Danh mục Xe</h2>
          <p>Thiết lập và quản lý các loại động cơ và kiểu dáng xe có trong hệ thống.</p>
        </div>
        <AnimatedButton variant="primary" onClick={handleOpenCreateModal}>
          + Thêm danh mục
        </AnimatedButton>
      </div>

      {/* Tab Switcher */}
      <div className="catalogs-tabs-wrapper" style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '12px', marginBottom: '24px' }}>
        <button
          className={`btn ${activeTab === 'engine' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => handleTabChange('engine')}
        >
          ⚙️ Loại Động Cơ
        </button>
        <button
          className={`btn ${activeTab === 'bodyStyle' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => handleTabChange('bodyStyle')}
        >
          🚙 Kiểu Dáng Xe
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="catalogs-filters card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', padding: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '32px' }}
            placeholder={`Tìm kiếm theo tên hoặc mã ${activeTab === 'engine' ? 'động cơ' : 'kiểu dáng'}...`}
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }}>🔍</span>
        </div>
      </div>

      {/* List Table */}
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu danh mục...</p>
        </div>
      ) : (
        <div className="card catalogs-list-card" style={{ padding: 0, overflow: 'hidden' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
              Không tìm thấy danh mục nào phù hợp.
            </div>
          ) : (
            <>
              <table className="catalogs-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border-dim)' }}>
                    <th style={{ padding: '16px' }}>Mã Danh Mục</th>
                    <th style={{ padding: '16px' }}>Tên Hiển Thị</th>
                    <th style={{ padding: '16px' }}>Hệ Thống (Legacy)</th>
                    <th style={{ padding: '16px' }}>Trạng Thái</th>
                    <th style={{ padding: '16px', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-dim)', transition: 'background 0.2s' }} className="catalog-row">
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>
                        <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-primary)' }}>
                          {item.code}
                        </code>
                      </td>
                      <td style={{ padding: '16px' }}>{item.name}</td>
                      <td style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {item.legacyEnumValue !== null && item.legacyEnumValue !== undefined ? (
                          <span>ID cũ: {item.legacyEnumValue}</span>
                        ) : (
                          <span style={{ fontStyle: 'italic' }}>Tự thêm mới</span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: item.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: item.isActive ? '#10B981' : '#EF4444' }}>
                          {item.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEditModal(item)}
                          >
                            Edit
                          </button>
                          <button
                            className={`btn btn-sm ${item.isActive ? 'btn-danger-ghost' : 'btn-success-ghost'}`}
                            onClick={() => handleToggleStatus(item)}
                            style={{ fontSize: '0.8rem' }}
                          >
                            {item.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '16px' }}>
                <Pagination
                  currentPage={page}
                  totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
                  totalCount={totalCount}
                  itemName="danh mục"
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {modalMode && (
        <div className="confirm-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="confirm-modal-card" style={{ maxWidth: '480px', width: '90%', textAlign: 'left', borderRadius: 'var(--radius-md)', padding: '24px', gap: '16px', background: '#121214', border: '1px solid var(--color-border-dim)' }}>
            <h3 style={{ margin: 0, textTransform: 'uppercase', color: 'var(--color-heading)', fontSize: '1.2rem', fontWeight: 'bold', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '12px' }}>
              {modalMode === 'create' ? 'Thêm Danh Mục Mới' : 'Cập Nhật Danh Mục'}
            </h3>
            
            {formError && <div className="alert alert-danger" style={{ fontSize: '0.9rem', padding: '10px' }}>{formError}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="catalog-code">Mã Danh Mục (Không được sửa)</label>
                <input
                  id="catalog-code"
                  type="text"
                  className="form-input"
                  placeholder="VD: PETROL, SUV, ELECTRIC..."
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  disabled={modalMode === 'edit'}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                  Nên đặt viết hoa, không dấu, không khoảng cách.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="catalog-name">Tên Hiển Thị</label>
                <input
                  id="catalog-name"
                  type="text"
                  className="form-input"
                  placeholder="VD: Xăng (Petrol), Xe SUV..."
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              {modalMode === 'edit' && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="catalog-active"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="catalog-active" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                    Cho phép hiển thị để chọn (Kích hoạt)
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--color-border-dim)', paddingTop: '16px' }}>
                <AnimatedButton type="button" variant="ghost" onClick={() => setModalMode(null)}>
                  Hủy
                </AnimatedButton>
                <AnimatedButton type="submit" variant="primary" disabled={formLoading}>
                  {formLoading ? 'Đang lưu...' : 'Lưu Lại'}
                </AnimatedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
