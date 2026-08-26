import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api'
import { QRCodeSVG } from 'qrcode.react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import type { Booking, BookingLine } from '../../types/booking'
import type { BranchService } from '../../types/branch'
import './Staff.css'

const BS = { Confirmed: 2, CheckedIn: 3, InProgress: 4, Completed: 5, Closed: 6 }

const PAYMENT_METHODS = [
  { value: 1, label: 'Cash' },
  { value: 2, label: 'Card / POS' },
  { value: 3, label: 'VNPay Wallet' },
]

function fmt(t?: string) { return t ? t.substring(0, 5) : '--:--' }

function serviceNames(b: Booking) {
  if (b.lines?.length) return b.lines.map(l => l.serviceName).join(', ')
  if (b.serviceSummary) return b.serviceSummary
  return b.bookingType === 2 ? 'Walk-in' : 'Online booking'
}

// ── Check-In by Code Modal ──────────────────────────────────────
interface CheckInModalProps {
  queue: Booking[]
  onClose: () => void
  onSuccess: () => void
}

function CheckInModal({ queue, onClose, onSuccess }: CheckInModalProps) {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<Booking | null>(null)
  const [findError, setFindError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [scanMode, setScanMode] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleFind = useCallback(async (overrideCode?: string) => {
    const query = typeof overrideCode === 'string' ? overrideCode.trim() : code.trim()
    if (!query) return
    if (typeof overrideCode === 'string') setCode(query)
    setFindError('')
    setPreview(null)
    const found = queue.find(b => b.bookingCode?.toLowerCase() === query.toLowerCase())
    if (found) { setPreview(found); return }
    try {
      const booking = await api.lookupBookingByQr(query)
      if (booking?.bookingId) { setPreview(booking); return }
    } catch { }
    setFindError(`Không tìm thấy đơn đặt nào cho "${query}".`)
  }, [code, queue])

  useEffect(() => {
    if (scanMode && !preview) {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          'qr-reader-checkin',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        )
        scannerRef.current.render(
          (decodedText) => {
            scannerRef.current?.clear().catch(() => {})
            scannerRef.current = null
            setScanMode(false)
            handleFind(decodedText)
          },
          () => { /* ignore */ }
        )
      }
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [scanMode, preview, handleFind])

  const handleConfirm = async () => {
    if (!preview) return
    setConfirming(true)
    setConfirmError('')
    try {
      await api.checkInBookingByCode({ BookingCode: preview.bookingCode })
      onSuccess()
      onClose()
    } catch (e: any) {
      setConfirmError(e?.message || 'Check-in thất bại.')
    }
    setConfirming(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Check-In bằng Mã đặt lịch</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: scanMode ? 12 : 0 }}>
            <input ref={inputRef} className="form-input" placeholder="Nhập mã đặt lịch hoặc mã QR…"
              value={code}
              disabled={scanMode}
              onChange={e => { setCode(e.target.value); setPreview(null); setFindError('') }}
              onKeyDown={e => e.key === 'Enter' && handleFind()}
              style={{ flex: 1 }} />
            {!scanMode ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setScanMode(true)} style={{ flexShrink: 0, padding: '0 12px' }} title="Bật Camera Quét QR">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setScanMode(false)} style={{ flexShrink: 0, color: 'var(--color-danger)' }} title="Tắt Camera">
                ✕ Hủy
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => handleFind()} disabled={scanMode} style={{ flexShrink: 0 }}>Tìm kiếm</button>
          </div>
          
          {scanMode && (
            <div className="qr-scanner-container">
              <div id="qr-reader-checkin" style={{ width: '100%', minHeight: 250 }}></div>
            </div>
          )}

          {findError && <div className="staff-alert staff-alert--error" style={{ padding: '10px 14px', marginTop: 12 }}>{findError}</div>}
          
          {preview && (
            <div className="checkin-preview-card" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="checkin-preview-plate">{preview.licensePlate || preview.bookingCode}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 700 }}>ĐÃ TÌM THẤY</span>
              </div>
              {preview.customerName && <div className="checkin-preview-row"><span>Khách hàng</span><strong>{preview.customerName}</strong></div>}
              <div className="checkin-preview-row"><span>Dịch vụ</span><strong>{serviceNames(preview)}</strong></div>
              <div className="checkin-preview-row"><span>Thời gian</span><strong>{preview.slotDate} {fmt(preview.slotStartTime)}</strong></div>
              <div className="checkin-preview-row"><span>Số tiền</span><strong>{preview.bookingFinalAmount.toLocaleString('vi-VN')}đ</strong></div>
            </div>
          )}
          {confirmError && <div className="staff-alert staff-alert--error" style={{ padding: '10px 14px', marginTop: 12 }}>{confirmError}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Đóng</button>
          <button className="btn btn-primary btn-sm" disabled={!preview || confirming} onClick={handleConfirm}>
            {confirming ? 'Đang xử lý…' : 'Xác nhận Check-In'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cancel Booking Modal ─────────────────────────────────────────
interface CancelModalProps {
  booking: Booking
  onClose: () => void
  onSuccess: () => void
}

function CancelModal({ booking, onClose, onSuccess }: CancelModalProps) {
  const [reason, setReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    setCancelling(true)
    setError('')
    try {
      await api.cancelBooking(booking.bookingId, reason || 'Hủy bởi nhân viên')
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Hủy lịch hẹn thất bại.')
    }
    setCancelling(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Hủy lịch hẹn</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
            Bạn có chắc muốn hủy lịch hẹn <strong>{booking.bookingCode}</strong>
            {booking.licensePlate && <> — <strong>{booking.licensePlate}</strong></>}?
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Lý do hủy (tùy chọn)</label>
            <input className="form-input" placeholder="Khách không đến, đặt nhầm…"
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          {error && <div className="staff-alert staff-alert--error" style={{ padding: '10px 14px' }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Quay lại</button>
          <button className="btn btn-sm" style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: '#fff' }}
            disabled={cancelling} onClick={handleCancel}>
            {cancelling ? 'Đang hủy…' : 'Xác nhận hủy'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Service Line Modal ───────────────────────────────────────────
interface ServiceLineModalProps {
  booking: Booking
  onClose: () => void
  onSuccess: () => void
}

function ServiceLineModal({ booking: initialBooking, onClose, onSuccess }: ServiceLineModalProps) {
  const [booking, setBooking] = useState<Booking>(initialBooking)
  const [services, setServices] = useState<BranchService[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(true)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const branchId = initialBooking.branchId

    // Fetch full booking to get actual lines (queue returns BookingListItemDto without lines)
    api.getBookingById(initialBooking.bookingId)
      .then(full => setBooking(full))
      .catch(() => { })
      .finally(() => setBookingLoading(false))

    // Load services for the booking's branch first; fall back to the staff branch if needed.
    const loadServices = branchId
      ? api.getBranchServices(branchId)
      : api.getMyBranch().then(b => b.branchId ? api.getBranchServices(b.branchId) : Promise.resolve([]))

    loadServices
      .then(list => {
        const active = list.filter(s => s.isActive)
        setServices(active)
        if (active.length) setSelectedServiceId(active[0].serviceId)
      })
      .catch(() => { })
      .finally(() => setServicesLoading(false))
  }, [])

  const bookingVehicleType = (booking as any)?.vehicle?.vehicleType ?? (booking as any)?.vehicleType ?? (initialBooking as any)?.vehicleType ?? null

  const existingServiceIds = new Set(
    (booking.lines ?? []).map(l => l.serviceCatalogItemId || (l as any).serviceId)
  )

  const hasStandard = (booking.lines ?? []).some(l => {
    const s = services.find(srv => srv.serviceId === (l.serviceCatalogItemId || (l as any).serviceId))
    return s?.servicePackageType === 1
  })

  const hasPremium = (booking.lines ?? []).some(l => {
    const s = services.find(srv => srv.serviceId === (l.serviceCatalogItemId || (l as any).serviceId))
    return s?.servicePackageType === 3
  })

  const applicableServices = services.filter(s => {
    // 1. Không hiển thị dịch vụ đã có trong đơn (tránh trùng lặp)
    if (existingServiceIds.has(s.serviceId)) return false
    // 2. Không hiển thị dịch vụ khác loại xe
    if (bookingVehicleType && s.vehicleType && s.vehicleType !== bookingVehicleType) return false
    // 3. Nếu đơn đã có gói Premium (3) -> không thêm được bất kỳ dịch vụ nào khác
    if (hasPremium) return false
    // 4. Nếu đơn đã có gói Standard (1) -> không thêm được gói Standard (1) hoặc Premium (3) khác (chỉ thêm được Add-on = 2)
    if (hasStandard && (s.servicePackageType === 1 || s.servicePackageType === 3)) return false
    return true
  })

  useEffect(() => {
    if (applicableServices.length > 0) {
      if (!applicableServices.some(s => s.serviceId === selectedServiceId)) {
        setSelectedServiceId(applicableServices[0].serviceId)
      }
    } else {
      setSelectedServiceId('')
    }
  }, [applicableServices, selectedServiceId])

  const handleAdd = async () => {
    if (!selectedServiceId) return
    const targetService = services.find(s => s.serviceId === selectedServiceId)
    if (targetService?.vehicleType && bookingVehicleType && targetService.vehicleType !== bookingVehicleType) {
      const vName = targetService.vehicleType === 1 ? 'Xe máy' : targetService.vehicleType === 2 ? 'Ô tô' : 'Xe tải'
      const curVName = bookingVehicleType === 1 ? 'Xe máy' : bookingVehicleType === 2 ? 'Ô tô' : 'Xe tải'
      setError(`Dịch vụ '${targetService.serviceName}' chỉ dành cho ${vName}, không thể áp dụng cho đơn ${curVName}.`)
      return
    }

    if (targetService?.servicePackageType === 1 && hasStandard) {
      setError('Mỗi đơn hàng chỉ được chọn 1 gói rửa chính (Standard).')
      return
    }

    if ((targetService?.servicePackageType === 3 && (hasStandard || hasPremium)) || hasPremium) {
      setError('Gói Premium là gói toàn diện, không thể kết hợp với các gói khác.')
      return
    }

    setAdding(true)
    setError('')
    try {
      const updated = await api.addServiceLine(booking.bookingId, {
        ServiceCatalogItemId: selectedServiceId,
        Quantity: qty,
      })
      setBooking(updated)
      onSuccess()
    } catch (e: any) {
      setError(e?.message || 'Không thể thêm dịch vụ.')
    }
    setAdding(false)
  }

  const handleRemove = async (line: BookingLine) => {
    setRemoving(line.bookingLineId)
    setError('')
    try {
      const updated = await api.removeServiceLine(booking.bookingId, line.bookingLineId)
      setBooking(updated)
      onSuccess()
    } catch (e: any) {
      setError(e?.message || 'Không thể xoá dịch vụ.')
    }
    setRemoving(null)
  }

  const lines = booking.lines ?? []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </span>
            <div>
              <h3 style={{ marginBottom: 2, fontSize: '1.15rem' }}>Quản lý dịch vụ</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'Courier New, monospace', fontWeight: 600 }}>
                  {booking.licensePlate || booking.bookingCode}
                </span>
                {bookingVehicleType && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    background: bookingVehicleType === 1 ? 'rgba(59, 130, 246, 0.12)' : bookingVehicleType === 2 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    color: bookingVehicleType === 1 ? '#2563eb' : bookingVehicleType === 2 ? '#059669' : '#d97706',
                  }}>
                    {bookingVehicleType === 1 ? '🏍️ Xe máy' : bookingVehicleType === 2 ? '🚗 Ô tô' : '🚚 Xe tải'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Current lines */}
          <div className="bdetail-section">
            <div className="bdetail-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h7" /></svg>
              Dịch vụ hiện tại
            </div>
            {bookingLoading ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', padding: '10px 0' }}>Đang tải…</div>
            ) : lines.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', padding: '10px 0' }}>Chưa có dịch vụ nào.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                {lines.map((line, idx) => (
                  <div key={line.bookingLineId} className="bdetail-row" style={{ padding: '8px 0', borderBottom: idx === lines.length - 1 ? 'none' : '1px dashed var(--color-border-dim)' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 600 }}>{line.serviceName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 8, background: 'var(--color-bg-2)', padding: '2px 6px', borderRadius: 4 }}>× {line.quantity}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-heading)', fontWeight: 700 }}>
                        {line.lineTotal.toLocaleString('vi-VN')}đ
                      </span>
                      <button
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: lines.length <= 1 ? 0.3 : 1, transition: 'background 0.2s' }}
                        disabled={lines.length <= 1 || removing === line.bookingLineId}
                        onClick={() => handleRemove(line)}
                        title={lines.length <= 1 ? "Không thể xoá dịch vụ cuối cùng" : "Xoá"}
                      >
                        {removing === line.bookingLineId ? '…' : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add service */}
          <div className="bdetail-section">
            <div className="bdetail-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Thêm dịch vụ phù hợp ({applicableServices.length})
            </div>
            {servicesLoading ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Đang tải danh sách dịch vụ…</div>
            ) : applicableServices.length === 0 ? (
              <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', padding: '16px 0', textAlign: 'center' }}>
                ✅ Đã thêm đầy đủ tất cả các dịch vụ khả dụng cho đơn này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
                {/* List of services */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', paddingRight: 4, margin: '0 -4px', padding: '4px' }}>
                  {applicableServices.map(s => {
                    const isSelected = selectedServiceId === s.serviceId;
                    return (
                      <div
                        key={s.serviceId}
                        onClick={() => setSelectedServiceId(s.serviceId)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px', borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border-dim)',
                          background: isSelected ? 'var(--color-primary-dim)' : 'var(--color-bg-card)',
                          cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.15)' : 'var(--shadow-sm)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--color-primary)' : 'var(--color-heading)' }}>
                            {s.serviceName}
                          </span>
                          {s.vehicleType && (
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: s.vehicleType === 1 ? 'rgba(59, 130, 246, 0.12)' : s.vehicleType === 2 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: s.vehicleType === 1 ? '#2563eb' : s.vehicleType === 2 ? '#059669' : '#d97706',
                            }}>
                              {s.vehicleType === 1 ? '🏍️ Xe máy' : s.vehicleType === 2 ? '🚗 Ô tô' : '🚚 Xe tải'}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                          {s.basePrice.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border-dim)', paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-2)', borderRadius: 'var(--radius-md)', padding: 4, border: '1px solid var(--color-border)', height: 42, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                    <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'var(--color-bg)', cursor: 'pointer', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', boxShadow: 'var(--shadow-sm)', opacity: qty <= 1 ? 0.5 : 1 }} disabled={qty <= 1}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <span style={{ width: 40, textAlign: 'center', fontSize: '1rem', fontWeight: 700, color: 'var(--color-heading)' }}>{qty}</span>
                    <button onClick={() => setQty(Math.min(50, qty + 1))} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'var(--color-bg)', cursor: 'pointer', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', boxShadow: 'var(--shadow-sm)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                  </div>

                  <button className="btn btn-premium-glow btn-sm" onClick={handleAdd} disabled={adding} style={{ flexShrink: 0, height: 42, padding: '0 24px', fontSize: '0.95rem' }}>
                    {adding ? 'Đang thêm…' : 'Thêm vào đơn'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <div className="staff-alert staff-alert--error" style={{ padding: '10px 14px' }}>{error}</div>}

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary-dim)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-dim)', marginTop: 4 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-heading)' }}>Tổng cộng</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {booking.bookingFinalAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>
        <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border-dim)', padding: '16px 24px' }}>
          <button className="btn btn-primary btn-lg" onClick={onClose} style={{ width: '100%', padding: '14px 0', fontSize: '1.05rem' }}>Hoàn tất</button>
        </div>
      </div>
    </div>
  )
}

// ── Complete + Payment Modal ─────────────────────────────────────
interface CompletePaymentModalProps {
  booking: Booking
  onClose: () => void
  onSuccess: () => void
  initialQr?: { paymentId: string; paymentUrl: string } | null
}

function CompletePaymentModal({ booking, onClose, onSuccess, initialQr }: CompletePaymentModalProps) {
  const remaining = booking.bookingFinalAmount - (booking.depositAmount ?? 0)

  type TenderRow = { method: number; amount: string }
  const [tenders, setTenders] = useState<TenderRow[]>([{ method: 1, amount: String(remaining) }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // VNPay QR tại quầy (khôi phục từ phiên trước nếu có)
  const [payMode, setPayMode] = useState<'counter' | 'vnpay'>(initialQr ? 'vnpay' : 'counter')
  const [qr, setQr] = useState<{ paymentId: string; paymentUrl: string } | null>(initialQr ?? null)
  const [qrLoading, setQrLoading] = useState(false)
  const [payStatus, setPayStatus] = useState<number | null>(initialQr ? 1 : null) // 1=Pending 2=Completed 3=Failed
  const [checking, setChecking] = useState(false)

  const tenderSum = tenders.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  const isValid = remaining === 0
    ? true
    : (Math.abs(tenderSum - remaining) < 0.01 && tenders.every(t => (parseFloat(t.amount) || 0) > 0))

  const setTenderField = (i: number, field: keyof TenderRow, val: string | number) => {
    setTenders(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t))
  }

  const handleSubmit = async () => {
    if (!isValid) { setError(`Tổng tiền phải đúng bằng số còn lại: ${remaining.toLocaleString('vi-VN')}đ`); return }
    setSubmitting(true)
    setError('')
    try {
      if (booking.bookingStatus !== BS.Completed) {
        await api.completeBooking(booking.bookingId)
      }
      if (remaining > 0) {
        await api.createFinalPayment({
          BookingId: booking.bookingId,
          Tenders: tenders.map(t => ({ TenderType: t.method, Amount: parseFloat(t.amount) })),
        })
      } else {
        await api.closeBooking(booking.bookingId)
      }
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Thao tác thất bại.')
    }
    setSubmitting(false)
  }

  const handleGenerateQr = async () => {
    setQrLoading(true); setError('')
    try {
      const r = await api.createCounterQr(booking.bookingId)
      const info = { paymentId: r.paymentId, paymentUrl: r.paymentUrl }
      setQr(info)
      setPayStatus(1)
      try { localStorage.setItem('wc_counterqr', JSON.stringify({ bookingId: booking.bookingId, ...info })) } catch { /* ignore */ }
    } catch (e: any) { setError(e?.message || 'Tạo mã QR thất bại.') }
    setQrLoading(false)
  }

  const handleCheckStatus = async () => {
    if (!qr) return
    setChecking(true); setError('')
    try {
      const s = await api.getPaymentStatus(qr.paymentId)
      setPayStatus(s.paymentStatus)
    } catch (e: any) { setError(e?.message || 'Không tải được trạng thái.') }
    setChecking(false)
  }

  const handleAcceptClose = async () => {
    setSubmitting(true); setError('')
    try {
      let updatedBooking = booking;
      if (booking.bookingStatus !== BS.Completed && booking.bookingStatus !== BS.Closed) {
        updatedBooking = await api.completeBooking(booking.bookingId)
      }
      if (updatedBooking.bookingStatus !== BS.Closed) {
        await api.closeBooking(booking.bookingId)
      }
      try { localStorage.removeItem('wc_counterqr') } catch { /* ignore */ }
      onSuccess()
      onClose()
    } catch (e: any) { setError(e?.message || 'Đóng đơn thất bại.') }
    setSubmitting(false)
  }

  // Tự động kiểm tra trạng thái thanh toán mỗi 3s khi đã hiện QR (không cần bấm reload)
  useEffect(() => {
    if (!qr || payStatus === 2) return
    const id = setInterval(async () => {
      try {
        const s = await api.getPaymentStatus(qr.paymentId)
        setPayStatus(s.paymentStatus)
      } catch { /* bỏ qua lỗi mạng tạm thời */ }
    }, 3000)
    return () => clearInterval(id)
  }, [qr, payStatus])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Hoàn thành & Thu tiền</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Booking summary */}
          <div style={{ background: 'var(--color-bg-card-2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', border: '1px solid var(--color-border-dim)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Xe</span>
              <strong>{booking.licensePlate || booking.bookingCode}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Tổng đơn</span>
              <strong>{booking.bookingFinalAmount.toLocaleString('vi-VN')}đ</strong>
            </div>
            {(booking.depositAmount ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Đã cọc</span>
                <span style={{ color: 'var(--color-success)' }}>-{(booking.depositAmount ?? 0).toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderTop: '1px solid var(--color-border-dim)', paddingTop: 6 }}>
              <span style={{ fontWeight: 700 }}>Còn lại phải thu</span>
              <strong style={{ color: 'var(--color-heading)', fontSize: '1rem' }}>{remaining.toLocaleString('vi-VN')}đ</strong>
            </div>
          </div>

          {remaining <= 0 ? (
            <div style={{ textAlign: 'center', fontSize: '0.95rem', color: 'var(--color-success)', padding: '20px 10px', fontWeight: 600, background: 'var(--color-bg-card-2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-success)', marginTop: 12 }}>
              🎉 Khách hàng đã thanh toán đủ 100% online qua VNPay. Không cần thu thêm tiền tại quầy.
            </div>
          ) : (
            <>
              {/* Chọn hình thức thu tiền */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1, background: payMode === 'counter' ? 'var(--color-primary)' : 'transparent', color: payMode === 'counter' ? '#fff' : 'var(--color-text-muted)', border: '1px solid var(--color-border-dim)' }}
                  onClick={() => setPayMode('counter')}
                >Tiền mặt / Thẻ</button>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1, background: payMode === 'vnpay' ? 'var(--color-primary)' : 'transparent', color: payMode === 'vnpay' ? '#fff' : 'var(--color-text-muted)', border: '1px solid var(--color-border-dim)' }}
                  onClick={() => setPayMode('vnpay')}
                >VNPay (QR)</button>
              </div>

              {/* Tender rows */}
              {payMode === 'counter' && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    Phương thức thanh toán
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tenders.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                          className="form-input"
                          value={t.method}
                          onChange={e => setTenderField(i, 'method', Number(e.target.value))}
                          style={{ flex: 1 }}
                        >
                          {PAYMENT_METHODS.filter(m => m.value !== 3).map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          className="form-input"
                          min={0}
                          value={t.amount}
                          onChange={e => setTenderField(i, 'amount', e.target.value)}
                          style={{ width: 110, flexShrink: 0 }}
                        />
                        {tenders.length > 1 && (
                          <button
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
                            onClick={() => setTenders(prev => prev.filter((_, idx) => idx !== i))}
                          >✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {tenders.length < 3 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 8, fontSize: '0.75rem' }}
                      onClick={() => setTenders(prev => [...prev, { method: 1, amount: String(Math.max(0, remaining - prev.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0))) }])}
                    >
                      + Thêm phương thức
                    </button>
                  )}
                  {tenders.length > 1 && (
                    <div style={{ marginTop: 6, fontSize: '0.8rem', color: Math.abs(tenderSum - remaining) < 0.01 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                      Tổng: {tenderSum.toLocaleString('vi-VN')}đ {Math.abs(tenderSum - remaining) < 0.01 ? '✓' : `(còn thiếu ${(remaining - tenderSum).toLocaleString('vi-VN')}đ)`}
                    </div>
                  )}
                </div>
              )}

              {payMode === 'vnpay' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  {!qr ? (
                    <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>
                      Tạo mã QR để khách quét thanh toán <strong>{remaining.toLocaleString('vi-VN')}đ</strong> qua VNPay.
                    </div>
                  ) : (
                    <>
                      <div style={{ background: '#fff', padding: 12, borderRadius: 'var(--radius-md)' }}>
                        <QRCodeSVG value={qr.paymentUrl} size={196} level="M" />
                      </div>
                      <a href={qr.paymentUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                        Mở link thanh toán (test)
                      </a>
                      {payStatus === 2 ? (
                        <div style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓ Khách đã thanh toán thành công</div>
                      ) : payStatus === 3 ? (
                        <div style={{ color: 'var(--color-danger)', fontWeight: 700 }}>✗ Thanh toán thất bại — tạo lại QR</div>
                      ) : (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>⏳ Đang chờ khách quét &amp; thanh toán… (tự động kiểm tra mỗi 3 giây)</div>
                      )}
                      {payStatus !== 2 && (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} disabled={qrLoading} onClick={handleGenerateQr}>
                          {qrLoading ? 'Đang tạo…' : '🔄 Tạo lại mã QR (nếu quá hạn)'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {error && <div className="staff-alert staff-alert--error" style={{ padding: '10px 14px' }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Huỷ</button>
          {remaining <= 0 ? (
            <button
              className="btn btn-primary btn-sm"
              style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
              disabled={submitting}
              onClick={handleAcceptClose}
            >
              {submitting ? 'Đang xử lý…' : 'Xác nhận & Hoàn thành'}
            </button>
          ) : payMode === 'counter' ? (
            <button
              className="btn btn-primary btn-sm"
              style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
              disabled={submitting || !isValid}
              onClick={handleSubmit}
            >
              {submitting ? 'Đang xử lý…' : 'Xác nhận & Hoàn tất'}
            </button>
          ) : !qr ? (
            <button className="btn btn-primary btn-sm" disabled={qrLoading} onClick={handleGenerateQr}>
              {qrLoading ? 'Đang tạo…' : 'Tạo mã QR VNPay'}
            </button>
          ) : payStatus === 2 ? (
            <button
              className="btn btn-primary btn-sm"
              style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
              disabled={submitting}
              onClick={handleAcceptClose}
            >
              {submitting ? 'Đang đóng…' : 'Xác nhận & đóng đơn'}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" disabled={checking} onClick={handleCheckStatus}>
              {checking ? 'Đang kiểm tra…' : 'Tải lại trạng thái'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Booking Detail Modal ─────────────────────────────────────────
interface BookingDetailModalProps {
  booking: Booking
  onClose: () => void
}

const STATUS_LABELS: Record<number, string> = {
  1: 'Chờ xử lý', 2: 'Đã xác nhận', 3: 'Đã Check-in',
  4: 'Đang rửa', 5: 'Hoàn thành', 6: 'Đã đóng', 7: 'Đã hủy', 8: 'Vắng mặt',
}
const VEHICLE_TYPE: Record<number, string> = { 1: 'Xe máy', 2: 'Ô tô', 3: 'Xe tải' }
const BOOKING_TYPE: Record<number, string> = { 1: 'Trực tuyến', 2: 'Khách trực tiếp' }

function BookingDetailModal({ booking: initial, onClose }: BookingDetailModalProps) {
  const [booking, setBooking] = useState<Booking>(initial)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    api.getBookingById(initial.bookingId)
      .then(full => setBooking(full))
      .catch(() => setFetchError('Không tải được chi tiết booking.'))
      .finally(() => setLoading(false))
  }, [initial.bookingId])

  const fmtDt = (s?: string) => s ? new Date(s).toLocaleString('vi-VN') : '—'
  const remaining = booking.bookingFinalAmount - (booking.depositAmount ?? 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ marginBottom: 2 }}>{booking.bookingCode}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {BOOKING_TYPE[booking.bookingType] ?? 'Unknown'} · {STATUS_LABELS[booking.bookingStatus] ?? '—'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {fetchError && (
            <div className="staff-alert staff-alert--error" style={{ padding: '10px 14px' }}>{fetchError}</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Customer & Vehicle */}
            <div className="bdetail-section" style={{ margin: 0 }}>
              <div className="bdetail-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                Khách hàng
              </div>
              <div className="bdetail-row">
                <span>Tên</span><strong>{booking.customerName || '—'}</strong>
              </div>
              {booking.customerPhone && (
                <div className="bdetail-row">
                  <span>SĐT</span><strong>{booking.customerPhone}</strong>
                </div>
              )}
              <div className="bdetail-row">
                <span>Biển số</span>
                <strong style={{ fontFamily: 'Courier New, monospace', letterSpacing: '0.06em', background: 'var(--color-bg-2)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--color-border-dim)' }}>
                  {booking.licensePlate || '—'}
                </strong>
              </div>
              {booking.vehicleBrand && (
                <div className="bdetail-row">
                  <span>Xe</span>
                  <strong>{booking.vehicleBrand} {booking.vehicleType ? `(${VEHICLE_TYPE[booking.vehicleType] ?? ''})` : ''}</strong>
                </div>
              )}
            </div>

            {/* Slot */}
            <div className="bdetail-section" style={{ margin: 0 }}>
              <div className="bdetail-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Khung giờ
              </div>
              <div className="bdetail-row">
                <span>Ngày</span><strong>{booking.slotDate || '—'}</strong>
              </div>
              <div className="bdetail-row">
                <span>Giờ</span>
                <strong>{booking.slotStartTime?.substring(0, 5) ?? '—'} – {booking.slotEndTime?.substring(0, 5) ?? '—'}</strong>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bdetail-section">
            <div className="bdetail-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Dịch vụ
            </div>
            {loading ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Đang tải…</div>
            ) : booking.lines?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {booking.lines.map(l => (
                  <div key={l.bookingLineId} className="bdetail-row">
                    <span>{l.serviceName} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: 4 }}>×{l.quantity}</span></span>
                    <strong>{l.lineTotal.toLocaleString('vi-VN')}đ</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Không có dịch vụ</div>
            )}
          </div>

          {/* Payment */}
          <div className="bdetail-section">
            <div className="bdetail-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              Thanh toán
            </div>
            <div className="bdetail-row">
              <span>Tạm tính</span><span>{booking.bookingSubtotal.toLocaleString('vi-VN')}đ</span>
            </div>
            {booking.bookingDiscountAmount > 0 && (
              <div className="bdetail-row">
                <span>Giảm giá</span>
                <span style={{ color: 'var(--color-success)' }}>−{booking.bookingDiscountAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary-dim)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginTop: 8, border: '1px solid var(--color-border-dim)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-heading)' }}>Tổng đơn</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>{booking.bookingFinalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
            {(booking.depositAmount ?? 0) > 0 && (
              <>
                <div className="bdetail-row" style={{ marginTop: 8 }}>
                  <span>Đã cọc</span>
                  <span style={{ color: 'var(--color-success)' }}>−{(booking.depositAmount ?? 0).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="bdetail-row" style={{ fontWeight: 700 }}>
                  <span>Còn lại</span><span style={{ fontSize: '1rem', color: 'var(--color-heading)' }}>{remaining.toLocaleString('vi-VN')}đ</span>
                </div>
              </>
            )}
          </div>

          {/* Timeline */}
          <div className="bdetail-section">
            <div className="bdetail-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              Lịch sử
            </div>
            <div className="bdetail-row"><span>Tạo lúc</span><span>{fmtDt(booking.createdAtUtc)}</span></div>
            {booking.checkInAtUtc && (
              <div className="bdetail-row"><span>Check-in</span><span>{fmtDt(booking.checkInAtUtc)}</span></div>
            )}
            {booking.completedAtUtc && (
              <div className="bdetail-row"><span>Hoàn thành</span><span>{fmtDt(booking.completedAtUtc)}</span></div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-sm" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

// ── Booking Card ─────────────────────────────────────────────────
interface CardProps {
  booking: Booking
  onCheckin: (b: Booking) => void
  onStart: (b: Booking) => void
  onComplete: (b: Booking) => void
  onClose: (b: Booking) => void
  onCancel: (b: Booking) => void
  onServices: (b: Booking) => void
  onDetails: (b: Booking) => void
  busy: boolean
}

function BookingCard({ booking: b, onCheckin, onStart, onComplete, onClose, onCancel, onServices, onDetails, busy }: CardProps) {
  let statusDot = 'grey';
  if (b.bookingStatus === BS.Confirmed || b.bookingStatus === BS.CheckedIn) statusDot = 'blue';
  else if (b.bookingStatus === BS.InProgress) statusDot = 'yellow';
  else if (b.bookingStatus === BS.Completed || b.bookingStatus === BS.Closed) statusDot = 'green';

  return (
    <div className={`ops-card ops-card--${statusDot}`}>
      <div className="ops-card-header">
        <span className="ops-plate">{b.licensePlate || b.bookingCode}</span>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.75rem', padding: '4px 10px', marginLeft: 'auto', background: 'var(--color-bg-2)' }}
          onClick={() => onDetails(b)}
          title="Xem chi tiết"
        >
          Chi tiết
        </button>
      </div>
      <div className="ops-service" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-heading)', margin: '4px 0' }}>{serviceNames(b)}</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
        {b.customerName && (
          <div className="ops-customer" style={{ background: 'transparent', padding: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-text-dim)' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            {b.customerName}
          </div>
        )}
        <div className="ops-meta" style={{ margin: 0, justifyContent: 'flex-start', gap: 16 }}>
          <span className="ops-time" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-text-dim)' }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {fmt(b.slotStartTime)}
          </span>
          {b.bookingFinalAmount > 0 && (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {b.bookingFinalAmount.toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>
      </div>

      <div className="ops-actions" style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px dashed var(--color-border-dim)', display: 'grid', gridTemplateColumns: b.bookingStatus === BS.InProgress || b.bookingStatus === BS.Confirmed ? '1fr 1fr' : '1fr', gap: 8 }}>
        {b.bookingStatus === BS.Confirmed && (
          <>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onCheckin(b)} style={{ width: '100%' }}>Check-in</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', width: '100%', border: '1px solid var(--color-border-dim)' }} disabled={busy} onClick={() => onCancel(b)}>Hủy đơn</button>
          </>
        )}
        {b.bookingStatus === BS.CheckedIn && (
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onStart(b)} style={{ width: '100%' }}>Bắt đầu rửa</button>
        )}
        {b.bookingStatus === BS.InProgress && (
          <>
            <button className="btn btn-primary btn-sm" style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)', width: '100%' }}
              disabled={busy} onClick={() => onComplete(b)}>Hoàn thành & Thu tiền</button>
            <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onServices(b)} style={{ width: '100%' }}>Thêm dịch vụ</button>
          </>
        )}
        {b.bookingStatus === BS.Completed && (
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onClose(b)} style={{ width: '100%' }}>Đóng đơn</button>
        )}
      </div>
    </div>
  )
}

// ── Column ───────────────────────────────────────────────────────
interface ColumnProps {
  title: string
  dot: 'blue' | 'yellow' | 'grey'
  items: Booking[]
  cardProps: Omit<CardProps, 'booking'>
}

function OpsColumn({ title, dot, items, cardProps }: ColumnProps) {
  return (
    <div className="ops-column">
      <div className="ops-col-header">
        <span className={`ops-col-dot ops-col-dot--${dot}`} />
        <span className="ops-col-title">{title}</span>
        <span className="ops-col-count">{items.length}</span>
      </div>
      {items.length === 0
        ? (
          <div className="ops-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
            Không có lịch hẹn nào
          </div>
        )
        : items.map(b => <BookingCard key={b.bookingId} booking={b} {...cardProps} />)
      }
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export default function StaffDashboard() {
  const [queue, setQueue] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])

  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [serviceTarget, setServiceTarget] = useState<Booking | null>(null)
  const [completeTarget, setCompleteTarget] = useState<Booking | null>(null)
  const [detailTarget, setDetailTarget] = useState<Booking | null>(null)
  const [restoredQr, setRestoredQr] = useState<{ bookingId: string; paymentId: string; paymentUrl: string } | null>(null)
  const restoredRef = useRef(false)

  const loadQueue = useCallback(async (date?: string) => {
    setLoading(true)
    setError('')
    try {
      const d = date ?? selectedDate
      const res = await api.getBookingQueue({ fromDate: d, toDate: d, pageSize: 100 })
      setQueue(res.items)
    } catch (e: any) {
      setError(e?.message || 'Không thể tải hàng đợi. Vui lòng thử lại.')
    }
    setLoading(false)
  }, [selectedDate])

  useEffect(() => { loadQueue() }, [loadQueue])

  // Sau reload/redirect: nếu còn 1 QR đang chờ thanh toán cho đơn trong hàng đợi → tự mở lại modal QR (1 lần)
  useEffect(() => {
    if (restoredRef.current || queue.length === 0) return
    try {
      const saved = JSON.parse(localStorage.getItem('wc_counterqr') || 'null')
      const b = saved?.bookingId ? queue.find(x => x.bookingId === saved.bookingId) : null
      if (saved && b) {
        restoredRef.current = true
        setRestoredQr(saved)
        setCompleteTarget(b)
      }
    } catch { /* ignore */ }
  }, [queue])

  const handleDateChange = (d: string) => {
    setSelectedDate(d)
    loadQueue(d)
  }

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try { await fn() } catch { setError('Thao tác thất bại. Vui lòng thử lại.') }
    setBusy(false)
  }

  const handleCheckin = (b: Booking) => {
    if (!b.bookingCode) { setError('Thiếu mã đặt lịch — hãy dùng nút "Nhập mã Check-in".'); return }
    withBusy(async () => {
      await api.checkInBookingByCode({ BookingCode: b.bookingCode })
      await loadQueue()
    })
  }

  const handleStart = (b: Booking) => withBusy(async () => { await api.updateBookingStatus(b.bookingId, BS.InProgress); await loadQueue() })
  const handleClose = (b: Booking) => withBusy(async () => { await api.closeBooking(b.bookingId); await loadQueue() })

  const cardProps: Omit<CardProps, 'booking'> = {
    onCheckin: handleCheckin,
    onStart: handleStart,
    onComplete: (b) => setCompleteTarget(b),
    onClose: handleClose,
    onCancel: (b) => setCancelTarget(b),
    onServices: (b) => setServiceTarget(b),
    onDetails: (b) => setDetailTarget(b),
    busy,
  }

  const waiting = queue.filter(b => b.bookingStatus === BS.Confirmed || b.bookingStatus === BS.CheckedIn)
  const washing = queue.filter(b => b.bookingStatus === BS.InProgress)
  const completed = queue.filter(b => b.bookingStatus === BS.Completed || b.bookingStatus === BS.Closed)

  const todayStr = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === todayStr

  return (
    <div className="portal-page">
      <div className="ops-header">
        <div>
          <h2>Bảng điều phối vận hành</h2>
          <p>Theo dõi dịch vụ đang thực hiện và hàng đợi xe tại chi nhánh.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={e => handleDateChange(e.target.value)}
              style={{ padding: '5px 10px', fontSize: '0.8125rem', height: 32 }}
            />
            {!isToday && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => handleDateChange(todayStr)}>
                Hôm nay
              </button>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => loadQueue()} disabled={loading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5 }}>
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Làm mới
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowCheckinModal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5 }}>
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="4" height="4" />
            </svg>
            Nhập mã Check-in
          </button>
          <Link to="/staff/customers" className="btn btn-premium-glow btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Khách vãng lai
          </Link>
        </div>
      </div>

      {error && (
        <div className="staff-alert staff-alert--error">
          {error}
          <button className="staff-alert-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {loading
        ? <div className="ops-loading">Đang tải hàng đợi…</div>
        : (
          <div className="ops-board">
            <OpsColumn title="Chờ thực hiện" dot="blue" items={waiting} cardProps={cardProps} />
            <OpsColumn title="Đang rửa xe" dot="yellow" items={washing} cardProps={cardProps} />
            <OpsColumn title="Đã hoàn thành" dot="grey" items={completed} cardProps={cardProps} />
          </div>
        )
      }

      {detailTarget && (
        <BookingDetailModal booking={detailTarget} onClose={() => setDetailTarget(null)} />
      )}
      {showCheckinModal && (
        <CheckInModal queue={queue} onClose={() => setShowCheckinModal(false)} onSuccess={loadQueue} />
      )}
      {cancelTarget && (
        <CancelModal booking={cancelTarget} onClose={() => setCancelTarget(null)} onSuccess={loadQueue} />
      )}
      {serviceTarget && (
        <ServiceLineModal booking={serviceTarget} onClose={() => setServiceTarget(null)} onSuccess={loadQueue} />
      )}
      {completeTarget && (
        <CompletePaymentModal
          booking={completeTarget}
          initialQr={restoredQr?.bookingId === completeTarget.bookingId ? restoredQr : null}
          onClose={() => { setCompleteTarget(null); setRestoredQr(null) }}
          onSuccess={loadQueue}
        />
      )}
    </div>
  )
}
