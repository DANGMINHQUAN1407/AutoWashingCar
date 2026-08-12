import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { type Vehicle, type VehicleType } from '../services/api'
import { extractErrorMessage } from '../utils/errorUtils'
import ConfirmModal from '../components/ConfirmModal'
import './MyVehicle.css'

const VEHICLE_TYPE_LABEL: Record<number, string> = {
  1: 'Motorbike',
  2: 'Car',
  3: 'Truck',
}

const VEHICLE_TYPE_ICON: Record<number, string> = {
  1: '🛵',
  2: '🚗',
  3: '🚛',
}

type FormMode = 'create' | 'edit' | null

export default function MyVehicle() {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [form, setForm] = useState({
    licensePlate: '',
    vehicleType: 2 as VehicleType,
    brand: '',
  })

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [user, loading, navigate])

  useEffect(() => {
    if (!loading && user) {
      api.getMyVehicles()
        .then(data => { setVehicles(data); setPageLoading(false) })
        .catch(() => { setVehicles([]); setPageLoading(false) })
    }
  }, [loading, user])

  const handleLogout = (e: React.MouseEvent) => {
     e.preventDefault()
     navigate('/', { replace: true })
     setTimeout(() => {
       logout()
     }, 0)
  }

  const openCreate = () => {
    setFormError(null)
    setSuccessMsg(null)
    setEditingId(null)
    setForm({ licensePlate: '', vehicleType: 2, brand: '' })
    setFormMode('create')
  }

  const openEdit = (v: Vehicle) => {
    const id = v.VehicleId || v.vehicleId
    if (!id) return
    setFormError(null)
    setSuccessMsg(null)
    setEditingId(id)
    setForm({
      licensePlate: v.LicensePlate || v.licensePlate || '',
      vehicleType: (v.VehicleType ?? v.vehicleType ?? 2) as VehicleType,
      brand: v.Brand || v.brand || '',
    })
    setFormMode('edit')
  }

  const closeForm = () => {
    setFormMode(null)
    setEditingId(null)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)

    try {
      const payload = {
        LicensePlate: form.licensePlate.trim().toUpperCase(),
        VehicleType: form.vehicleType,
        Brand: form.brand.trim() || undefined,
      }

      if (formMode === 'edit' && editingId) {
        const updated = await api.updateVehicle(editingId, payload)
        setVehicles(prev => prev.map(v => (v.VehicleId || v.vehicleId) === editingId ? updated : v))
        setSuccessMsg('Vehicle updated successfully.')
      } else {
        const created = await api.createVehicle(payload)
        setVehicles(prev => [created, ...prev])
        setSuccessMsg('Vehicle added successfully.')
      }

      closeForm()
    } catch (err: any) {
      setFormError(extractErrorMessage(err, 'Đã xảy ra lỗi. Vui lòng thử lại.'))
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    const id = vehicleToDelete?.VehicleId || vehicleToDelete?.vehicleId
    if (!id) return
    setDeleteLoading(true)
    try {
      await api.deleteVehicle(id)
      setVehicles(prev => prev.filter(v => (v.VehicleId || v.vehicleId) !== id))
      setSuccessMsg('Vehicle removed successfully.')
      setVehicleToDelete(null)
    } catch (err: any) {
      setFormError(extractErrorMessage(err, 'Không thể gỡ phương tiện.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const typeLabel = (t?: number) => VEHICLE_TYPE_LABEL[t ?? 2] ?? 'Car'
  const typeIcon = (t?: number) => VEHICLE_TYPE_ICON[t ?? 2] ?? '🚗'

  return (
    <div className="mv-page">
      <div className="container mv-container">

        {/* ── Sidebar ── */}
        <aside className="dash-sidebar">
          <div className="dash-user">
            <div className="dash-avatar">
              {(user?.FullName || user?.fullName || user?.name)
                ? (user?.FullName || user?.fullName || user?.name)?.substring(0, 2).toUpperCase()
                : 'U'}
            </div>
            <div className="dash-user-info">
              <h3>{user?.FullName || user?.fullName || user?.name || 'User'}</h3>
              <p>Premium Member</p>
            </div>
          </div>

          <nav className="dash-nav">
            <Link to="/dashboard#overview" className="dash-nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Dashboard
            </Link>
            <Link to="/dashboard/vehicles" className="dash-nav-link active">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 13h18"/><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/>
                <circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
              </svg>
              My Vehicle
            </Link>
            <a href="#" className="dash-nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              My Bookings
            </a>
            <a href="#" className="dash-nav-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Settings
            </a>
          </nav>

          <div className="dash-sidebar-bottom">
            <a href="#" onClick={handleLogout} className="dash-logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </a>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="dash-main">

          {/* Page Header */}
          <div className="mv-header">
            <div>
              <h2>My Vehicles</h2>
              <p>{vehicles.length > 0 ? `${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''} registered` : 'No vehicles registered yet.'}</p>
            </div>
            <button className="btn btn-primary" onClick={openCreate}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Vehicle
            </button>
          </div>

          {/* Alerts */}
          {successMsg && (
            <div className="mv-alert mv-alert-success" onClick={() => setSuccessMsg(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              {successMsg}
            </div>
          )}
          {formError && !formMode && (
            <div className="mv-alert mv-alert-error" onClick={() => setFormError(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {formError}
            </div>
          )}

          {/* Vehicle List */}
          {pageLoading ? (
            <div className="mv-loading">
              <div className="mv-spinner" />
              <p>Loading vehicles...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="mv-empty">
              <div className="mv-empty-icon">🚗</div>
              <h3>No vehicles yet</h3>
              <p>Add your first vehicle to get started with AutoWashPro.</p>
              <button className="btn btn-primary" onClick={openCreate}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Vehicle
              </button>
            </div>
          ) : (
            <div className="mv-list">
              {vehicles.map((v, i) => {
                const plate = v.LicensePlate || v.licensePlate || 'Unknown'
                const brand = v.Brand || v.brand || '—'
                const vType = v.VehicleType ?? v.vehicleType ?? 2
                const vid = v.VehicleId || v.vehicleId

                return (
                  <div key={vid || `${plate}-${i}`} className="mv-card">
                    <div className="mv-card-icon">{typeIcon(vType)}</div>
                    <div className="mv-card-info">
                      <div className="mv-card-plate">{plate}</div>
                      <div className="mv-card-meta">
                        <span className="badge badge-primary">{typeLabel(vType)}</span>
                        <span className="mv-card-brand">{brand}</span>
                      </div>
                    </div>
                    <div className="mv-card-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(v)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button
                        className="btn btn-sm mv-btn-remove"
                        onClick={() => setVehicleToDelete(v)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Add / Edit Modal ── */}
      {formMode && (
        <div className="mv-modal-overlay" onClick={() => !formLoading && closeForm()}>
          <div className="mv-modal-card" onClick={e => e.stopPropagation()}>
            <div className="mv-modal-header">
              <h3>{formMode === 'edit' ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
              <button className="mv-modal-close" onClick={closeForm} disabled={formLoading}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mv-modal-form">
              {formError && (
                <div className="mv-alert mv-alert-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {formError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="mv-plate">License Plate *</label>
                <input
                  id="mv-plate"
                  className="form-input"
                  value={form.licensePlate}
                  onChange={e => setForm(p => ({ ...p, licensePlate: e.target.value }))}
                  placeholder="e.g. 30F-123.45"
                  required
                  minLength={4}
                  maxLength={20}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mv-type">Vehicle Type *</label>
                <select
                  id="mv-type"
                  className="form-input mv-select"
                  value={form.vehicleType}
                  onChange={e => setForm(p => ({ ...p, vehicleType: Number(e.target.value) as VehicleType }))}
                >
                  <option value={1}>🛵 Motorbike</option>
                  <option value={2}>🚗 Car</option>
                  <option value={3}>🚛 Truck</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mv-brand">Brand</label>
                <input
                  id="mv-brand"
                  className="form-input"
                  value={form.brand}
                  onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}
                  placeholder="e.g. Toyota, Honda, BMW"
                  maxLength={50}
                />
              </div>

              <div className="mv-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeForm} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading
                    ? (formMode === 'edit' ? 'Updating...' : 'Adding...')
                    : (formMode === 'edit' ? 'Update Vehicle' : 'Add Vehicle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!vehicleToDelete}
        title="Remove Vehicle"
        variant="danger"
        isLoading={deleteLoading}
        onCancel={() => setVehicleToDelete(null)}
        onConfirm={handleDelete}
        confirmText="Remove"
        message={
          <>
            <p>
              Are you sure you want to remove{' '}
              <strong className="highlight-plate">
                {vehicleToDelete?.LicensePlate || vehicleToDelete?.licensePlate}
              </strong>?
            </p>
            <div className="confirm-modal-warning" style={{ marginTop: '12px' }}>
              This action is permanent and cannot be undone.
            </div>
          </>
        }
      />
    </div>
  )
}
