import { useState, useEffect } from 'react'
import * as api from '../../services/api'
import type { BranchService } from '../../types/branch'
import type { Slot } from '../../types/slot'
import type { Booking } from '../../types/booking'
import { compactLicensePlate, formatLicensePlateInput, getLicensePlateError, getManufactureYearError, licensePlatePlaceholder, licensePlateHint } from '../../utils/licensePlate'
import { extractErrorMessage } from '../../utils/errorUtils'
import './Staff.css'

const CUSTOM_BRAND_VALUE = '__custom__'

const BOOKING_STATUS_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Chờ xử lý', color: 'var(--color-text-muted)' },
  2: { label: 'Đã xác nhận', color: '#3b82f6' },
  3: { label: 'Đã Check-in', color: '#6366f1' },
  4: { label: 'Đang rửa', color: '#f59e0b' },
  5: { label: 'Hoàn thành', color: 'var(--color-success)' },
  6: { label: 'Đã đóng', color: 'var(--color-text-dim)' },
  7: { label: 'Đã hủy', color: 'var(--color-danger)' },
}

const VEHICLE_TYPES: Record<number, string> = { 1: 'Xe máy', 2: 'Ô tô', 3: 'Xe tải' }

// Helper to get local date string in YYYY-MM-DD format
function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - (offset * 60 * 1000))
  return localDate.toISOString().split('T')[0]
}

// Helper to check if a slot is in the past
function isSlotInPast(slotDateStr: string, slotStartTimeStr: string) {
  const now = new Date()
  const todayStr = getLocalDateString(now)
  if (slotDateStr < todayStr) return true
  if (slotDateStr > todayStr) return false
  const timeParts = slotStartTimeStr.split(':')
  const slotHours = parseInt(timeParts[0], 10)
  const slotMinutes = parseInt(timeParts[1], 10)
  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()
  if (slotHours < currentHours) return true
  if (slotHours === currentHours && slotMinutes <= currentMinutes) return true
  return false
}

type CustomerInfo = {
  userId: string
  fullName: string
  phoneNumber?: string
  email?: string
  isGuest: boolean
  vehicles: Array<{ vehicleId: string; licensePlate: string; vehicleType: number; brand?: string | null }>
}

export default function StaffCustomers() {
  const [phone, setPhone] = useState('')
  const [searching, setSearching] = useState(false)
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [searchDone, setSearchDone] = useState(false)

  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [addNew, setAddNew] = useState(false)
  const [newPlate, setNewPlate] = useState('')
  const [isNewPlateComposing, setIsNewPlateComposing] = useState(false)
  const [newType, setNewType] = useState(2)
  const [newBrand, setNewBrand] = useState('')
  const [newBrandCatalogId, setNewBrandCatalogId] = useState('')
  const [newModel, setNewModel] = useState('')
  const [newYear, setNewYear] = useState('')
  const [newEngineCatalogId, setNewEngineCatalogId] = useState('')
  const [newEngineType, setNewEngineType] = useState<number | ''>('')
  const [newBodyStyleCatalogId, setNewBodyStyleCatalogId] = useState('')
  const [newBodyStyle, setNewBodyStyle] = useState<number | ''>('')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null)

  const [brandCatalogs, setBrandCatalogs] = useState<any[]>([])
  const [engineCatalogs, setEngineCatalogs] = useState<any[]>([])
  const [bodyStyleCatalogs, setBodyStyleCatalogs] = useState<any[]>([])

  const [services, setServices] = useState<BranchService[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [servicesLoading, setServicesLoading] = useState(true)
  const [branchId, setBranchId] = useState('')

  const [slots, setSlots] = useState<Slot[]>([])
  const [slotId, setSlotId] = useState('')
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().split('T')[0])

  const [history, setHistory] = useState<Booking[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [guestMode, setGuestMode] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestRegistering, setGuestRegistering] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [customerVouchers, setCustomerVouchers] = useState<any[]>([])

  useEffect(() => {
    async function loadBranchData() {
      setServicesLoading(true)
      try {
        const me = await api.getMe()
        const currentBranchId = me?.branchId ?? me?.BranchId ?? ''
        
        api.getVehicleBrands({ isActive: true, page: 1, pageSize: 9999 })
          .then(res => setBrandCatalogs(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])))
          .catch(() => setBrandCatalogs([]))

        api.getEngineTypes({ isActive: true, page: 1, pageSize: 9999 })
          .then(res => setEngineCatalogs(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])))
          .catch(() => setEngineCatalogs([]))

        api.getBodyStyles({ isActive: true, page: 1, pageSize: 9999 })
          .then(res => setBodyStyleCatalogs(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])))
          .catch(() => setBodyStyleCatalogs([]))

        if (currentBranchId) {
          setBranchId(currentBranchId)
          const list = await api.getBranchServices(currentBranchId)
          setServices(list.filter(s => s.isActive))
          setSlotsLoading(true)
          const slotList = await api.getAvailableSlots(currentBranchId, slotDate)
          setSlots(slotList)
          setSlotsLoading(false)
        }
      } catch { /* backend offline – show empty */ }
      setServicesLoading(false)
    }
    loadBranchData()
  }, [])

  const applyCustomer = (info: CustomerInfo) => {
    setCustomer(info)
    setGuestMode(false)
    setGuestName('')
    if (info.vehicles?.length > 0) {
      setSelectedVehicleId(info.vehicles[0].vehicleId)
      setAddNew(false)
    } else {
      setSelectedVehicleId('')
      setAddNew(true)
    }
    setHistoryLoading(true)
    api.getCustomerBookings(info.userId, { pageSize: 5 })
      .then(res => setHistory(res.items))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))

    // Fetch customer's owned vouchers and system-wide available vouchers
    Promise.all([
      api.getMyVouchers({ userId: info.userId, voucherStatus: 1, branchId: branchId || undefined }),
      api.getAvailableVouchers(branchId || undefined, info.userId)
    ])
      .then(([myRes, availRes]) => {
        const myOwned = myRes.items || []
        const freeSystemVouchers = (availRes || [])
          .filter(v => v.requiredPoints === 0)
          .map(v => ({
            userVoucherId: v.voucherId,
            userId: info.userId,
            voucherId: v.voucherId,
            voucherStatus: 1,
            redeemedAtUtc: '',
            voucherCode: v.voucherCode,
            voucherType: v.voucherType,
            discountType: v.discountType,
            discountValue: v.discountValue,
            minOrderAmount: v.minOrderAmount,
            maxDiscountAmount: v.maxDiscountAmount,
            title: v.title,
            description: ''
          }))

        const merged: any[] = [...myOwned]
        freeSystemVouchers.forEach(fv => {
          if (!merged.some(m => m.voucherCode.toUpperCase() === fv.voucherCode.toUpperCase())) {
            merged.push(fv)
          }
        })
        setCustomerVouchers(merged)
      })
      .catch(() => setCustomerVouchers([]))
  }

  const handleSearch = async () => {
    if (!phone.trim()) return
    setSearching(true)
    setSearchDone(false)
    setCustomer(null)
    setCustomerVouchers([])
    setGuestMode(false)
    setGuestName('')
    setHistory([])
    setError('')
    try {
      const result = await api.lookupCustomerByPhone(phone.trim())
      if (result?.userId) {
        applyCustomer(result as CustomerInfo)
      } else {
        setGuestMode(true)
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Tra cứu khách hàng thất bại. Vui lòng kiểm tra kết nối.'))
    }
    setSearchDone(true)
    setSearching(false)
  }

  const handleContinueAsGuest = async () => {
    if (!guestName.trim()) return
    setGuestRegistering(true)
    setError('')
    try {
      const cleanPhone = phone.trim().replace(/\D/g, '')
      const result = await api.registerWalkInCustomer({
        FullName: guestName.trim(),
        PhoneNumber: cleanPhone || undefined,
      })
      if (result) {
        applyCustomer(result as CustomerInfo)
        setSuccess(`Đã tiếp nhận khách vãng lai: ${guestName.trim()}`)
      } else {
        throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ.')
      }
    } catch (e: any) {
      console.error('Failed to register walk-in customer:', e)
      const msg = extractErrorMessage(e, 'Không thể tạo tài khoản khách vãng lai. Vui lòng thử lại.')
      setError(msg)
    } finally {
      setGuestRegistering(false)
    }
  }

  const handleDateChange = async (d: string) => {
    setSlotDate(d)
    setSlotId('')
    if (!branchId) return
    setSlotsLoading(true)
    try {
      const list = await api.getAvailableSlots(branchId, d)
      setSlots(list)
    } catch { setSlots([]) }
    setSlotsLoading(false)
  }

  const effectiveVehicleType = addNew 
    ? newType 
    : (customer?.vehicles?.find(v => v.vehicleId === selectedVehicleId)?.vehicleType ?? newType ?? 2)

  const isDuplicatePlate = Boolean(
    addNew &&
    newPlate.trim() &&
    customer?.vehicles?.some(v => compactLicensePlate(v.licensePlate) === compactLicensePlate(newPlate))
  )

  const newYearError = (addNew && newYear.trim()) ? getManufactureYearError(newYear) : null

  const newPlateError = (() => {
    if (!addNew || !newPlate || newPlate.trim().length < 3) return null
    if (isDuplicatePlate) return 'Biển số xe này đã có trong danh sách xe của khách hàng!'
    return getLicensePlateError(newPlate, newType, newYear ? Number(newYear) : undefined)
  })()

  const safeBodyStyles = Array.isArray(bodyStyleCatalogs) ? bodyStyleCatalogs : []
  const filteredBodyStyles = safeBodyStyles.filter(cat => {
    const vt = Number(cat.vehicleType ?? cat.VehicleType)
    if (isNaN(vt) || vt === 0) {
      const leg = cat.legacyEnumValue ?? cat.LegacyEnumValue
      return newType === 2 && leg != null
    }
    return vt === newType
  })

  const applicableServices = services.filter(s => !s.vehicleType || s.vehicleType === effectiveVehicleType)
  const mainServices = applicableServices.filter(s => (s.servicePackageType ?? 1) !== 2)
  const addOnServices = applicableServices.filter(s => (s.servicePackageType ?? 1) === 2)

  const selectedMain = mainServices.find(s => selected.has(s.serviceId)) || null
  const isPremiumSelected = (selectedMain?.servicePackageType ?? 0) === 3
  const selectedAddOns = addOnServices.filter(s => selected.has(s.serviceId))

  // Clean up selected services when vehicle type changes if not applicable anymore
  useEffect(() => {
    setSelected(prev => {
      const valid = new Set<string>()
      prev.forEach(id => {
        const s = services.find(item => item.serviceId === id)
        if (s && (!s.vehicleType || s.vehicleType === effectiveVehicleType)) {
          valid.add(id)
        }
      })
      return valid
    })
  }, [effectiveVehicleType, services])

  const handleSelectMainService = (svc: BranchService) => {
    setError('')
    setSelected(prev => {
      const next = new Set<string>()
      // If clicking already selected main service, toggle off
      if (selectedMain?.serviceId === svc.serviceId) {
        return next
      }
      // Select new main service
      next.add(svc.serviceId)
      // If selecting Premium (3), do not retain any add-on
      if ((svc.servicePackageType ?? 1) === 3) {
        return next
      }
      // If Standard (1), preserve existing valid add-ons
      addOnServices.forEach(a => {
        if (prev.has(a.serviceId)) {
          next.add(a.serviceId)
        }
      })
      return next
    })
  }

  const handleToggleAddOn = (svc: BranchService) => {
    setError('')
    if (!selectedMain) {
      setError('⚠️ Vui lòng chọn một Gói Dịch Vụ Chính (ở mục 1) trước khi chọn dịch vụ bổ sung!')
      return
    }
    if (isPremiumSelected) {
      setError('⚠️ Gói Combo trọn gói đã bao gồm toàn bộ dịch vụ, không thể chọn thêm dịch vụ bổ sung.')
      return
    }
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(svc.serviceId)) {
        next.delete(svc.serviceId)
      } else {
        next.add(svc.serviceId)
      }
      return next
    })
  }

  const total = services.filter(s => selected.has(s.serviceId)).reduce((sum, s) => sum + s.basePrice, 0)
  const totalDuration = services.filter(s => selected.has(s.serviceId)).reduce((sum, s) => sum + s.durationMinutes, 0)

  const handleConfirm = async () => {
    if (!customer) { setError('Vui lòng tìm kiếm khách hàng trước.'); return }
    if (!selectedMain) {
      setError('Vui lòng chọn một Gói Dịch Vụ Chính (Tiêu chuẩn hoặc Toàn diện). Dịch vụ bổ sung phải đi kèm một gói chính.')
      return
    }
    if (isPremiumSelected && selectedAddOns.length > 0) {
      setError('Gói trọn gói toàn diện không thể kết hợp cùng dịch vụ bổ sung.')
      return
    }
    if (!slotId) { setError('Vui lòng chọn một khung giờ.'); return }
    if (!addNew && !selectedVehicleId) { setError('Vui lòng chọn hoặc thêm phương tiện.'); return }
    if (addNew) {
      if (isDuplicatePlate) { setError('Biển số xe này đã có trong danh sách xe của khách hàng!'); return }
      if (newYearError) { setError(newYearError); return }
      const plateError = getLicensePlateError(newPlate, newType, newYear ? Number(newYear) : undefined)
      if (plateError) { setError(plateError); return }
    }

    setSubmitting(true)
    setError('')
    try {
      const booking = await api.createWalkInBooking({
        CustomerId: customer.userId,
        SlotInventoryId: slotId,
        Services: Array.from(selected).map(id => ({ ServiceCatalogItemId: id, Quantity: 1 })),
        ExistingVehicleId: !addNew && selectedVehicleId ? selectedVehicleId : undefined,
        NewVehicle: addNew ? {
          LicensePlate: formatLicensePlateInput(newPlate, newType),
          VehicleType: newType,
          Brand: newBrand.trim() || undefined,
          BrandCatalogId: newBrandCatalogId && newBrandCatalogId !== CUSTOM_BRAND_VALUE ? newBrandCatalogId : undefined,
          Model: newModel.trim() || undefined,
          ManufactureYear: newYear ? parseInt(newYear, 10) : undefined,
          EngineType: newEngineType !== '' ? Number(newEngineType) : undefined,
          BodyStyle: newBodyStyle !== '' ? Number(newBodyStyle) : undefined,
          EngineCatalogId: newEngineCatalogId || undefined,
          BodyStyleCatalogId: newBodyStyleCatalogId || undefined,
        } : undefined,
        VoucherCode: voucherCode.trim() || undefined,
      })

      if (addNew && newImageFile && (booking as any)?.vehicleId) {
        try {
          await api.uploadVehicleImage((booking as any).vehicleId, newImageFile)
        } catch (imgErr) {
          console.error('Failed to upload vehicle image:', imgErr)
        }
      }

      setSuccess(`Đã tạo đơn khách trực tiếp ${booking.bookingCode} — xe đã được thêm vào hàng đợi!`)
      setCustomer(null)
      setPhone('')
      setSelected(new Set())
      setSlotId('')
      setAddNew(false)
      setNewPlate('')
      setNewBrand('')
      setNewBrandCatalogId('')
      setNewModel('')
      setNewYear('')
      setNewEngineCatalogId('')
      setNewEngineType('')
      setNewBodyStyleCatalogId('')
      setNewBodyStyle('')
      setNewImageFile(null)
      setNewImagePreview(null)
      setVoucherCode('')
      setCustomerVouchers([])
      setSearchDone(false)
      setHistory([])
      // Reload slots so availability is fresh
      if (branchId) {
        api.getAvailableSlots(branchId, slotDate).then(setSlots).catch(() => { })
      }
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Không thể tạo đơn trực tiếp. Vui lòng thử lại.'))
    }
    setSubmitting(false)
  }

  return (
    <div className="portal-page">
      <div className="ops-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'var(--color-primary)', opacity: 0.1, filter: 'blur(50px)', borderRadius: '50%' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>Tiếp Nhận Khách Trực Tiếp</h2>
          <p>Tìm kiếm khách hàng và đăng ký dịch vụ trực tiếp tại cửa hàng.</p>
        </div>
      </div>

      {error && (
        <div className="staff-alert staff-alert--danger" style={{ marginBottom: 16 }}>
          <span>{error}</span>
          <button className="staff-alert-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {success && (
        <div className="staff-alert staff-alert--success">
          <span>{success}</span>
          <button className="staff-alert-close" onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      <div className="checkin-layout" style={{ width: '100%', minWidth: 0 }}>
        {/* ── Left: Customer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
          <div className="checkin-panel" style={{ borderTop: '4px solid var(--color-primary)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, transparent 100%)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="checkin-panel-title" style={{ fontSize: '1.1rem', marginBottom: 16 }}>Tìm Khách Hàng</div>

              {/* Premium Search Bar */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg)', border: '2px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 4, transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, color: 'var(--color-primary)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <input
                  placeholder="Nhập số điện thoại..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', height: 46, fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-heading)', outline: 'none' }}
                />
                <button onClick={handleSearch} disabled={searching} title="Tìm kiếm" style={{ height: 46, width: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', transition: 'opacity 0.2s, transform 0.1s', opacity: searching ? 0.7 : 1, flexShrink: 0 }}>
                  {searching ? (
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', lineHeight: 0.5, letterSpacing: 1 }}>...</span>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  )}
                </button>
              </div>

              {/* Guest Fallback */}
              {searchDone && guestMode && !customer && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.9rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    Không tìm thấy tài khoản! (Tạo khách vãng lai)
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', width: '100%' }}>
                    <input
                      className="form-input"
                      placeholder="Nhập tên khách *"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleContinueAsGuest()
                        }
                      }}
                      autoFocus
                      style={{ flex: 1, height: '42px', fontSize: '0.95rem', margin: 0, padding: '0 12px', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!guestName.trim() || guestRegistering}
                      onClick={handleContinueAsGuest}
                      style={{ height: '42px', padding: '0 20px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: 0, fontWeight: 700, borderRadius: 'var(--radius-md)', flexShrink: 0, boxSizing: 'border-box' }}
                    >
                      {guestRegistering ? 'Đang tạo…' : 'Tiếp tục'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {customer && (
            <div className="checkin-panel">
              <div className="customer-card-box" style={{ marginBottom: 24 }}>
                <div className="customer-avatar-lg">{customer.fullName.substring(0, 2).toUpperCase()}</div>
                <div>
                  <div className="customer-info-name" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{customer.fullName}</div>
                  {customer.phoneNumber && <div className="customer-info-phone" style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>{customer.phoneNumber}</div>}
                </div>
                <div style={{ marginTop: 16 }}>
                  <span className={`tier-badge tier-badge--${customer.isGuest ? 'guest' : 'standard'}`} style={{ padding: '6px 16px', fontSize: '0.8rem', fontWeight: 700, borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>
                    {customer.isGuest ? 'Khách vãng lai' : 'Thành viên'}
                  </span>
                </div>
              </div>

              <div className="checkin-panel-title">Chọn Phương Tiện</div>
              <div className="vehicle-options">
                {customer.vehicles.map(v => (
                  <div
                    key={v.vehicleId}
                    className={`vehicle-option ${selectedVehicleId === v.vehicleId && !addNew ? 'selected' : ''}`}
                    onClick={() => { setSelectedVehicleId(v.vehicleId); setAddNew(false) }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: selectedVehicleId === v.vehicleId && !addNew ? 'var(--color-primary)' : 'var(--color-bg-2)', color: selectedVehicleId === v.vehicleId && !addNew ? '#fff' : 'var(--color-text-muted)', transition: 'all 0.2s' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 17H3v-5l2-4h14l2 4v5h-2" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" />
                      </svg>
                    </div>
                    <div className="vehicle-option-info">
                      <div className="vehicle-option-plate" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>{v.licensePlate}</div>
                      <div className="vehicle-option-brand" style={{ fontSize: '0.8rem', marginTop: 2 }}>{VEHICLE_TYPES[v.vehicleType] ?? 'Phương tiện'}{v.brand ? ` · ${v.brand}` : ''}</div>
                    </div>
                    {selectedVehicleId === v.vehicleId && !addNew && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="3" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ))}
                <div
                  className={`vehicle-option ${addNew ? 'selected' : ''}`}
                  onClick={() => { setAddNew(true); setSelectedVehicleId('') }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    borderColor: addNew ? 'var(--color-primary)' : 'var(--color-border)',
                    background: addNew ? 'rgba(99,102,241,0.05)' : 'transparent'
                  }}
                >
                  <svg className="vehicle-option-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: addNew ? 'var(--color-primary)' : 'inherit' }}>
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span className="vehicle-option-add" style={{ fontWeight: 600, color: addNew ? 'var(--color-primary)' : 'inherit' }}>Thêm xe mới</span>
                </div>
              </div>

              {addNew && customer.vehicles.length === 0 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 8 }}>
                  Khách chưa có xe nào — vui lòng nhập thông tin xe bên dưới.
                </div>
              )}

              {addNew && (
                <div className="new-vehicle-form" style={{ marginTop: 16, background: 'var(--color-bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid var(--color-border-dim)', paddingBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-heading)' }}>Đăng ký xe mới</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>8 trường thông tin</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', minWidth: 0 }}>
                    {/* 1. Biển số xe */}
                    <div className="form-group" style={{ marginBottom: 0, width: '100%', minWidth: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-heading)' }}>
                        Biển số xe <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input 
                        className="form-input" 
                        placeholder={licensePlatePlaceholder(newType, newYear)} 
                        value={newPlate} 
                        onCompositionStart={() => setIsNewPlateComposing(true)} 
                        onCompositionEnd={e => { const value = e.currentTarget.value; setIsNewPlateComposing(false); setNewPlate(formatLicensePlateInput(value, newType)) }} 
                        onChange={e => { const value = e.currentTarget.value; setNewPlate(isNewPlateComposing ? value : formatLicensePlateInput(value, newType)) }} 
                        style={{
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          height: 40,
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          boxSizing: 'border-box',
                          borderColor: newPlateError ? '#ef4444' : undefined,
                        }} 
                      />
                      {newPlateError ? (
                        <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>⚠️</span> {newPlateError}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {licensePlateHint(newType, newYear)}
                        </div>
                      )}
                    </div>

                    {/* 2 & 3. Loại phương tiện & Hãng xe */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, width: '100%', minWidth: 0 }}>
                      <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-heading)' }}>Loại xe <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                        <select 
                          className="form-input form-select-custom" 
                          value={newType} 
                          onChange={e => { 
                            const nextType = Number(e.target.value); 
                            setNewType(nextType); 
                            setNewPlate(prev => formatLicensePlateInput(prev, nextType)); 
                            setNewBrandCatalogId(''); 
                            setNewBrand(''); 
                            setNewBodyStyleCatalogId('');
                            setNewBodyStyle('');
                          }} 
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, height: 40, fontSize: '0.85rem', boxSizing: 'border-box' }}
                        >
                          <option value={2}>🚗 Ô tô</option>
                          <option value={1}>🏍️ Xe máy</option>
                          <option value={3}>🚚 Xe tải</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-heading)' }}>Hãng xe</label>
                        <select
                          className="form-input form-select-custom"
                          value={newBrandCatalogId}
                          onChange={e => {
                            const catId = e.target.value
                            const matched = brandCatalogs.find(c => c.id === catId)
                            setNewBrandCatalogId(catId)
                            setNewBrand(catId === CUSTOM_BRAND_VALUE ? '' : matched?.name ?? '')
                          }}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, height: 40, fontSize: '0.85rem', boxSizing: 'border-box' }}
                        >
                          <option value="">-- Chọn hãng --</option>
                          {brandCatalogs.filter(cat => Number(cat.vehicleType ?? cat.VehicleType) === Number(newType)).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                          <option value={CUSTOM_BRAND_VALUE}>Khác...</option>
                        </select>
                      </div>
                    </div>

                    {newBrandCatalogId === CUSTOM_BRAND_VALUE && (
                      <div className="form-group" style={{ marginBottom: 0, width: '100%', minWidth: 0 }}>
                        <input
                          className="form-input"
                          placeholder="Nhập tên hãng xe khác..."
                          value={newBrand}
                          onChange={e => setNewBrand(e.target.value)}
                          maxLength={50}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, height: 38, fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}

                    {/* 4 & 5. Dòng xe (Model) & Năm sản xuất */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, width: '100%', minWidth: 0 }}>
                      <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-heading)' }}>Dòng xe (Model)</label>
                        <input
                          className="form-input"
                          placeholder="Ví dụ: Camry, SH..."
                          value={newModel}
                          onChange={e => setNewModel(e.target.value)}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, height: 40, fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-heading)' }}>Năm sản xuất</label>
                        <input
                          type="number"
                          min={1950}
                          max={new Date().getFullYear() + 1}
                          className="form-input"
                          placeholder="Ví dụ: 2022"
                          value={newYear}
                          onChange={e => setNewYear(e.target.value)}
                          style={{
                            width: '100%',
                            maxWidth: '100%',
                            minWidth: 0,
                            height: 40,
                            fontSize: '0.85rem',
                            boxSizing: 'border-box',
                            borderColor: newYearError ? '#ef4444' : undefined,
                          }}
                        />
                        {newYearError && (
                          <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <span>⚠️</span> {newYearError}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 6 & 7. Loại động cơ & Kiểu dáng thân xe */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, width: '100%', minWidth: 0 }}>
                      <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-heading)' }}>Động cơ</label>
                        <select
                          className="form-input form-select-custom"
                          value={newEngineCatalogId}
                          onChange={e => {
                            const catId = e.target.value
                            const matched = engineCatalogs.find(c => c.id === catId)
                            setNewEngineCatalogId(catId)
                            setNewEngineType(matched?.legacyEnumValue ?? '')
                          }}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, height: 40, fontSize: '0.85rem', boxSizing: 'border-box' }}
                        >
                          <option value="">-- Động cơ --</option>
                          {engineCatalogs.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-heading)' }}>Kiểu dáng</label>
                        <select
                          className="form-input form-select-custom"
                          value={newBodyStyleCatalogId}
                          onChange={e => {
                            const catId = e.target.value
                            const matched = filteredBodyStyles.find(c => c.id === catId)
                            setNewBodyStyleCatalogId(catId)
                            setNewBodyStyle(matched?.legacyEnumValue ?? '')
                          }}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, height: 40, fontSize: '0.85rem', boxSizing: 'border-box' }}
                        >
                          <option value="">-- Kiểu dáng --</option>
                          {filteredBodyStyles.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 8. Ảnh phương tiện (Tùy chọn) */}
                    <div className="form-group" style={{ marginBottom: 0, width: '100%', minWidth: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-heading)' }}>Ảnh phương tiện (Tùy chọn)</label>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {newImagePreview ? (
                          <div style={{ position: 'relative', width: 52, height: 52, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                            <img src={newImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => { setNewImageFile(null); setNewImagePreview(null) }}
                              style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                            📷
                          </div>
                        )}
                        <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '0 12px' }}>
                          <span>📁 {newImagePreview ? 'Đổi ảnh khác' : 'Tải ảnh phương tiện'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) {
                                setNewImageFile(f)
                                setNewImagePreview(URL.createObjectURL(f))
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking history — inside checkin-panel */}
              <div style={{ borderTop: '1px solid var(--color-border-dim)', paddingTop: 20, marginTop: 24 }}>
                <div className="checkin-panel-title" style={{ marginBottom: 12 }}>Lịch sử giao dịch</div>
                {historyLoading ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Đang tải…</div>
                ) : history.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Khách chưa có giao dịch nào.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {history.map(b => {
                      const st = BOOKING_STATUS_LABEL[b.bookingStatus] ?? { label: 'Không rõ', color: 'var(--color-text-muted)' }
                      return (
                        <div key={b.bookingId} style={{
                          background: 'var(--color-bg-card-2)',
                          border: '1px solid var(--color-border-dim)',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-heading)' }}>
                              {b.bookingCode}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                              {b.slotDate ?? b.createdAtUtc?.substring(0, 10)}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: st.color, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0, background: `${st.color}15`, padding: '4px 8px', borderRadius: 6 }}>
                            {st.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Services + Slot + Footer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
          <div className="checkin-panel" style={{ borderTop: '4px solid var(--color-primary)' }}>
            <div className="service-section-title" style={{ fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800 }}>Gói Dịch Vụ &amp; Dịch Vụ Bổ Sung</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'var(--color-primary-dim)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                {effectiveVehicleType === 1 ? '🏍️ Xe máy' : effectiveVehicleType === 2 ? '🚗 Ô tô' : '🚚 Xe tải'}
              </span>
            </div>

            {servicesLoading ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Đang tải dịch vụ…</div>
            ) : services.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                {branchId ? 'Không có dịch vụ khả dụng.' : 'Hệ thống ngoại tuyến.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* ── Group 1: Main Packages (Required: Pick 1) ── */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-heading)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🌟 1. Gói Dịch Vụ Chính</span>
                      <span style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}>*</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-bg-2)', padding: '2px 8px', borderRadius: 12 }}>
                        {mainServices.length} gói
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: selectedMain ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                      {selectedMain ? `Đã chọn: ${selectedMain.serviceName}` : 'Bắt buộc chọn 1 gói'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 12px 0' }}>
                    Chọn một gói dịch vụ chính (Tiêu chuẩn hoặc Trọn gói combo) trước khi bắt đầu tiếp nhận xe.
                  </p>

                  {mainServices.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: 12, background: 'var(--color-bg-2)', borderRadius: 'var(--radius-md)' }}>
                      Không có gói dịch vụ chính phù hợp cho loại xe này.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                      {mainServices.map(s => {
                        const isSelected = selected.has(s.serviceId)
                        const isPremium = (s.servicePackageType ?? 1) === 3
                        return (
                          <div
                            key={s.serviceId}
                            onClick={() => handleSelectMainService(s)}
                            style={{
                              background: isSelected ? 'var(--color-primary-dim)' : 'var(--color-bg-card-2)',
                              border: isSelected ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border-dim)',
                              borderRadius: 'var(--radius-md)',
                              padding: '12px 14px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              position: 'relative',
                              transition: 'all 0.2s',
                              boxShadow: isSelected ? '0 4px 14px rgba(99,102,241,0.15)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: isPremium ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(59, 130, 246, 0.15)',
                                color: isPremium ? '#ffffff' : '#3b82f6',
                                border: isPremium ? 'none' : '1px solid rgba(59, 130, 246, 0.3)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em'
                              }}>
                                {isPremium ? '⭐ Trọn gói Combo' : '🌟 Gói tiêu chuẩn'}
                              </span>
                              <div style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                border: isSelected ? '6px solid var(--color-primary)' : '2px solid var(--color-border)',
                                background: '#fff',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s'
                              }} />
                            </div>

                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-heading)', lineHeight: 1.3 }}>
                              {s.serviceName}
                            </div>

                            {s.description && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {s.description}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6, borderTop: '1px dashed var(--color-border-dim)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                ⏱️ {s.durationMinutes} phút
                              </span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isSelected ? 'var(--color-primary)' : 'var(--color-heading)' }}>
                                {s.basePrice.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* ── Group 2: Add-on Services (Optional) ── */}
                <div style={{ borderTop: '1px solid var(--color-border-dim)', paddingTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-heading)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>➕ 2. Dịch Vụ Bổ Sung (Add-on)</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-bg-2)', padding: '2px 8px', borderRadius: 12 }}>
                        {addOnServices.length} dịch vụ
                      </span>
                    </div>
                    {selectedAddOns.length > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                        Đã chọn {selectedAddOns.length} dịch vụ cộng thêm
                      </span>
                    )}
                  </div>

                  {!selectedMain ? (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px dashed rgba(245, 158, 11, 0.4)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                      color: '#b45309',
                      fontWeight: 600,
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span>⚠️</span>
                      <span>Vui lòng chọn <strong>Gói Dịch Vụ Chính (ở mục 1)</strong> trước khi chọn dịch vụ bổ sung.</span>
                    </div>
                  ) : isPremiumSelected ? (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px dashed rgba(16, 185, 129, 0.4)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                      color: 'var(--color-success)',
                      fontWeight: 600,
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span>✨</span>
                      <span>Gói <strong>{selectedMain.serviceName}</strong> là gói trọn gói toàn diện đã bao gồm mọi quy trình — không cần chọn thêm dịch vụ bổ sung.</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 12px 0' }}>
                      Có thể chọn một hoặc nhiều dịch vụ cộng thêm dưới đây để thực hiện cùng gói chính:
                    </p>
                  )}

                  {addOnServices.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: 12, background: 'var(--color-bg-2)', borderRadius: 'var(--radius-md)' }}>
                      Không có dịch vụ bổ sung nào cho chi nhánh này.
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
                      gap: 10,
                      opacity: (!selectedMain || isPremiumSelected) ? 0.55 : 1,
                      pointerEvents: isPremiumSelected ? 'none' : 'auto'
                    }}>
                      {addOnServices.map(s => {
                        const isSelected = selected.has(s.serviceId)
                        return (
                          <div
                            key={s.serviceId}
                            onClick={() => handleToggleAddOn(s)}
                            style={{
                              background: isSelected ? 'var(--color-primary-dim)' : 'var(--color-bg-card-2)',
                              border: isSelected ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border-dim)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 12px',
                              cursor: (!selectedMain || isPremiumSelected) ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              position: 'relative',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981'
                              }}>
                                + Bổ sung
                              </span>
                              <div style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                border: isSelected ? 'none' : '1.5px solid var(--color-border)',
                                background: isSelected ? 'var(--color-primary)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 900
                              }}>
                                {isSelected && '✓'}
                              </div>
                            </div>

                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-heading)', lineHeight: 1.3 }}>
                              {s.serviceName}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 4, borderTop: '1px dashed var(--color-border-dim)' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                ⏱️ +{s.durationMinutes}p
                              </span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isSelected ? 'var(--color-primary)' : 'var(--color-heading)' }}>
                                {s.basePrice.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="checkin-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="service-section-title" style={{ marginBottom: 0, fontSize: '1.1rem' }}>Khung Giờ</div>
              <input
                type="date"
                className="form-input"
                value={slotDate}
                onChange={e => handleDateChange(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.9rem', height: 36, width: 'auto', fontWeight: 600 }}
              />
            </div>
            {slotsLoading ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Đang tải khung giờ…</div>
            ) : slots.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                {branchId ? 'Không có khung giờ nào.' : 'Hệ thống ngoại tuyến.'}
              </div>
            ) : (
              <div className="slot-grid">
                {slots.map(s => {
                  const isPast = isSlotInPast(s.slotDate, s.slotStartTime)
                  const isFull = s.availableCount === 0
                  const isDisabled = isPast || isFull
                  return (
                    <button
                      key={s.slotInventoryId}
                      type="button"
                      className={`slot-chip ${slotId === s.slotInventoryId ? 'selected' : ''} ${isFull ? 'full' : ''} ${isPast ? 'past' : ''}`}
                      disabled={isDisabled}
                      onClick={() => setSlotId(s.slotInventoryId)}
                      title={isPast ? 'Đã qua' : isFull ? 'Đã đầy' : `Còn ${s.availableCount} chỗ`}
                    >
                      <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{s.slotStartTime.substring(0, 5)}</span>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        opacity: isPast || isFull ? 0.7 : 1, 
                        marginTop: 2, 
                        fontWeight: 700,
                        color: (slotId === s.slotInventoryId || isPast || isFull) ? 'inherit' : 'var(--color-primary)'
                      }}>
                        {isPast ? 'Đã qua' : isFull ? 'Đã đầy' : `Còn ${s.availableCount} chỗ`}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="checkin-panel">
            <div className="service-section-title" style={{ fontSize: '1.1rem' }}>Mã Giảm Giá</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input
                className="form-input"
                placeholder="Nhập mã giảm giá..."
                value={voucherCode}
                onChange={e => setVoucherCode(e.target.value)}
                style={{ flex: 1, textTransform: 'uppercase', height: 42 }}
              />
              {voucherCode && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setVoucherCode('')}
                  style={{ padding: '0 16px', height: 42 }}
                >
                  Xoá
                </button>
              )}
            </div>

            {customerVouchers.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 700 }}>Voucher của khách</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {customerVouchers.map(uv => {
                    const discountDesc = uv.discountType === 1
                      ? `Giảm ${uv.discountValue}%`
                      : `Giảm ${uv.discountValue.toLocaleString('vi-VN')}đ`
                    return (
                      <div
                        key={uv.userVoucherId}
                        onClick={() => setVoucherCode(uv.voucherCode)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: voucherCode.toUpperCase() === uv.voucherCode.toUpperCase() ? 'var(--color-primary-dim)' : 'var(--color-bg-card-2)',
                          border: voucherCode.toUpperCase() === uv.voucherCode.toUpperCase() ? '2px solid var(--color-primary)' : '1px solid var(--color-border-dim)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, color: voucherCode.toUpperCase() === uv.voucherCode.toUpperCase() ? 'var(--color-primary)' : 'var(--color-heading)', fontSize: '0.9rem' }}>{uv.voucherCode}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {uv.title}
                          </div>
                        </div>
                        <span style={{
                          background: 'var(--color-success)',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {discountDesc}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="staff-alert staff-alert--error">
              <span>{error}</span>
              <button className="staff-alert-close" onClick={() => setError('')}>✕</button>
            </div>
          )}

          {/* Selected Summary Card */}
          <div className="checkin-panel" style={{ background: 'var(--color-bg-card-2)', border: '1.5px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-heading)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              📋 Tóm tắt dịch vụ đã chọn
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Gói chính:</span>
                <span style={{ fontWeight: 700, color: selectedMain ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                  {selectedMain ? `${selectedMain.serviceName} (${selectedMain.basePrice.toLocaleString('vi-VN')}đ)` : 'Chưa chọn'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Dịch vụ bổ sung ({selectedAddOns.length}):</span>
                <span style={{ fontWeight: 600, color: selectedAddOns.length > 0 ? 'var(--color-heading)' : 'var(--color-text-muted)', textAlign: 'right', maxWidth: '60%' }}>
                  {selectedAddOns.length > 0 
                    ? selectedAddOns.map(a => a.serviceName).join(', ')
                    : isPremiumSelected ? 'Đã trọn gói' : 'Không có'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border-dim)', paddingTop: 6, marginTop: 2 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Thời gian dự kiến:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-heading)' }}>
                  ⏱️ {totalDuration} phút
                </span>
              </div>
            </div>
          </div>

          <div className="checkin-footer" style={{ background: 'var(--color-primary-dim)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <div className="checkin-total-label" style={{ color: 'var(--color-heading)' }}>Tổng thanh toán</div>
              <div className="checkin-total-amount" style={{ color: 'var(--color-primary)' }}>
                {total.toLocaleString('vi-VN')}đ
              </div>
            </div>
            <button
              className="btn btn-premium-glow"
              disabled={submitting || !customer || !selectedMain || !slotId}
              onClick={handleConfirm}
              style={{ minWidth: 180, height: 48, fontSize: '1.05rem' }}
            >
              {submitting ? 'Đang xử lý…' : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Tạo Đơn Ngay
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
