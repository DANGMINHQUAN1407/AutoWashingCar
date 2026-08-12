import { useEffect, useState } from 'react'
import api, { type Vehicle, type VehicleType } from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import AnimatedButton from '../../components/AnimatedButton'
import ConfirmModal from '../../components/ConfirmModal'
import Pagination from '../../components/Pagination'
import '../Dashboard.css'

export default function CustomerVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [vehicleError, setVehicleError] = useState<string | null>(null)
  const [vehicleSuccess, setVehicleSuccess] = useState<string | null>(null)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: '',
    vehicleType: 2 as VehicleType,
    brand: '',
  })

  // Search, filter, and pagination states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'car' | 'motorbike'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter])

  useEffect(() => {
    api.getMyVehicles()
      .then(setVehicles)
      .catch(() => setVehicles([]))
  }, [])

  // Client-side filtering & pagination calculations
  const filteredVehicles = vehicles.filter(v => {
    const brand = (v.Brand || v.brand || '').toLowerCase()
    const matchesSearch = brand.includes(searchQuery.toLowerCase())
    
    const type = v.VehicleType ?? v.vehicleType ?? 2
    const matchesType = typeFilter === 'all' || 
      (typeFilter === 'car' && type === 2) || 
      (typeFilter === 'motorbike' && type === 1)
      
    return matchesSearch && matchesType
  })

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize))
  const paginatedVehicles = filteredVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const vehicleTypeLabel = (vehicleType?: VehicleType | number) => {
    if (vehicleType === 1) return 'Motorbike'
    if (vehicleType === 3) return 'Truck'
    return 'Car'
  }

  const getVehicleTypeClass = (type: number) => {
    if (type === 1) return 'badge-motorbike'
    if (type === 3) return 'badge-truck'
    return 'badge-car'
  }

  const openCreateVehicleForm = () => {
    setEditingVehicleId(null)
    setVehicleForm({ licensePlate: '', vehicleType: 2, brand: '' })
    setShowVehicleForm(true)
  }

  const handleVehicleEditStart = (vehicle: Vehicle) => {
    const vehicleId = vehicle.VehicleId || vehicle.vehicleId
    if (!vehicleId) {
      setVehicleError('Cannot edit this vehicle because it has no id.')
      return
    }

    setVehicleError(null)
    setVehicleSuccess(null)
    setEditingVehicleId(vehicleId)
    setVehicleForm({
      licensePlate: vehicle.LicensePlate || vehicle.licensePlate || '',
      vehicleType: (vehicle.VehicleType ?? vehicle.vehicleType ?? 2) as VehicleType,
      brand: vehicle.Brand || vehicle.brand || '',
    })
    setShowVehicleForm(true)
  }

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVehicleLoading(true)
    setVehicleError(null)
    setVehicleSuccess(null)

    try {
      const payload = {
        LicensePlate: vehicleForm.licensePlate.trim().toUpperCase(),
        VehicleType: vehicleForm.vehicleType,
        Brand: vehicleForm.brand.trim() || undefined,
      }

      const savedVehicle = editingVehicleId
        ? await api.updateVehicle(editingVehicleId, payload)
        : await api.createVehicle(payload)

      setVehicles(prev => {
        if (editingVehicleId) {
          return prev.map(vehicle => (vehicle.VehicleId || vehicle.vehicleId) === editingVehicleId ? savedVehicle : vehicle)
        }
        return [savedVehicle, ...prev]
      })
      setVehicleForm({ licensePlate: '', vehicleType: 2, brand: '' })
      setShowVehicleForm(false)
      setEditingVehicleId(null)
      setVehicleSuccess(editingVehicleId ? 'Vehicle updated successfully.' : 'Vehicle created successfully.')
    } catch (error: any) {
      setVehicleError(extractErrorMessage(error, editingVehicleId ? 'Failed to update vehicle details.' : 'Failed to register new vehicle.'))
    } finally {
      setVehicleLoading(false)
    }
  }

  const handleVehicleDeleteConfirm = async () => {
    if (!vehicleToDelete) return
    const vehicleId = vehicleToDelete.VehicleId || vehicleToDelete.vehicleId
    if (!vehicleId) {
      setVehicleError('Cannot remove this vehicle because it has no id.')
      setVehicleToDelete(null)
      return
    }

    setVehicleLoading(true)
    setVehicleError(null)
    setVehicleSuccess(null)

    try {
      await api.deleteVehicle(vehicleId)
      setVehicles(prev => prev.filter(vehicle => (vehicle.VehicleId || vehicle.vehicleId) !== vehicleId))
      setVehicleSuccess('Vehicle removed successfully.')
    } catch (error: any) {
      setVehicleError(extractErrorMessage(error, 'Failed to remove this vehicle.'))
    } finally {
      setVehicleLoading(false)
      setVehicleToDelete(null)
    }
  }

  return (
    <div className="portal-page">
      <div className="dash-header">
        <div>
          <h2>My Vehicles</h2>
        </div>
        <AnimatedButton
          type="button"
          variant="primary"
          onClick={openCreateVehicleForm}
        >
          Add Vehicle
        </AnimatedButton>
      </div>

      {(vehicleSuccess || vehicleError) && (
        <div className={`badge ${vehicleSuccess ? 'badge-success' : 'badge-danger'}`} style={{ display: 'block', padding: '10px 14px' }}>
          {vehicleSuccess || vehicleError}
        </div>
      )}

      {/* Search & Filter Row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--color-border-dim)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
        <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="form-label" style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Tìm theo hãng xe</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="VD: Toyota, Honda..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="form-label" style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Loại xe</label>
          <select 
            className="form-input form-select-custom" 
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
          >
            <option value="all">Tất cả loại xe</option>
            <option value="car">Ô tô (Car)</option>
            <option value="motorbike">Xe máy (Motorbike)</option>
          </select>
        </div>
        {(searchQuery || typeFilter !== 'all') && (
          <AnimatedButton
            type="button"
            variant="ghost"
            size="sm"
            style={{ alignSelf: 'flex-end', height: '42px' }}
            onClick={() => {
              setSearchQuery('')
              setTypeFilter('all')
            }}
          >
            Xóa bộ lọc
          </AnimatedButton>
        )}
      </div>

      {showVehicleForm && (
        <form className="vehicle-form card" onSubmit={handleVehicleSubmit}>
          <div className="vehicle-form-header">
            <h4>{editingVehicleId ? 'Edit Vehicle' : 'Create Vehicle'}</h4>
            <p>{editingVehicleId ? 'Update the selected vehicle details.' : 'Add a new vehicle to your account.'}</p>
          </div>
          <div className="vehicle-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-license">License Plate</label>
              <input
                id="vehicle-license"
                className="form-input"
                value={vehicleForm.licensePlate}
                onChange={e => setVehicleForm(prev => ({ ...prev, licensePlate: e.target.value }))}
                placeholder="30F-123.45"
                required
                minLength={6}
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-type">Vehicle Type</label>
              <select
                id="vehicle-type"
                className="form-input"
                value={vehicleForm.vehicleType}
                onChange={e => setVehicleForm(prev => ({ ...prev, vehicleType: Number(e.target.value) as VehicleType }))}
              >
                <option value={1}>Motorbike</option>
                <option value={2}>Car</option>
              </select>
            </div>
            <div className="form-group vehicle-brand-field">
              <label className="form-label" htmlFor="vehicle-brand">Brand</label>
              <input
                id="vehicle-brand"
                className="form-input"
                value={vehicleForm.brand}
                onChange={e => setVehicleForm(prev => ({ ...prev, brand: e.target.value }))}
                placeholder="Toyota, Honda, BMW..."
                maxLength={50}
              />
            </div>
          </div>
          <div className="vehicle-form-actions">
            <AnimatedButton type="button" variant="ghost" onClick={() => { setShowVehicleForm(false); setEditingVehicleId(null) }}>
              Cancel
            </AnimatedButton>
            <AnimatedButton type="submit" variant="primary" disabled={vehicleLoading}>
              {vehicleLoading ? 'Saving…' : editingVehicleId ? 'Update Vehicle' : 'Save Vehicle'}
            </AnimatedButton>
          </div>
        </form>
      )}

      <div className="vehicle-list">
        {vehicles.length === 0 ? (
          <div className="vehicle-empty card">
            No vehicles yet. Click Add Vehicle to register your first one.
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="vehicle-empty card" style={{ textAlign: 'center', padding: '30px' }}>
            Không tìm thấy xe nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : paginatedVehicles.map((vehicle, index) => {
          const plate = vehicle.LicensePlate || vehicle.licensePlate || 'Unknown plate'
          const brand = vehicle.Brand || vehicle.brand || 'Unknown brand'
          const vehicleType = vehicle.VehicleType ?? vehicle.vehicleType ?? 2
          return (
            <div key={vehicle.VehicleId || vehicle.vehicleId || `${plate}-${index}`} className="vehicle-card">
              <div className="vehicle-status-indicator" />
              <div>
                <div className="vehicle-card-title">{plate}</div>
                <div className="vehicle-card-meta">{brand}</div>
              </div>
              <div className="vehicle-card-actions">
                <span className={`badge ${getVehicleTypeClass(vehicleType)}`}>{vehicleTypeLabel(vehicleType)}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm vehicle-edit-btn"
                  onClick={() => handleVehicleEditStart(vehicle)}
                  disabled={vehicleLoading}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm vehicle-remove-btn"
                  onClick={() => setVehicleToDelete(vehicle)}
                  disabled={vehicleLoading}
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={filteredVehicles.length}
        itemName="xe"
        onPageChange={setCurrentPage}
      />

      <ConfirmModal
        isOpen={!!vehicleToDelete}
        title="Remove Vehicle"
        variant="danger"
        isLoading={vehicleLoading}
        onCancel={() => setVehicleToDelete(null)}
        onConfirm={handleVehicleDeleteConfirm}
        confirmText="Remove"
        message={
          <>
            <p>
              Are you sure you want to remove vehicle{' '}
              <span className="highlight-plate">
                {vehicleToDelete?.LicensePlate || vehicleToDelete?.licensePlate}
              </span>?
            </p>
            <div className="confirm-modal-warning" style={{ marginTop: '12px' }}>
              This action cannot be undone and will unlink the vehicle from your account.
            </div>
          </>
        }
      />
    </div>
  )
}
