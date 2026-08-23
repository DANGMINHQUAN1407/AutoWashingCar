import { useEffect, useState } from 'react'
import api, { type Vehicle, type VehicleType } from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import AnimatedButton from '../../components/AnimatedButton'
import ConfirmModal from '../../components/ConfirmModal'
import Pagination from '../../components/Pagination'
import { formatLicensePlateInput, getLicensePlateError, licensePlatePlaceholder } from '../../utils/licensePlate'
import '../Dashboard.css'

const CUSTOM_BRAND_VALUE = '__custom__'

export default function CustomerVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [vehicleError, setVehicleError] = useState<string | null>(null)
  const [vehicleSuccess, setVehicleSuccess] = useState<string | null>(null)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [brandCatalogs, setBrandCatalogs] = useState<any[]>([])
  const [engineCatalogs, setEngineCatalogs] = useState<any[]>([])
  const [bodyStyleCatalogs, setBodyStyleCatalogs] = useState<any[]>([])

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
  const [isPlateComposing, setIsPlateComposing] = useState(false)

  // Images state
  const [activeImageVehicleId, setActiveImageVehicleId] = useState<string | null>(null)
  const [vehicleImages, setVehicleImages] = useState<any[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [imageUploadLoading, setImageUploadLoading] = useState(false)

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

  const toggleImagesSection = async (vehicleId: string) => {
    if (activeImageVehicleId === vehicleId) {
      setActiveImageVehicleId(null)
      setVehicleImages([])
      return
    }
    setActiveImageVehicleId(vehicleId)
    setImagesLoading(true)
    try {
      const imgs = await api.getVehicleImages(vehicleId)
      setVehicleImages(imgs)
    } catch (err) {
      console.error(err)
      setVehicleError('Không thể tải danh sách ảnh xe.')
    } finally {
      setImagesLoading(false)
    }
  }

  const handleImageUpload = async (vehicleId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    setImageUploadLoading(true)
    setVehicleError(null)
    setVehicleSuccess(null)
    try {
      await api.uploadVehicleImage(vehicleId, file)
      const imgs = await api.getVehicleImages(vehicleId)
      setVehicleImages(imgs)
      setVehicleSuccess('Tải ảnh xe lên thành công!')
      const updatedVehicles = await api.getMyVehicles()
      setVehicles(updatedVehicles)
    } catch (err: any) {
      setVehicleError(extractErrorMessage(err, 'Lỗi khi tải ảnh xe lên.'))
    } finally {
      setImageUploadLoading(false)
      e.target.value = ''
    }
  }

  const handleSetPrimaryImage = async (vehicleId: string, imageId: string) => {
    setVehicleError(null)
    setVehicleSuccess(null)
    try {
      await api.setPrimaryVehicleImage(vehicleId, imageId)
      const imgs = await api.getVehicleImages(vehicleId)
      setVehicleImages(imgs)
      setVehicleSuccess('Đặt làm ảnh chính thành công!')
      const updatedVehicles = await api.getMyVehicles()
      setVehicles(updatedVehicles)
    } catch (err: any) {
      setVehicleError(extractErrorMessage(err, 'Lỗi khi đặt ảnh chính.'))
    }
  }

  const handleDeleteImage = async (vehicleId: string, imageId: string) => {
    setVehicleError(null)
    setVehicleSuccess(null)
    try {
      await api.deleteVehicleImage(vehicleId, imageId)
      const imgs = await api.getVehicleImages(vehicleId)
      setVehicleImages(imgs)
      setVehicleSuccess('Xóa ảnh xe thành công!')
      const updatedVehicles = await api.getMyVehicles()
      setVehicles(updatedVehicles)
    } catch (err: any) {
      setVehicleError(extractErrorMessage(err, 'Lỗi khi xóa ảnh.'))
    }
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

    api.getEngineTypes({ isActive: true, page: 1, pageSize: 9999 })
      .then(res => setEngineCatalogs(res.items))
      .catch(() => setEngineCatalogs([]))

    api.getVehicleBrands({ isActive: true, page: 1, pageSize: 9999 })
      .then(res => setBrandCatalogs(res.items))
      .catch(() => setBrandCatalogs([]))

    api.getBodyStyles({ isActive: true, page: 1, pageSize: 9999 })
      .then(res => setBodyStyleCatalogs(res.items))
      .catch(() => setBodyStyleCatalogs([]))
  }, [])

  // Client-side filtering & pagination calculations
  const filteredVehicles = vehicles.filter(v => {
    const brand = (v.BrandCatalogName || v.brandCatalogName || v.Brand || v.brand || '').toLowerCase()
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

  const filteredBrandCatalogs = brandCatalogs.filter(cat => {
    const vt = Number(cat.vehicleType ?? cat.VehicleType)
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
    setVehicleForm({
      licensePlate: vehicle.LicensePlate || vehicle.licensePlate || '',
      vehicleType: (vehicle.VehicleType ?? vehicle.vehicleType ?? 2) as VehicleType,
      brand: vehicle.Brand || vehicle.brand || '',
      brandCatalogId: (vehicle.BrandCatalogId ?? vehicle.brandCatalogId)
        ? (vehicle.BrandCatalogId ?? vehicle.brandCatalogId ?? '')
        : (vehicle.Brand || vehicle.brand ? CUSTOM_BRAND_VALUE : ''),
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
      const plateError = getLicensePlateError(vehicleForm.licensePlate, vehicleForm.vehicleType)
      if (plateError) {
        setVehicleError(plateError)
        return
      }

      const payload = {
        LicensePlate: formatLicensePlateInput(vehicleForm.licensePlate, vehicleForm.vehicleType),
        VehicleType: vehicleForm.vehicleType,
        Brand: vehicleForm.brand.trim() || undefined,
        BrandCatalogId: vehicleForm.brandCatalogId && vehicleForm.brandCatalogId !== CUSTOM_BRAND_VALUE ? vehicleForm.brandCatalogId : undefined,
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

  const activeVehicle = activeImageVehicleId
    ? vehicles.find(v => (v.VehicleId || v.vehicleId) === activeImageVehicleId)
    : null;

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
                onCompositionStart={() => setIsPlateComposing(true)}
                onCompositionEnd={e => {
                  const value = e.currentTarget.value
                  setIsPlateComposing(false)
                  setVehicleForm(prev => ({
                    ...prev,
                    licensePlate: formatLicensePlateInput(value, prev.vehicleType),
                  }))
                }}
                onChange={e => {
                  const value = e.currentTarget.value
                  setVehicleForm(prev => ({
                    ...prev,
                    licensePlate: isPlateComposing ? value : formatLicensePlateInput(value, prev.vehicleType),
                  }))
                }}
                placeholder={licensePlatePlaceholder(vehicleForm.vehicleType)}
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
                    licensePlate: formatLicensePlateInput(prev.licensePlate, val),
                    brandCatalogId: '',
                    brand: '',
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
                className="form-input form-select-custom"
                value={vehicleForm.brandCatalogId}
                onChange={e => {
                  const catId = e.target.value
                  const matched = brandCatalogs.find(c => c.id === catId)
                  setVehicleForm(prev => ({
                    ...prev,
                    brandCatalogId: catId,
                    brand: catId === CUSTOM_BRAND_VALUE ? '' : matched?.name ?? '',
                  }))
                }}
              >
                <option value=""> --Chọn hãng xe-- </option>
                {filteredBrandCatalogs.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value={CUSTOM_BRAND_VALUE}>Khác</option>
              </select>
              {vehicleForm.brandCatalogId === CUSTOM_BRAND_VALUE && (
                <input
                  className="form-input"
                  value={vehicleForm.brand}
                  onChange={e => setVehicleForm(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Nhập hãng xe của bạn"
                  maxLength={50}
                  style={{ marginTop: 8 }}
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
          const brand = vehicle.BrandCatalogName || vehicle.brandCatalogName || vehicle.Brand || vehicle.brand || 'Chưa rõ hãng'
          const vehicleType = vehicle.VehicleType ?? vehicle.vehicleType ?? 2
          return (
            <div key={vehicle.VehicleId || vehicle.vehicleId || `${plate}-${index}`} className="vehicle-card-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border-dim)', borderRadius: 'var(--radius-md)' }}>
              <div className="vehicle-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  {vehicle.PrimaryImageUrl || vehicle.primaryImageUrl ? (
                    <img
                      src={vehicle.PrimaryImageUrl || vehicle.primaryImageUrl || undefined}
                      alt={plate}
                      style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--color-border-dim)' }}
                    />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🚗</div>
                  )}
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
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleImagesSection(vehicle.VehicleId || vehicle.vehicleId || '')}
                    style={{ fontSize: '0.85rem' }}
                  >
                    🖼️ Ảnh xe
                  </button>
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

      {activeImageVehicleId && activeVehicle && (
        <div className="confirm-modal-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="confirm-modal-card" style={{ maxWidth: '540px', width: '95%', textAlign: 'left', alignItems: 'stretch', gap: '16px', borderRadius: 'var(--radius-md)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', color: 'var(--color-heading)' }}>
                Quản lý ảnh xe: {activeVehicle.LicensePlate || activeVehicle.licensePlate}
              </h3>
              <button
                type="button"
                onClick={() => { setActiveImageVehicleId(null); setVehicleImages([]); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.6rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {imagesLoading ? (
              <p style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-dim)', margin: 0 }}>Đang tải danh sách ảnh...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', minHeight: '100px', justifyContent: 'center', maxHeight: '320px', overflowY: 'auto', padding: '8px' }}>
                  {vehicleImages.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', fontStyle: 'italic', padding: '30px 0', margin: 0, textAlign: 'center', width: '100%' }}>
                      Chưa có ảnh nào được tải lên cho xe này.
                    </p>
                  ) : (
                    vehicleImages.map(img => (
                      <div key={img.imageId} style={{ display: 'flex', flexDirection: 'column', width: '130px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-dim)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <div style={{ position: 'relative', width: '128px', height: '90px' }}>
                          <img src={img.imageUrl} alt="Xe" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {img.isPrimary && (
                            <span style={{ position: 'absolute', top: 4, left: 4, background: 'var(--color-primary)', color: '#000', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '2px', fontWeight: 'bold' }}>CHÍNH</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', borderTop: '1px solid var(--color-border-dim)' }}>
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(activeImageVehicleId, img.imageId)}
                            disabled={img.isPrimary}
                            style={{ flex: 1, padding: '8px 0', background: 'none', border: 'none', borderRight: '1px solid var(--color-border-dim)', color: img.isPrimary ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: img.isPrimary ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                            title={img.isPrimary ? "Đang là ảnh chính" : "Đặt làm ảnh chính"}
                          >
                            ★
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(activeImageVehicleId, img.imageId)}
                            style={{ flex: 1, padding: '8px 0', background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 'bold' }}
                            title="Xóa ảnh"
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-dim)', paddingTop: '16px' }}>
                  <label className="btn btn-ghost" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0, padding: '8px 16px', fontSize: '0.9rem' }}>
                    📤 Tải ảnh mới lên
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleImageUpload(activeImageVehicleId, e)}
                      disabled={imageUploadLoading}
                    />
                  </label>
                  {imageUploadLoading && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>Đang tải lên...</span>}
                  <AnimatedButton
                    type="button"
                    variant="ghost"
                    onClick={() => { setActiveImageVehicleId(null); setVehicleImages([]); }}
                  >
                    Đóng
                  </AnimatedButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
