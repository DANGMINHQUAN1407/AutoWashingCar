import { useEffect, useState, useCallback } from 'react'
import api, { type Vehicle, type VehicleType, type VehicleTransferRequestDto } from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import AnimatedButton from '../../components/AnimatedButton'
import ConfirmModal from '../../components/ConfirmModal'
import Pagination from '../../components/Pagination'
import { formatLicensePlateInput, getLicensePlateError, licensePlatePlaceholder } from '../../utils/licensePlate'
import '../Dashboard.css'

const CUSTOM_BRAND_VALUE = '__custom__'

const TRANSFER_STATUS_MAP: Record<number, { label: string; badgeClass: string }> = {
  1: { label: 'Chờ duyệt', badgeClass: 'badge-warning' },
  2: { label: 'Đã chấp thuận', badgeClass: 'badge-success' },
  3: { label: 'Đã từ chối', badgeClass: 'badge-danger' },
  4: { label: 'Đã hủy', badgeClass: 'badge-secondary' },
}

export default function CustomerVehicles() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'transfers'>('vehicles')

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

  // Transfer requests state
  const [transfers, setTransfers] = useState<VehicleTransferRequestDto[]>([])
  const [transfersLoading, setTransfersLoading] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferForm, setTransferForm] = useState({
    licensePlate: '',
    vehicleType: 2 as VehicleType,
    reason: '',
  })
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferToCancel, setTransferToCancel] = useState<VehicleTransferRequestDto | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showTransferSuggest, setShowTransferSuggest] = useState(false)
  const [suggestedPlate, setSuggestedPlate] = useState('')

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
  const [vehicleImageFile, setVehicleImageFile] = useState<File | null>(null)
  const [vehicleImagePreview, setVehicleImagePreview] = useState<string | null>(null)

  const engineTypeLabel = (engine?: number) => {
    if (engine === 1) return 'Xăng'
    if (engine === 2) return 'Dầu (Diesel)'
    if (engine === 3) return 'Điện (EV)'
    if (engine === 4) return 'Hybrid (HEV)'
    return 'Chưa xác định'
  }

  const bodyStyleLabel = (style?: number) => {
    if (style === 1) return 'Sedan'
    if (style === 2) return 'SUV'
    if (style === 3) return 'Hatchback'
    if (style === 4) return 'Bán tải (Pickup)'
    if (style === 5) return 'Xe Van'
    if (style === 6) return 'Minivan'
    if (style === 7) return 'Coupe'
    if (style === 8) return 'Mui trần'
    return 'Chưa xác định'
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

  const loadVehicles = useCallback(() => {
    api.getMyVehicles()
      .then(res => setVehicles(Array.isArray(res) ? res : []))
      .catch(() => setVehicles([]))
  }, [])

  const loadTransfers = useCallback(() => {
    setTransfersLoading(true)
    api.getMyVehicleTransfers({ pageSize: 100 })
      .then(res => setTransfers(res.items || []))
      .catch(() => setTransfers([]))
      .finally(() => setTransfersLoading(false))
  }, [])

  useEffect(() => {
    loadVehicles()
    loadTransfers()

    api.getEngineTypes({ isActive: true, page: 1, pageSize: 9999 })
      .then(res => setEngineCatalogs(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])))
      .catch(() => setEngineCatalogs([]))

    api.getVehicleBrands({ isActive: true, page: 1, pageSize: 9999 })
      .then(res => setBrandCatalogs(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])))
      .catch(() => setBrandCatalogs([]))

    api.getBodyStyles({ isActive: true, page: 1, pageSize: 9999 })
      .then(res => setBodyStyleCatalogs(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])))
      .catch(() => setBodyStyleCatalogs([]))
  }, [loadVehicles, loadTransfers])

  // Client-side filtering & pagination calculations
  const safeVehicles = Array.isArray(vehicles) ? vehicles : []
  const filteredVehicles = safeVehicles.filter(v => {
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

  const formVehicleType = Number(vehicleForm.vehicleType)
  const safeBodyStyles = Array.isArray(bodyStyleCatalogs) ? bodyStyleCatalogs : []
  const filteredBodyStyles = safeBodyStyles.filter(cat => {
    const vt = Number(cat.vehicleType ?? cat.VehicleType)
    if (!vt || isNaN(vt)) {
      const leg = cat.legacyEnumValue ?? cat.LegacyEnumValue
      return formVehicleType === 2 && leg != null
    }
    return vt === formVehicleType
  })

  const safeBrands = Array.isArray(brandCatalogs) ? brandCatalogs : []
  const filteredBrandCatalogs = safeBrands.filter(cat => {
    const vt = Number(cat.vehicleType ?? cat.VehicleType)
    return vt === formVehicleType
  })

  const vehicleTypeLabel = (vehicleType?: VehicleType | number) => {
    if (vehicleType === 1) return 'Xe máy'
    if (vehicleType === 3) return 'Xe tải'
    return 'Ô tô'
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
    setVehicleImageFile(null)
    setVehicleImagePreview(null)
    setVehicleError(null)
    setShowVehicleForm(true)
  }

  const handleVehicleEditStart = (vehicle: Vehicle) => {
    const vId = vehicle.VehicleId || vehicle.vehicleId || null
    setEditingVehicleId(vId)

    const rawVehicleType = vehicle.VehicleType ?? vehicle.vehicleType ?? 2
    const vType = (Number(rawVehicleType) || 2) as VehicleType

    const eCatId = vehicle.EngineCatalogId ?? vehicle.engineCatalogId ?? ''
    const bCatId = vehicle.BodyStyleCatalogId ?? vehicle.bodyStyleCatalogId ?? ''
    const brCatId = vehicle.BrandCatalogId ?? vehicle.brandCatalogId ?? ''

    setVehicleForm({
      licensePlate: vehicle.LicensePlate || vehicle.licensePlate || '',
      vehicleType: vType,
      brand: vehicle.Brand || vehicle.brand || '',
      brandCatalogId: brCatId,
      model: vehicle.Model || vehicle.model || '',
      manufactureYear: vehicle.ManufactureYear || vehicle.manufactureYear ? String(vehicle.ManufactureYear || vehicle.manufactureYear) : '',
      engineType: vehicle.EngineType ?? vehicle.engineType ?? '',
      bodyStyle: vehicle.BodyStyle ?? vehicle.bodyStyle ?? '',
      engineCatalogId: eCatId,
      bodyStyleCatalogId: bCatId,
    })
    setVehicleImageFile(null)
    setVehicleImagePreview(vehicle.PrimaryImageUrl || vehicle.primaryImageUrl || null)
    setVehicleError(null)
    setShowVehicleForm(true)
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setVehicleError('Vui lòng chọn một tệp hình ảnh hợp lệ.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setVehicleError('Dung lượng ảnh không được vượt quá 5MB.')
      return
    }
    setVehicleImageFile(file)
    setVehicleImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setVehicleImageFile(null)
    setVehicleImagePreview(null)
  }

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVehicleLoading(true)
    setVehicleError(null)
    setVehicleSuccess(null)

    try {
      const plateError = getLicensePlateError(vehicleForm.licensePlate, vehicleForm.vehicleType, vehicleForm.manufactureYear)
      if (plateError) {
        setVehicleError(plateError)
        setVehicleLoading(false)
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

      const targetVehicleId = savedVehicle?.VehicleId || savedVehicle?.vehicleId || editingVehicleId

      if (targetVehicleId && vehicleImageFile) {
        try {
          const uploadedImg = await api.uploadVehicleImage(targetVehicleId, vehicleImageFile)
          const imgUrl = uploadedImg?.imageUrl || uploadedImg?.ImageUrl || uploadedImg?.data?.imageUrl
          if (imgUrl) {
            savedVehicle.PrimaryImageUrl = imgUrl
            savedVehicle.primaryImageUrl = imgUrl
          }
        } catch (imgErr) {
          console.error('Failed to upload vehicle image:', imgErr)
        }
      }

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
      setVehicleImageFile(null)
      setVehicleImagePreview(null)
      setShowVehicleForm(false)
      setEditingVehicleId(null)
      setVehicleSuccess(editingVehicleId ? 'Cập nhật thông tin xe thành công.' : 'Đăng ký xe mới thành công.')
      setShowTransferSuggest(false)
    } catch (error: any) {
      let friendlyError = editingVehicleId ? 'Không thể cập nhật thông tin xe.' : 'Không thể đăng ký xe.'
      const errorString = error?.message || error?.Message || ''
      if (errorString.toLowerCase().includes('already exists') || errorString.toLowerCase().includes('trùng') || errorString.toLowerCase().includes('conflict') || errorString.includes('409')) {
        friendlyError = 'Biển số xe này đã tồn tại trong hệ thống. Nếu bạn vừa mua lại chiếc xe này từ chủ sở hữu trước, bạn có thể gửi yêu cầu chuyển quyền sở hữu.'
        setShowTransferSuggest(true)
        setSuggestedPlate(vehicleForm.licensePlate)
      }
      setVehicleError(extractErrorMessage(error, friendlyError))
    } finally {
      setVehicleLoading(false)
    }
  }

  const handleOpenTransferModal = (prefillPlate?: string, prefillType?: VehicleType) => {
    setTransferForm({
      licensePlate: prefillPlate || '',
      vehicleType: prefillType || 2,
      reason: '',
    })
    setTransferError(null)
    setShowTransferModal(true)
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferSubmitting(true)
    setTransferError(null)
    try {
      await api.createVehicleTransfer({
        LicensePlate: formatLicensePlateInput(transferForm.licensePlate, transferForm.vehicleType),
        VehicleType: transferForm.vehicleType,
        Reason: transferForm.reason.trim() || undefined,
      })
      setShowTransferModal(false)
      setShowTransferSuggest(false)
      setActiveTab('transfers')
      setVehicleSuccess('Đã gửi yêu cầu nhận chuyển nhượng xe thành công! Vui lòng chờ Admin phê duyệt.')
      loadTransfers()
    } catch (err: any) {
      setTransferError(extractErrorMessage(err, 'Không thể gửi yêu cầu chuyển nhượng xe.'))
    } finally {
      setTransferSubmitting(false)
    }
  }

  const handleCancelTransferConfirm = async () => {
    if (!transferToCancel) return
    setCancelLoading(true)
    try {
      await api.cancelVehicleTransfer(transferToCancel.vehicleTransferRequestId)
      setTransferToCancel(null)
      setVehicleSuccess('Đã hủy yêu cầu chuyển nhượng xe.')
      loadTransfers()
    } catch (err: any) {
      setVehicleError(extractErrorMessage(err, 'Không thể hủy yêu cầu chuyển nhượng.'))
    } finally {
      setCancelLoading(false)
    }
  }

  const handleVehicleDeleteConfirm = async () => {
    if (!vehicleToDelete) return
    const vehicleId = vehicleToDelete.VehicleId || vehicleToDelete.vehicleId
    if (!vehicleId) {
      setVehicleError('Không thể xóa xe vì không tìm thấy mã định danh.')
      setVehicleToDelete(null)
      return
    }

    setVehicleLoading(true)
    setVehicleError(null)
    setVehicleSuccess(null)

    try {
      await api.deleteVehicle(vehicleId)
      setVehicles(prev => prev.filter(vehicle => (vehicle.VehicleId || vehicle.vehicleId) !== vehicleId))
      setVehicleSuccess('Đã xóa phương tiện thành công.')
    } catch (error: any) {
      setVehicleError(extractErrorMessage(error, 'Không thể xóa phương tiện.'))
    } finally {
      setVehicleLoading(false)
      setVehicleToDelete(null)
    }
  }

  return (
    <div className="portal-page">
      <div className="dash-header">
        <div>
          <h2>Quản lý phương tiện</h2>
          <p>Quản lý danh sách phương tiện và theo dõi yêu cầu chuyển giao quyền sở hữu xe.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <AnimatedButton
            type="button"
            variant="ghost"
            onClick={() => handleOpenTransferModal()}
          >
            📋 Yêu cầu chuyển nhượng
          </AnimatedButton>
          <AnimatedButton
            type="button"
            variant="primary"
            onClick={openCreateVehicleForm}
          >
            + Thêm xe mới
          </AnimatedButton>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="bookings-filter-tabs" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className={`bookings-tab-btn ${activeTab === 'vehicles' ? 'active' : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          Xe của tôi ({safeVehicles.length})
        </button>
        <button
          type="button"
          className={`bookings-tab-btn ${activeTab === 'transfers' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfers')}
        >
          Yêu cầu chuyển nhượng ({transfers.length})
        </button>
      </div>

      {(vehicleSuccess || vehicleError) && (
        <div className={`badge ${vehicleSuccess ? 'badge-success' : 'badge-danger'}`} style={{ display: 'block', padding: '10px 14px', marginBottom: '16px' }}>
          {vehicleSuccess || vehicleError}
        </div>
      )}

      {showTransferSuggest && (
        <div className="card" style={{ border: '1px solid var(--color-primary)', background: 'rgba(59, 130, 246, 0.05)', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h5 style={{ margin: '0 0 4px 0', color: 'var(--color-primary)' }}>Bạn vừa mua lại chiếc xe biển số {suggestedPlate}?</h5>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
              Hãy gửi yêu cầu nhận chuyển nhượng xe để Admin cập nhật chủ sở hữu mới sang tài khoản của bạn.
            </p>
          </div>
          <AnimatedButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleOpenTransferModal(suggestedPlate, vehicleForm.vehicleType)}
          >
            Tạo yêu cầu ngay
          </AnimatedButton>
        </div>
      )}

      {activeTab === 'vehicles' ? (
        <>
          {/* Search & Filter Row */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--color-border-dim)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Tìm theo hãng xe</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ví dụ: Toyota, Honda, Hyundai..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Loại phương tiện</label>
              <select
                className="form-input form-select-custom"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
              >
                <option value="all">Tất cả loại xe</option>
                <option value="car">Ô tô</option>
                <option value="motorbike">Xe máy</option>
                <option value="truck">Xe tải</option>
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
                Đặt lại bộ lọc
              </AnimatedButton>
            )}
          </div>

          {showVehicleForm && (() => {
            const currentPlateError = vehicleForm.licensePlate.trim()
              ? getLicensePlateError(vehicleForm.licensePlate, vehicleForm.vehicleType, vehicleForm.manufactureYear)
              : null
            const isPlateValid = vehicleForm.licensePlate.trim().length > 0 && !currentPlateError

            return (
            <form className="vehicle-form card" onSubmit={handleVehicleSubmit}>
              <div className="vehicle-form-header">
                <h4>{editingVehicleId ? 'Chỉnh sửa thông tin xe' : 'Đăng ký xe mới'}</h4>
                <p>{editingVehicleId ? 'Cập nhật lại thông tin phương tiện của bạn.' : 'Thêm phương tiện mới vào tài khoản của bạn.'}</p>
              </div>
              <div className="vehicle-form-grid">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" htmlFor="vehicle-license" style={{ marginBottom: 0 }}>Biển số xe *</label>
                    {isPlateValid && (
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Định dạng đúng</span>
                    )}
                  </div>
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
                    onBlur={e => {
                      const value = e.currentTarget.value
                      setVehicleForm(prev => ({
                        ...prev,
                        licensePlate: formatLicensePlateInput(value, prev.vehicleType),
                      }))
                    }}
                    placeholder={licensePlatePlaceholder(vehicleForm.vehicleType)}
                    required
                    minLength={6}
                    maxLength={20}
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 600,
                      borderColor: currentPlateError ? '#ef4444' : isPlateValid ? '#10b981' : undefined,
                    }}
                  />
                  {currentPlateError && (
                    <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>⚠️</span> {currentPlateError}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {vehicleForm.vehicleType === 1
                      ? '💡 Chuẩn biển 5 số xe máy: 59A1-123.45 (hoặc 4 số cũ: 59A1-2345)'
                      : '💡 Chuẩn biển 5 số ô tô: 51F-123.45 hoặc 30K-123.45'}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="vehicle-type">Loại phương tiện *</label>
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
                    <option value={1}>Xe máy</option>
                    <option value={2}>Ô tô</option>
                    <option value={3}>Xe tải</option>
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
                    <option value="">-- Chọn hãng xe --</option>
                    {filteredBrandCatalogs.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                    <option value={CUSTOM_BRAND_VALUE}>Khác (Nhập thủ công)</option>
                  </select>
                </div>
                {vehicleForm.brandCatalogId === CUSTOM_BRAND_VALUE && (
                  <div className="form-group animate-slide-in">
                    <label className="form-label" htmlFor="vehicle-brand-custom">Tên hãng xe tùy chỉnh *</label>
                    <input
                      id="vehicle-brand-custom"
                      className="form-input"
                      value={vehicleForm.brand}
                      onChange={e => setVehicleForm(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Ví dụ: VinFast, Porsche, Kawasaki..."
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="vehicle-model">Dòng xe (Model)</label>
                  <input
                    id="vehicle-model"
                    className="form-input"
                    value={vehicleForm.model}
                    onChange={e => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Ví dụ: Camry, Ranger, SH 150i, Civic..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="vehicle-year">Năm sản xuất</label>
                  <input
                    id="vehicle-year"
                    type="number"
                    min={1950}
                    max={new Date().getFullYear() + 1}
                    className="form-input"
                    value={vehicleForm.manufactureYear}
                    onChange={e => setVehicleForm(prev => ({ ...prev, manufactureYear: e.target.value }))}
                    placeholder="Ví dụ: 2022"
                    style={{
                      borderColor: (currentPlateError && (currentPlateError.includes('2010') || currentPlateError.includes('2011'))) ? '#ef4444' : undefined,
                    }}
                  />
                  {currentPlateError && (currentPlateError.includes('2010') || currentPlateError.includes('2011')) && (
                    <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>⚠️</span> {currentPlateError}
                    </div>
                  )}
                </div>
                <div className="form-group animate-slide-in">
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
                  <label className="form-label" htmlFor="vehicle-style">Kiểu dáng thân xe</label>
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
                      <option disabled value="">Không có kiểu dáng phù hợp cho loại xe này</option>
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Ảnh phương tiện (Tùy chọn)</label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {vehicleImagePreview ? (
                      <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border-dim)' }}>
                        <img src={vehicleImagePreview} alt="Xem trước" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(0,0,0,0.65)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                          title="Xóa ảnh"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ width: '90px', height: '90px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--color-border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--color-text-dim)' }}>
                        📷
                      </div>
                    )}
                    <div>
                      <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>📁 {vehicleImagePreview ? 'Đổi ảnh khác' : 'Tải ảnh phương tiện'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleImageFileChange}
                        />
                      </label>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                        Định dạng: JPG, PNG, WEBP (Tối đa 5MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="vehicle-form-actions">
                <AnimatedButton type="button" variant="ghost" onClick={() => { setShowVehicleForm(false); setEditingVehicleId(null); setVehicleImageFile(null); setVehicleImagePreview(null); }}>
                  Hủy
                </AnimatedButton>
                <AnimatedButton type="submit" variant="primary" disabled={vehicleLoading}>
                  {vehicleLoading ? 'Đang lưu…' : editingVehicleId ? 'Cập nhật' : 'Lưu phương tiện'}
                </AnimatedButton>
              </div>
            </form>
            );
          })()}

          <div className="vehicle-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {vehicles.length === 0 ? (
              <div className="vehicle-empty card">
                Bạn chưa đăng ký phương tiện nào. Nhấn "+ Thêm xe mới" để bắt đầu.
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="vehicle-empty card" style={{ textAlign: 'center', padding: '30px' }}>
                Không tìm thấy phương tiện nào phù hợp với bộ lọc.
              </div>
            ) : paginatedVehicles.map((vehicle, index) => {
              const plate = vehicle.LicensePlate || vehicle.licensePlate || 'N/A'
              const brand = vehicle.BrandCatalogName || vehicle.brandCatalogName || vehicle.Brand || vehicle.brand || 'Khác'
              const vehicleType = vehicle.VehicleType ?? vehicle.vehicleType ?? 2
              return (
                <div key={vehicle.VehicleId || vehicle.vehicleId || `${plate}-${index}`} className="vehicle-card-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border-dim)', borderRadius: 'var(--radius-md)' }}>
                  <div className="vehicle-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      {vehicle.PrimaryImageUrl || vehicle.primaryImageUrl ? (
                        <img
                          src={vehicle.PrimaryImageUrl || vehicle.primaryImageUrl || undefined}
                          alt={plate}
                          style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--color-border-dim)' }}
                        />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: '1px solid var(--color-border-dim)' }}>
                          {vehicleType === 1 ? '🏍️' : vehicleType === 3 ? '🚚' : '🚗'}
                        </div>
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
                          <span>Phân hạng: <strong style={{ color: 'var(--color-primary)' }}>{vehicle.VehicleCondition || vehicle.vehicleCondition || 'Tiêu chuẩn'}</strong></span>
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
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm vehicle-remove-btn"
                        onClick={() => setVehicleToDelete(vehicle)}
                        disabled={vehicleLoading}
                      >
                        Xóa
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
            itemName="phương tiện"
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        /* TRANSFERS TAB */
        <div>
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-subtle, #f8fafc)', borderBottom: '1px solid var(--color-border-dim, #e2e8f0)' }}>
                    <th style={{ padding: '14px 18px', fontWeight: 600 }}>Biển số xe</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600 }}>Loại xe</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600 }}>Lý do chuyển nhượng</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600 }}>Trạng thái</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600 }}>Ghi chú của Admin</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600 }}>Ngày gửi</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {transfersLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        Đang tải danh sách yêu cầu chuyển nhượng...
                      </td>
                    </tr>
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        Bạn chưa gửi yêu cầu chuyển nhượng xe nào.
                      </td>
                    </tr>
                  ) : (
                    transfers.map(t => {
                      const statusInfo = TRANSFER_STATUS_MAP[t.status] || { label: 'Không xác định', badgeClass: 'badge-secondary' }
                      const isPending = t.status === 1
                      return (
                        <tr key={t.vehicleTransferRequestId} style={{ borderBottom: '1px solid var(--color-border-dim, #f1f5f9)' }}>
                          <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {t.licensePlate}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {vehicleTypeLabel(t.vehicleType)}
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: '0.88rem' }}>
                            {t.reason || <em>Không có lý do</em>}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span className={`badge ${statusInfo.badgeClass}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            {t.reviewNote || '—'}
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            {new Date(t.createdAtUtc).toLocaleDateString('vi-VN')}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {isPending && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#ef4444' }}
                                onClick={() => setTransferToCancel(t)}
                              >
                                Hủy yêu cầu
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Request Modal */}
      {showTransferModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-content card" style={{ maxWidth: '540px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Gửi yêu cầu nhận chuyển nhượng xe</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowTransferModal(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Nếu bạn vừa mua lại phương tiện đã có trên hệ thống từ chủ trước, vui lòng điền thông tin để Admin xác minh và chuyển quyền sở hữu xe cho bạn.
            </p>

            {transferError && (
              <div className="badge badge-danger" style={{ display: 'block', padding: '10px 14px', marginBottom: '16px' }}>
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Biển số xe *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={licensePlatePlaceholder(transferForm.vehicleType)}
                  value={transferForm.licensePlate}
                  onChange={e => setTransferForm(prev => ({
                    ...prev,
                    licensePlate: formatLicensePlateInput(e.target.value, prev.vehicleType),
                  }))}
                  required
                  minLength={6}
                  maxLength={20}
                />
              </div>

              <div>
                <label className="form-label">Loại phương tiện *</label>
                <select
                  className="form-input"
                  value={transferForm.vehicleType}
                  onChange={e => {
                    const val = Number(e.target.value) as VehicleType
                    setTransferForm(prev => ({
                      ...prev,
                      vehicleType: val,
                      licensePlate: formatLicensePlateInput(prev.licensePlate, val),
                    }))
                  }}
                >
                  <option value={1}>Xe máy</option>
                  <option value={2}>Ô tô</option>
                  <option value={3}>Xe tải</option>
                </select>
              </div>

              <div>
                <label className="form-label">Lý do chuyển nhượng / Ghi chú</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Ví dụ: Tôi vừa mua lại chiếc xe này từ chủ trước vào ngày DD/MM/YYYY..."
                  value={transferForm.reason}
                  onChange={e => setTransferForm(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <AnimatedButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowTransferModal(false)}
                >
                  Hủy
                </AnimatedButton>
                <AnimatedButton
                  type="submit"
                  variant="primary"
                  disabled={transferSubmitting}
                >
                  {transferSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
                </AnimatedButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Transfer Confirmation */}
      <ConfirmModal
        isOpen={!!transferToCancel}
        title="Hủy yêu cầu chuyển nhượng xe"
        variant="danger"
        isLoading={cancelLoading}
        onCancel={() => setTransferToCancel(null)}
        onConfirm={handleCancelTransferConfirm}
        confirmText="Xác nhận hủy"
        message={
          <p>
            Bạn có chắc chắn muốn hủy yêu cầu nhận chuyển nhượng xe biển số{' '}
            <span className="highlight-plate">{transferToCancel?.licensePlate}</span>?
          </p>
        }
      />

      <ConfirmModal
        isOpen={!!vehicleToDelete}
        title="Xác nhận xóa phương tiện"
        variant="danger"
        isLoading={vehicleLoading}
        onCancel={() => setVehicleToDelete(null)}
        onConfirm={handleVehicleDeleteConfirm}
        confirmText="Xác nhận xóa"
        message={
          <>
            <p>
              Bạn có chắc chắn muốn xóa phương tiện có biển số{' '}
              <span className="highlight-plate">
                {vehicleToDelete?.LicensePlate || vehicleToDelete?.licensePlate}
              </span>?
            </p>
            <div className="confirm-modal-warning" style={{ marginTop: '12px' }}>
              Hành động này không thể hoàn tác và sẽ hủy liên kết xe khỏi tài khoản của bạn.
            </div>
          </>
        }
      />
    </div>
  )
}
