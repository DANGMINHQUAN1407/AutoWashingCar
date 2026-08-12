import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import type { Slot } from '../../types/slot'
import type { Branch } from '../../types/branch'
import { extractErrorMessage } from '../../utils/errorUtils'
import './ManagerSlots.css'

export default function ManagerSlots() {
  const [myBranch, setMyBranch] = useState<Branch | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Date filters
  const getTodayStr = () => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  }

  const getDateOffsetStr = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d.toISOString().split('T')[0]
  }

  const [fromDate, setFromDate] = useState(getTodayStr())
  const [toDate, setToDate] = useState(getDateOffsetStr(7))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const pageSize = 12

  // Modals state
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Form states
  const [singleFormData, setSingleFormData] = useState({
    slotDate: getTodayStr(),
    slotStartTime: '08:00',
    slotEndTime: '09:00',
    capacity: 2
  })

  const [bulkFormData, setBulkFormData] = useState({
    fromDate: getTodayStr(),
    toDate: getDateOffsetStr(7),
    openTime: '08:00',
    closeTime: '18:00',
    slotDurationMinutes: 60,
    capacity: 2
  })

  const [editFormData, setEditFormData] = useState({
    slotInventoryId: '',
    capacity: 2,
    timeLabel: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch branch details & slots
  const loadBranchAndSlots = async () => {
    try {
      setLoading(true)
      setError(null)
      const branch = await api.getMyBranch().catch(() => null)
      setMyBranch(branch)

      if (branch?.branchId) {
        const res = await api.getSlots({
          fromDate,
          toDate,
          pageSize: 250 // Fetch large page size to avoid pagination complexity for daily view
        })
        setSlots(res.items || [])
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Lỗi khi tải thông tin slots.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBranchAndSlots()
  }, [fromDate, toDate])

  // Get list of dates in the from-to range for slider
  const getDatesInFilterRange = () => {
    const dates = []
    const start = new Date(fromDate)
    const end = new Date(toDate)
    const temp = new Date(start)

    let limit = 0
    while (temp <= end && limit < 31) {
      dates.push(new Date(temp))
      temp.setDate(temp.getDate() + 1)
      limit++
    }
    return dates
  }

  const handleOpenSingleModal = () => {
    setSingleFormData({
      slotDate: selectedDate || getTodayStr(),
      slotStartTime: '08:00',
      slotEndTime: '09:00',
      capacity: 2
    })
    setIsSingleModalOpen(true)
  }

  const handleOpenBulkModal = () => {
    setBulkFormData({
      fromDate: fromDate,
      toDate: toDate,
      openTime: '08:00',
      closeTime: '18:00',
      slotDurationMinutes: 60,
      capacity: 2
    })
    setIsBulkModalOpen(true)
  }

  const handleOpenEditModal = (slot: Slot) => {
    setEditFormData({
      slotInventoryId: slot.slotInventoryId,
      capacity: slot.capacity,
      timeLabel: `${slot.slotDate} (${slot.slotStartTime.substring(0, 5)} - ${slot.slotEndTime.substring(0, 5)})`
    })
    setIsEditModalOpen(true)
  }

  // API Call: Create Single Slot
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      await api.createSlot({
        slotDate: singleFormData.slotDate,
        slotStartTime: singleFormData.slotStartTime,
        slotEndTime: singleFormData.slotEndTime,
        capacity: Number(singleFormData.capacity)
      })
      setSuccessMsg('Đã tạo slot thành công!')
      setIsSingleModalOpen(false)
      await loadBranchAndSlots()
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Lỗi khi tạo slot.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // API Call: Generate Slots Bulk
  const handleCreateBulk = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await api.generateSlots({
        fromDate: bulkFormData.fromDate,
        toDate: bulkFormData.toDate,
        openTime: bulkFormData.openTime,
        closeTime: bulkFormData.closeTime,
        slotDurationMinutes: Number(bulkFormData.slotDurationMinutes),
        capacity: Number(bulkFormData.capacity)
      })
      setSuccessMsg(`Đã tạo tự động thành công ${res.generated} slots!`)
      setIsBulkModalOpen(false)
      await loadBranchAndSlots()
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Lỗi khi tạo tự động các slots.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // API Call: Update Slot Capacity
  const handleUpdateCapacity = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      await api.updateSlot(editFormData.slotInventoryId, {
        capacity: Number(editFormData.capacity)
      })
      setSuccessMsg('Cập nhật sức chứa thành công!')
      setIsEditModalOpen(false)
      await loadBranchAndSlots()
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Lỗi khi cập nhật slot.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // API Call: Delete Slot
  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa slot này không?')) return
    setError(null)
    setSuccessMsg(null)

    try {
      await api.deleteSlot(id)
      setSuccessMsg('Đã xóa slot thành công!')
      await loadBranchAndSlots()
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Lỗi khi xóa slot.'))
    }
  }

  // Filter slots locally by selectedDate if set
  const filteredSlots = selectedDate
    ? slots.filter(s => s.slotDate === selectedDate)
    : slots

  // Calculate metrics based on filtered slots
  const totalSlotsCount = filteredSlots.length
  const totalCapacitySum = filteredSlots.reduce((sum, s) => sum + s.capacity, 0)
  const reservedCountSum = filteredSlots.reduce(
    (sum, s) => sum + s.onlineReservedCount + s.walkInReservedCount,
    0
  )
  const fullyBookedCount = filteredSlots.filter(
    s => s.onlineReservedCount + s.walkInReservedCount >= s.capacity
  ).length

  // Date helper formatting
  const formatSlideDate = (date: Date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    const dateStr = date.toISOString().split('T')[0]
    return {
      dayName: days[date.getDay()],
      dayNum: date.getDate(),
      dateStr
    }
  }

  const formatTimeStr = (time: string) => {
    return time.substring(0, 5)
  }

  if (loading && !myBranch) {
    return <div className="mgr-loading">Đang tải thông tin slots...</div>
  }

  if (!myBranch) {
    return (
      <div className="portal-page">
        <div className="mgr-slots-empty">
          <svg style={{ margin: '0 auto 1rem', color: 'var(--color-danger)' }} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p>Tài khoản của bạn chưa được phân quyền quản lý chi nhánh nào.</p>
          <p style={{ fontSize: '0.875rem' }}>Vui lòng liên hệ Admin để được chỉ định quản lý một chi nhánh trước khi cấu hình lịch slots.</p>
        </div>
      </div>
    )
  }

  const dateSlides = getDatesInFilterRange()

  return (
    <div className="portal-page mgr-slots-page">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="alert alert-success animate-fade-in" style={{
          padding: '1rem',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--color-success)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{successMsg}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSuccessMsg(null)}>Đóng</button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger animate-fade-in" style={{
          padding: '1rem',
          borderRadius: '8px',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: 'var(--color-danger)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setError(null)}>Đóng</button>
        </div>
      )}

      {/* Header */}
      <div className="mgr-slots-header">
        <div>
          <h2>Quản Lý Lịch Slots</h2>
          <p>Tạo và quản lý các khung giờ rửa xe cho chi nhánh: <strong>{myBranch.name}</strong></p>
        </div>
        <div className="mgr-header-actions">
          <button type="button" className="btn btn-secondary" onClick={handleOpenBulkModal}>
            <svg style={{ marginRight: '4px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Tự Động Tạo Lịch
          </button>
          <button type="button" className="btn btn-primary" onClick={handleOpenSingleModal}>
            <svg style={{ marginRight: '4px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm Khung Giờ
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="mgr-slots-stats">
        <div className="mgr-slots-stat-card">
          <div className="mgr-slots-stat-icon mgr-slots-stat-icon--total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="mgr-slots-stat-info">
            <h4>Tổng số Slots</h4>
            <p>{totalSlotsCount}</p>
          </div>
        </div>

        <div className="mgr-slots-stat-card">
          <div className="mgr-slots-stat-icon mgr-slots-stat-icon--capacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7H5C3.34 7 2 8.34 2 10v6c0 1.66 1.34 3 3 3h1a2 2 0 0 0 4 0h4a2 2 0 0 0 4 0h1c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3z"/></svg>
          </div>
          <div className="mgr-slots-stat-info">
            <h4>Đã đặt / Tổng chỗ</h4>
            <p>{reservedCountSum} / {totalCapacitySum}</p>
          </div>
        </div>

        <div className="mgr-slots-stat-card">
          <div className="mgr-slots-stat-icon mgr-slots-stat-icon--booked">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="mgr-slots-stat-info">
            <h4>Khung Giờ Đầy Chỗ</h4>
            <p>{fullyBookedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Date selection panel */}
      <div className="mgr-slots-filters">
        <div className="mgr-filter-row">
          <div className="mgr-filter-field">
            <label>Từ ngày</label>
            <input
              type="date"
              className="mgr-filter-input"
              value={fromDate}
              onChange={e => {
                setFromDate(e.target.value)
                setSelectedDate(null)
                setPage(1)
              }}
            />
          </div>
          <div className="mgr-filter-field">
            <label>Đến ngày</label>
            <input
              type="date"
              className="mgr-filter-input"
              value={toDate}
              onChange={e => {
                setToDate(e.target.value)
                setSelectedDate(null)
                setPage(1)
              }}
            />
          </div>
        </div>

        <hr className="divider" style={{ margin: '0.5rem 0' }} />

        {/* Date Slider */}
        <div className="mgr-date-slider-container">
          <div className="mgr-date-slider-label">Lọc nhanh theo ngày</div>
          <div className="mgr-date-slider">
            <button
              type="button"
              className={`mgr-date-slide-btn ${selectedDate === null ? 'active' : ''}`}
              onClick={() => { setSelectedDate(null); setPage(1); }}
              style={{ minWidth: '90px' }}
            >
              <span className="mgr-date-slide-btn-day">Tất cả</span>
              <span className="mgr-date-slide-btn-num" style={{ fontSize: '0.95rem', margin: 'auto' }}>Show All</span>
            </button>
            {dateSlides.map(date => {
              const info = formatSlideDate(date)
              return (
                <button
                  key={info.dateStr}
                  type="button"
                  className={`mgr-date-slide-btn ${selectedDate === info.dateStr ? 'active' : ''}`}
                  onClick={() => { setSelectedDate(info.dateStr); setPage(1); }}
                >
                  <span className="mgr-date-slide-btn-day">{info.dayName}</span>
                  <span className="mgr-date-slide-btn-num">{info.dayNum}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Slots display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải danh sách lịch slots...</div>
      ) : filteredSlots.length === 0 ? (
        <div className="mgr-slots-empty">
          <svg style={{ margin: '0 auto 1rem', color: 'var(--color-text-muted)' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <p>Không tìm thấy slots thời gian nào trong khoảng thời gian đã chọn.</p>
          <button type="button" className="btn btn-primary" onClick={handleOpenBulkModal}>
            Tự động tạo lịch slots mới
          </button>
        </div>
      ) : (
        <>
          <div className="mgr-slots-grid">
            {filteredSlots.slice((page - 1) * pageSize, page * pageSize).map(slot => {
            const reserved = slot.onlineReservedCount + slot.walkInReservedCount
            const percent = Math.min(100, Math.round((reserved / slot.capacity) * 100))
            const isFull = reserved >= slot.capacity
            const isWarning = !isFull && percent >= 70

            let cardClass = ''
            if (isFull) cardClass = 'mgr-slot-card--full'
            else if (isWarning) cardClass = 'mgr-slot-card--warn'

            return (
              <div key={slot.slotInventoryId} className={`mgr-slot-card ${cardClass}`}>
                <div className="mgr-slot-time-row">
                  <span className="mgr-slot-time">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {formatTimeStr(slot.slotStartTime)} - {formatTimeStr(slot.slotEndTime)}
                  </span>
                  <span className="mgr-slot-date">{slot.slotDate}</span>
                </div>

                <div className="mgr-slot-occupancy-container">
                  <div className="mgr-slot-occupancy-text">
                    <span>Độ lấp đầy</span>
                    <span>{reserved} / {slot.capacity} chỗ ({percent}%)</span>
                  </div>
                  <div className="mgr-slot-bar-outer">
                    <div className="mgr-slot-bar-inner" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                <div className="mgr-slot-details-list">
                  <div className="mgr-slot-detail-item">
                    <span>Đặt Online:</span>
                    <span className="mgr-slot-detail-val">{slot.onlineReservedCount}</span>
                  </div>
                  <div className="mgr-slot-detail-item">
                    <span>Đặt Vãng lai (Walk-in):</span>
                    <span className="mgr-slot-detail-val">{slot.walkInReservedCount}</span>
                  </div>
                  <div className="mgr-slot-detail-item" style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                    <span>Còn trống:</span>
                    <span className="mgr-slot-detail-val" style={{ color: isFull ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {slot.availableCount} chỗ
                    </span>
                  </div>
                </div>

                <div className="mgr-slot-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleOpenEditModal(slot)}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    title="Chỉnh sửa sức chứa"
                  >
                    Sức chứa
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleDeleteSlot(slot.slotInventoryId)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      borderColor: reserved > 0 ? 'transparent' : 'rgba(244, 63, 94, 0.2)',
                      color: reserved > 0 ? 'var(--color-text-dim)' : 'var(--color-danger)'
                    }}
                    disabled={reserved > 0}
                    title={reserved > 0 ? 'Không thể xóa slot đã có đặt lịch' : 'Xóa slot'}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {filteredSlots.length > 0 && (
          <div className="pagination-container-premium animate-fade-in" style={{ marginTop: '20px' }}>
            <div className="pagination-stats" style={{ fontSize: '0.85rem' }}>
              Trang <strong>{page}</strong> / <strong>{Math.max(1, Math.ceil(filteredSlots.length / pageSize))}</strong> (Tổng: {filteredSlots.length})
            </div>
            <div className="pagination-buttons">
              <button
                type="button"
                className="btn-page-nav"
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <button
                type="button"
                className="btn-page-nav"
                onClick={() => setPage(prev => Math.min(prev + 1, Math.max(1, Math.ceil(filteredSlots.length / pageSize))))}
                disabled={page === Math.max(1, Math.ceil(filteredSlots.length / pageSize))}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Modal: Create Single Slot */}
      {isSingleModalOpen && createPortal(
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.4rem' }}>Thêm Khung Giờ Thủ Công</h3>
            <form onSubmit={handleCreateSingle} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="mgr-modal-field">
                <label>Ngày làm việc</label>
                <input
                  type="date"
                  className="mgr-modal-input"
                  required
                  value={singleFormData.slotDate}
                  onChange={e => setSingleFormData({...singleFormData, slotDate: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mgr-modal-field">
                  <label>Giờ bắt đầu</label>
                  <input
                    type="time"
                    className="mgr-modal-input"
                    required
                    value={singleFormData.slotStartTime}
                    onChange={e => setSingleFormData({...singleFormData, slotStartTime: e.target.value})}
                  />
                </div>
                <div className="mgr-modal-field">
                  <label>Giờ kết thúc</label>
                  <input
                    type="time"
                    className="mgr-modal-input"
                    required
                    value={singleFormData.slotEndTime}
                    onChange={e => setSingleFormData({...singleFormData, slotEndTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="mgr-modal-field">
                <label>Sức chứa tối đa (Số lượng xe rửa cùng lúc)</label>
                <input
                  type="number"
                  className="mgr-modal-input"
                  required min="1" max="200"
                  value={singleFormData.capacity}
                  onChange={e => setSingleFormData({...singleFormData, capacity: Number(e.target.value)})}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsSingleModalOpen(false)} disabled={isSubmitting}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang tạo...' : 'Tạo Khung Giờ'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Generate Bulk Slots */}
      {isBulkModalOpen && createPortal(
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.4rem' }}>Tự Động Tạo Hàng Loạt Lịch Slots</h3>
            <form onSubmit={handleCreateBulk} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mgr-modal-field">
                  <label>Từ ngày</label>
                  <input
                    type="date"
                    className="mgr-modal-input"
                    required
                    value={bulkFormData.fromDate}
                    onChange={e => setBulkFormData({...bulkFormData, fromDate: e.target.value})}
                  />
                </div>
                <div className="mgr-modal-field">
                  <label>Đến ngày</label>
                  <input
                    type="date"
                    className="mgr-modal-input"
                    required
                    value={bulkFormData.toDate}
                    onChange={e => setBulkFormData({...bulkFormData, toDate: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mgr-modal-field">
                  <label>Giờ mở cửa chi nhánh</label>
                  <input
                    type="time"
                    className="mgr-modal-input"
                    required
                    value={bulkFormData.openTime}
                    onChange={e => setBulkFormData({...bulkFormData, openTime: e.target.value})}
                  />
                </div>
                <div className="mgr-modal-field">
                  <label>Giờ đóng cửa chi nhánh</label>
                  <input
                    type="time"
                    className="mgr-modal-input"
                    required
                    value={bulkFormData.closeTime}
                    onChange={e => setBulkFormData({...bulkFormData, closeTime: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div className="mgr-modal-field">
                  <label>Thời lượng 1 slot</label>
                  <select
                    className="mgr-modal-select"
                    value={bulkFormData.slotDurationMinutes}
                    onChange={e => setBulkFormData({...bulkFormData, slotDurationMinutes: Number(e.target.value)})}
                  >
                    <option value="30">30 Phút</option>
                    <option value="45">45 Phút</option>
                    <option value="60">60 Phút (1 Tiếng)</option>
                    <option value="90">90 Phút (1.5 Tiếng)</option>
                    <option value="120">120 Phút (2 Tiếng)</option>
                    <option value="180">180 Phút (3 Tiếng)</option>
                  </select>
                </div>
                <div className="mgr-modal-field">
                  <label>Sức chứa / Slot</label>
                  <input
                    type="number"
                    className="mgr-modal-input"
                    required min="1" max="200"
                    value={bulkFormData.capacity}
                    onChange={e => setBulkFormData({...bulkFormData, capacity: Number(e.target.value)})}
                  />
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                * Hệ thống sẽ tự chia các khung giờ từ giờ mở cửa đến đóng cửa theo thời lượng bạn chọn cho mỗi ngày trong khoảng lịch. Bất kỳ khung giờ nào đã được tạo sẵn từ trước sẽ được tự động bỏ qua để tránh trùng lặp.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsBulkModalOpen(false)} disabled={isSubmitting}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang khởi tạo...' : 'Tạo Lịch Tự Động'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Edit Slot Capacity */}
      {isEditModalOpen && createPortal(
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.3rem' }}>Chỉnh Sửa Sức Chứa</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Khung giờ: <strong>{editFormData.timeLabel}</strong>
            </p>
            <form onSubmit={handleUpdateCapacity} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="mgr-modal-field">
                <label>Sức chứa tối đa (Số xe nhận đồng thời)</label>
                <input
                  type="number"
                  className="mgr-modal-input"
                  required min="1" max="200"
                  value={editFormData.capacity}
                  onChange={e => setEditFormData({...editFormData, capacity: Number(e.target.value)})}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
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
