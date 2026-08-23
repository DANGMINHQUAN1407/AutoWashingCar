import { useState, useEffect } from 'react'
import * as api from '../../services/api'
import type { BranchService } from '../../types/branch'
import type { Slot } from '../../types/slot'
import type { Booking } from '../../types/booking'
import { formatLicensePlateInput, getLicensePlateError, licensePlatePlaceholder } from '../../utils/licensePlate'
import './Staff.css'

const CUSTOM_BRAND_VALUE = '__custom__'

const BOOKING_STATUS_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Pending', color: 'var(--color-text-muted)' },
  2: { label: 'Confirmed', color: '#3b82f6' },
  3: { label: 'Checked In', color: '#6366f1' },
  4: { label: 'In Progress', color: '#f59e0b' },
  5: { label: 'Completed', color: 'var(--color-success)' },
  6: { label: 'Closed', color: 'var(--color-text-dim)' },
  7: { label: 'Cancelled', color: 'var(--color-danger)' },
}

const VEHICLE_TYPES: Record<number, string> = { 1: 'Motorbike', 2: 'Car', 3: 'Truck' }

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
  const [brandCatalogs, setBrandCatalogs] = useState<any[]>([])

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
          .then(res => setBrandCatalogs(res.items || []))
          .catch(() => setBrandCatalogs([]))

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
    } catch {
      setError('Customer lookup failed. Check your connection.')
    }
    setSearchDone(true)
    setSearching(false)
  }

  const handleContinueAsGuest = async () => {
    if (!guestName.trim()) return
    setGuestRegistering(true)
    setError('')
    try {
      const result = await api.registerWalkInCustomer({
        FullName: guestName.trim(),
        PhoneNumber: phone.trim() || undefined,
      })
      applyCustomer(result as CustomerInfo)
    } catch (e: any) {
      setError(e?.message || 'Failed to create guest account.')
    }
    setGuestRegistering(false)
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

  const toggleService = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const total = services.filter(s => selected.has(s.serviceId)).reduce((sum, s) => sum + s.basePrice, 0)

  const handleConfirm = async () => {
    if (!customer) { setError('Search for a customer first.'); return }
    if (!slotId) { setError('Please select a time slot.'); return }
    if (selected.size === 0) { setError('Please select at least one service.'); return }
    if (!addNew && !selectedVehicleId) { setError('Please select or add a vehicle.'); return }
    if (addNew && !newPlate.trim()) { setError('Enter the vehicle license plate.'); return }
    if (addNew) {
      const plateError = getLicensePlateError(newPlate, newType)
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
        NewVehicle: addNew ? { LicensePlate: formatLicensePlateInput(newPlate, newType), VehicleType: newType, Brand: newBrand || undefined, BrandCatalogId: newBrandCatalogId && newBrandCatalogId !== CUSTOM_BRAND_VALUE ? newBrandCatalogId : undefined } : undefined,
        VoucherCode: voucherCode.trim() || undefined,
      })
      setSuccess(`Walk-in booking ${booking.bookingCode} created — vehicle added to queue!`)
      setCustomer(null)
      setPhone('')
      setSelected(new Set())
      setSlotId('')
      setAddNew(false)
      setNewPlate('')
      setNewBrand('')
      setNewBrandCatalogId('')
      setVoucherCode('')
      setCustomerVouchers([])
      setSearchDone(false)
      setHistory([])
      // Reload slots so availability is fresh
      if (branchId) {
        api.getAvailableSlots(branchId, slotDate).then(setSlots).catch(() => { })
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to create booking.')
    }
    setSubmitting(false)
  }

  return (
    <div className="portal-page">
      <div className="ops-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'var(--color-primary)', opacity: 0.1, filter: 'blur(50px)', borderRadius: '50%' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>Walk-In Booking</h2>
          <p>Tìm kiếm khách hàng và đăng ký dịch vụ trực tiếp tại cửa hàng.</p>
        </div>
      </div>

      {success && (
        <div className="staff-alert staff-alert--success">
          <span>{success}</span>
          <button className="staff-alert-close" onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      <div className="checkin-layout">
        {/* ── Left: Customer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="Nhập tên khách *"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleContinueAsGuest()}
                      autoFocus
                      style={{ flex: 1, height: 42, fontSize: '0.95rem' }}
                    />
                    <button
                      className="btn btn-primary"
                      disabled={!guestName.trim() || guestRegistering}
                      onClick={handleContinueAsGuest}
                      style={{ height: 42, padding: '0 20px', whiteSpace: 'nowrap' }}
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
                <div className="new-vehicle-form" style={{ marginTop: 16, background: 'linear-gradient(to right bottom, rgba(99,102,241,0.04), rgba(99,102,241,0.08))', padding: '20px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99,102,241,0.2)', boxShadow: 'inset 0 2px 10px rgba(99,102,241,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--color-primary)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Đăng ký xe mới</span>
                  </div>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label" style={{ color: 'var(--color-heading)' }}>Biển số xe <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input className="form-input" placeholder={licensePlatePlaceholder(newType)} value={newPlate} onCompositionStart={() => setIsNewPlateComposing(true)} onCompositionEnd={e => { const value = e.currentTarget.value; setIsNewPlateComposing(false); setNewPlate(formatLicensePlateInput(value, newType)) }} onChange={e => { const value = e.currentTarget.value; setNewPlate(isNewPlateComposing ? value : formatLicensePlateInput(value, newType)) }} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: 42 }} />
                  </div>
                  <div className="form-row-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'var(--color-heading)' }}>Loại xe</label>
                      <select className="form-input" value={newType} onChange={e => { const nextType = Number(e.target.value); setNewType(nextType); setNewPlate(prev => formatLicensePlateInput(prev, nextType)); setNewBrandCatalogId(''); setNewBrand('') }} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: 42 }}>
                        <option value={1}>Xe máy</option>
                        <option value={2}>Ô tô</option>
                        <option value={3}>Xe tải</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'var(--color-heading)' }}>Hãng xe</label>
                      <select
                        className="form-input"
                        value={newBrandCatalogId}
                        onChange={e => {
                          const catId = e.target.value
                          const matched = brandCatalogs.find(c => c.id === catId)
                          setNewBrandCatalogId(catId)
                          setNewBrand(catId === CUSTOM_BRAND_VALUE ? '' : matched?.name ?? '')
                        }}
                        style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: 42 }}
                      >
                        <option value="">-- Chọn hãng xe --</option>
                        {brandCatalogs.filter(cat => Number(cat.vehicleType ?? cat.VehicleType) === Number(newType)).map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                        <option value={CUSTOM_BRAND_VALUE}>Khác</option>
                      </select>
                      {newBrandCatalogId === CUSTOM_BRAND_VALUE && (
                        <input
                          className="form-input"
                          placeholder="Nhập hãng xe"
                          value={newBrand}
                          onChange={e => setNewBrand(e.target.value)}
                          maxLength={50}
                          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: 42, marginTop: 8 }}
                        />
                      )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="checkin-panel" style={{ borderTop: '4px solid var(--color-primary)' }}>
            <div className="service-section-title" style={{ fontSize: '1.1rem' }}>Gói Dịch Vụ</div>
            {servicesLoading ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Đang tải dịch vụ…</div>
            ) : services.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                {branchId ? 'Không có dịch vụ khả dụng.' : 'Hệ thống ngoại tuyến.'}
              </div>
            ) : (
              <div className="service-grid">
                {services.map(s => (
                  <div
                    key={s.serviceId}
                    className={`service-item ${selected.has(s.serviceId) ? 'selected' : ''}`}
                    onClick={() => toggleService(s.serviceId)}
                    style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)' }}
                  >
                    <div className="service-item-check" style={{ width: 22, height: 22, borderRadius: 6 }}>
                      {selected.has(s.serviceId) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="service-item-name" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.serviceName}</div>
                    <div className="service-item-price" style={{ fontSize: '0.9rem' }}>
                      {s.basePrice.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="service-item-dur" style={{ fontSize: '0.75rem' }}>{s.durationMinutes} phút</div>
                  </div>
                ))}
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

          <div className="checkin-footer" style={{ background: 'var(--color-primary-dim)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <div className="checkin-total-label" style={{ color: 'var(--color-heading)' }}>Tổng dự kiến</div>
              <div className="checkin-total-amount" style={{ color: 'var(--color-primary)' }}>
                {total.toLocaleString('vi-VN')}đ
              </div>
            </div>
            <button
              className="btn btn-premium-glow"
              disabled={submitting || !customer || selected.size === 0 || !slotId}
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
