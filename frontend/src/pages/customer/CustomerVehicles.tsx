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
  const [engineCatalogs, setEngineCatalogs] = useState<any[]>([])
  const [bodyStyleCatalogs, setBodyStyleCatalogs] = useState<any[]>([])
  const [brandCatalogs, setBrandCatalogs] = useState<any[]>([])
  const [isCustomBrand, setIsCustomBrand] = useState(false)

  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: '',
    vehicleType: 2 as VehicleType,
    brand: '',
    brandCatalogId: '',
    model: '',
    manufactureYear: '',
    engineType: '' as '' | number,
    bodyStyle: '' as '' | number,
    engineCatalogId: '',
    bodyStyleCatalogId: '',
  })

  const engineTypeLabel = (engine?: number) => {
    if (engine === 1) return 'Xăng (Petrol)'
    if (engine === 2) return 'Dầu (Diesel)'
    if (engine === 3) return 'Điện (EV)'
    if (engine === 4) return 'Hybrid (HEV)'
    return 'N/A'
  }

  const bodyStyleLabel = (style?: number) => {
    if (style === 1) return 'Sedan'
    if (style === 2) return 'SUV'
    if (style === 3) return 'Hatchback'
    if (style === 4) return 'Pickup (Bán tải)'
    if (style === 5) return 'Van'
    if (style === 6) return 'Minivan'
    if (style === 7) return 'Coupe'
    if (style === 8) return 'Convertible (Mui trần)'
    return 'N/A'
  }

  // Search, filter, and pagination states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'car' | 'motorbike' | 'truck'>('all')
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

    api.getBrands({ isActive: true, page: 1, pageSize: 9999 })
      .then(res => setBrandCatalogs(res.items))
      .catch(() => setBrandCatalogs([]))

    api.getEngineTypes({ isActive: true, page: 1, pageSize: 9999 })
      .then(res => setEngineCatalogs(res.items))
      .catch(() => setEngineCatalogs([]))

    api.getBodyStyles({ isActive: true, page: 1, pageSize: 9999 })
      .then(res => setBodyStyleCatalogs(res.items))
      .catch(() => setBodyStyleCatalogs([]))
  }, [])

  // Client-side filtering & pagination calculations
  const filteredVehicles = vehicles.filter(v => {
    const brand = (v.Brand || v.brand || '').toLowerCase()
    const matchesSearch = brand.includes(searchQuery.toLowerCase())

    const type = v.VehicleType ?? v.vehicleType ?? 2
    const matchesType = typeFilter === 'all' ||
      (typeFilter === 'car' && type === 2) ||
      (typeFilter === 'motorbike' && type === 1) ||
      (typeFilter === 'truck' && type === 3)

    return matchesSearch && matchesType
  })

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize))
  const paginatedVehicles = filteredVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Tính danh sách kiểu dáng cho loại xe đang chọn trong form
  // BE trả về vehicleType là số nguyên (1=Motorbike, 2=Car, 3=Truck)
  // Dùng Number() để tránh lỗi so sánh kiểu dữ liệu
  const formVehicleType = Number(vehicleForm.vehicleType)
  const filteredBodyStyles = bodyStyleCatalogs.filter(cat => {
    const vt = Number(cat.vehicleType ?? cat.VehicleType)
    // Legacy fallback: nếu vehicleType chưa được set (= 0 hoặc NaN),
    // các kiểu dáng có legacyEnumValue (1-8) mặc định thuộc Ô tô (Car = 2)
    if (!vt || isNaN(vt)) {
      const leg = cat.legacyEnumValue ?? cat.LegacyEnumValue
      return formVehicleType === 2 && leg != null
    }
    return vt === formVehicleType
  })

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
    setIsCustomBrand(false)
    setVehicleForm({
      licensePlate: '',
      vehicleType: 2 as VehicleType,
      brand: '',
      brandCatalogId: '',
      model: '',
      manufactureYear: '',
      engineType: '',
      bodyStyle: '',
      engineCatalogId: '',
      bodyStyleCatalogId: '',
    })
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
    const bName = vehicle.Brand || vehicle.brand || ''
    const bCatId = vehicle.BrandCatalogId || vehicle.brandCatalogId || ''
    const matchedBrand = brandCatalogs.find(b => b.id === bCatId || b.name.toLowerCase() === bName.toLowerCase())
    setIsCustomBrand(!matchedBrand && !!bName)
    setVehicleForm({
      licensePlate: vehicle.LicensePlate || vehicle.licensePlate || '',
      vehicleType: (vehicle.VehicleType ?? vehicle.vehicleType ?? 2) as VehicleType,
      brand: bName,
      brandCatalogId: bCatId || matchedBrand?.id || '',
      model: vehicle.Model || vehicle.model || '',
      manufactureYear: (vehicle.ManufactureYear ?? vehicle.manufactureYear ?? '').toString(),
      engineType: vehicle.EngineType ?? vehicle.engineType ?? '',
      bodyStyle: vehicle.BodyStyle ?? vehicle.bodyStyle ?? '',
      engineCatalogId: vehicle.EngineCatalogId ?? vehicle.engineCatalogId ?? '',
      bodyStyleCatalogId: vehicle.BodyStyleCatalogId ?? vehicle.bodyStyleCatalogId ?? '',
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
        BrandCatalogId: vehicleForm.brandCatalogId || undefined,
        Model: vehicleForm.model.trim() || undefined,
        ManufactureYear: vehicleForm.manufactureYear ? Number(vehicleForm.manufactureYear) : undefined,
        EngineType: vehicleForm.engineType !== '' ? Number(vehicleForm.engineType) : undefined,
        BodyStyle: vehicleForm.bodyStyle !== '' ? Number(vehicleForm.bodyStyle) : undefined,
        EngineCatalogId: vehicleForm.engineCatalogId || undefined,
        BodyStyleCatalogId: vehicleForm.bodyStyleCatalogId || undefined,
      }

      const savedVehicle = editingVehicleId
        ? await api.updateVehicle(editingVehicleId, payload)
        : await api.createVehicle(payload)

      setVehicles(prev => {
        if (editingVehicleId) {
          return prev.map(vehicle => (vehicle.VehicleId || vehicle.vehicleId) === editingVehicleId ? { ...vehicle, ...savedVehicle } : vehicle)
        }
        return [savedVehicle, ...prev]
      })
      setIsCustomBrand(false)
      setVehicleForm({
        licensePlate: '',
        vehicleType: 2,
        brand: '',
        brandCatalogId: '',
        model: '',
        manufactureYear: '',
        engineType: '',
        bodyStyle: '',
        engineCatalogId: '',
        bodyStyleCatalogId: '',
      })
      setShowVehicleForm(false)
      setEditingVehicleId(null)
      setVehicleSuccess(editingVehicleId ? 'Cập nhật thông tin xe thành công.' : 'Đăng ký xe mới thành công.')
    } catch (error: any) {
      let friendlyError = editingVehicleId ? 'Không thể cập nhật thông tin xe.' : 'Không thể đăng ký xe mới.'
      const errorString = error?.message || error?.Message || ''
      if (errorString.toLowerCase().includes('already exists') || errorString.toLowerCase().includes('trùng') || errorString.toLowerCase().includes('conflict') || errorString.includes('409')) {
        friendlyError = 'Biển số xe này đã được đăng ký bởi tài khoản khác trong hệ thống.'
      }
      setVehicleError(extractErrorMessage(error, friendlyError))
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
            <option value="truck">Xe tải / xe ba gác (Truck)</option>
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
            <h4>{editingVehicleId ? 'Chỉnh sửa xe' : 'Đăng ký xe'}</h4>
            <p>{editingVehicleId ? 'Cập nhật thông tin chi tiết xe của bạn.' : 'Thêm một phương tiện mới vào tài khoản của bạn.'}</p>
          </div>
          <div className="vehicle-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-license">Biển số xe *</label>
              <input
                id="vehicle-license"
                className="form-input"
                value={vehicleForm.licensePlate}
                onChange={e => setVehicleForm(prev => ({ ...prev, licensePlate: e.target.value }))}
                placeholder="VD: 30F-123.45"
                required
                minLength={6}
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-type">Loại xe *</label>
              <select
                id="vehicle-type"
                className="form-input"
                value={vehicleForm.vehicleType}
                onChange={e => {
                  const val = Number(e.target.value) as VehicleType;
                  setVehicleForm(prev => ({
                    ...prev,
                    vehicleType: val,
                    bodyStyleCatalogId: '',
                    bodyStyle: ''
                  }))
                }}
              >
                <option value={1}>Xe máy (Motorbike)</option>
                <option value={2}>Ô tô (Car)</option>
                <option value={3}>Xe tải / xe ba gác (Truck)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-brand">Hãng xe</label>
              <select
                id="vehicle-brand"
                className="form-input"
                value={isCustomBrand ? '__custom__' : (vehicleForm.brandCatalogId || '')}
                onChange={e => {
                  const val = e.target.value
                  if (val === '__custom__') {
                    setIsCustomBrand(true)
                    setVehicleForm(prev => ({ ...prev, brandCatalogId: '', brand: '' }))
                  } else {
                    setIsCustomBrand(false)
                    const selected = brandCatalogs.find(b => b.id === val)
                    setVehicleForm(prev => ({
                      ...prev,
                      brandCatalogId: selected ? selected.id : '',
                      brand: selected ? selected.name : '',
                    }))
                  }
                }}
              >
                <option value="">-- Chọn hãng xe --</option>
                {brandCatalogs.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                <option value="__custom__">➕ Hãng khác (Nhập tay)...</option>
              </select>
              {isCustomBrand && (
                <input
                  type="text"
                  className="form-input"
                  style={{ marginTop: '8px' }}
                  value={vehicleForm.brand}
                  onChange={e => setVehicleForm(prev => ({ ...prev, brand: e.target.value, brandCatalogId: '' }))}
                  placeholder="Nhập tên hãng xe (VD: Audi, Porsche, Harley...)"
                  maxLength={50}
                  required
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-model">Dòng xe (Model)</label>
              <input
                id="vehicle-model"
                className="form-input"
                value={vehicleForm.model}
                onChange={e => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                placeholder="VD: Future, Sirius, Camry, Ranger..."
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-year">Năm sản xuất</label>
              <input
                id="vehicle-year"
                type="number"
                className="form-input"
                value={vehicleForm.manufactureYear}
                onChange={e => setVehicleForm(prev => ({ ...prev, manufactureYear: e.target.value }))}
                placeholder="VD: 2020"
                min={1950}
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-engine">Loại động cơ</label>
              <select
                id="vehicle-engine"
                className="form-input"
                value={vehicleForm.engineCatalogId}
                onChange={e => {
                  const catId = e.target.value
                  const matched = engineCatalogs.find(c => c.id === catId)
                  setVehicleForm(prev => ({
                    ...prev,
                    engineCatalogId: catId,
                    engineType: matched?.legacyEnumValue ?? ''
                  }))
                }}
              >
                <option value="">-- Chọn loại động cơ --</option>
                {engineCatalogs.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group animate-slide-in">
              <label className="form-label" htmlFor="vehicle-style">Kiểu dáng</label>
              <select
                id="vehicle-style"
                className="form-input"
                value={vehicleForm.bodyStyleCatalogId}
                onChange={e => {
                  const catId = e.target.value
                  const matched = filteredBodyStyles.find(c => c.id === catId)
                  setVehicleForm(prev => ({
                    ...prev,
                    bodyStyleCatalogId: catId,
                    bodyStyle: matched?.legacyEnumValue ?? ''
                  }))
                }}
              >
                <option value="">-- Chọn kiểu dáng --</option>
                {filteredBodyStyles.length > 0 ? (
                  filteredBodyStyles.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                ) : (
                  <option disabled value="">Không có kiểu dáng cho loại xe này</option>
                )}
              </select>
            </div>
          </div>
          <div className="vehicle-form-actions">
            <AnimatedButton type="button" variant="ghost" onClick={() => { setShowVehicleForm(false); setEditingVehicleId(null) }}>
              Hủy
            </AnimatedButton>
            <AnimatedButton type="submit" variant="primary" disabled={vehicleLoading}>
              {vehicleLoading ? 'Đang lưu…' : editingVehicleId ? 'Cập nhật' : 'Lưu xe'}
            </AnimatedButton>
          </div>
        </form>
      )}

      <div className="vehicle-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {vehicles.length === 0 ? (
          <div className="vehicle-empty card">
            Chưa có xe nào. Hãy nhấn "Thêm xe" để bắt đầu đăng ký phương tiện của bạn.
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="vehicle-empty card" style={{ textAlign: 'center', padding: '30px' }}>
            Không tìm thấy xe nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : paginatedVehicles.map((vehicle, index) => {
          const plate = vehicle.LicensePlate || vehicle.licensePlate || 'Chưa rõ biển số'
          const brand = vehicle.Brand || vehicle.brand || 'Chưa rõ hãng'
          const vehicleType = vehicle.VehicleType ?? vehicle.vehicleType ?? 2
          return (
            <div key={vehicle.VehicleId || vehicle.vehicleId || `${plate}-${index}`} className="vehicle-card-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border-dim)', borderRadius: 'var(--radius-md)' }}>
              <div className="vehicle-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: '1px solid var(--color-border-dim)' }}>
                    {vehicleType === 1 ? '🏍️' : vehicleType === 3 ? '🚚' : '🚗'}
                  </div>
                  <div>
                    <div className="vehicle-card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{plate}</div>
                    <div className="vehicle-card-meta" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      {brand} {vehicle.Model || vehicle.model ? `- ${vehicle.Model || vehicle.model}` : ''}
                      {vehicle.ManufactureYear || vehicle.manufactureYear ? ` (${vehicle.ManufactureYear || vehicle.manufactureYear})` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                      <span>⚙️ {vehicle.EngineCatalogName ?? vehicle.engineCatalogName ?? engineTypeLabel(vehicle.EngineType ?? vehicle.engineType ?? undefined)}</span>
                      <span>🚙 {vehicle.BodyStyleCatalogName ?? vehicle.bodyStyleCatalogName ?? bodyStyleLabel(vehicle.BodyStyle ?? vehicle.bodyStyle ?? undefined)}</span>
                      <span>Hạng xe: <strong style={{ color: 'var(--color-primary)' }}>{vehicle.VehicleCondition || vehicle.vehicleCondition || 'Standard'}</strong></span>
                    </div>
                  </div>
                </div>
                <div className="vehicle-card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
