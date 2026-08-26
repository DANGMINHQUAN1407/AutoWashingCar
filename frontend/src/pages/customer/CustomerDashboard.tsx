import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import '../Dashboard.css'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const nameStr = user?.FullName || user?.fullName || user?.name || ''
  const firstName = nameStr ? nameStr.split(' ').pop() : 'bạn'
  const [loyalty, setLoyalty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<any[]>([])

  useEffect(() => {
    async function fetchLoyalty() {
      try {
        const data = await api.getMyLoyalty()
        setLoyalty(data)
      } catch (err) {
        console.error('Error fetching loyalty data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    async function fetchBookings() {
      try {
        const data = await api.getMyBookings({ pageSize: 100 })
        setBookings(data?.items || [])
      } catch (err) {
        console.error('Error fetching bookings:', err)
      }
    }

    fetchLoyalty()
    fetchBookings()
  }, [])

  const currentPoints = loyalty?.currentPoints ?? loyalty?.CurrentPoints ?? 0
  const tierName = loyalty?.tier?.tierName ?? loyalty?.Tier?.TierName ?? 'Đồng'

  // Calculations
  const completedBookings = bookings.filter(b => {
    const st = b.bookingStatus ?? b.BookingStatus
    return st === 5 || st === 6 // Completed or Closed
  })
  const totalWashes = completedBookings.length
  
  function formatServiceSummary(summary?: string): string {
    if (!summary) return 'Rửa xe'
    const items = summary.split(',').map(s => s.trim()).filter(Boolean)
    if (items.length === 1) {
      return items[0]
    }
    return `${items[0]} (+${items.length - 1} dịch vụ thêm)`
  }
  
  const currentYear = new Date().getFullYear()
  const savedThisYear = completedBookings
    .filter(b => {
      const d = b.createdAtUtc || b.CreatedAtUtc || b.slotDate || b.SlotDate
      return d ? new Date(d).getFullYear() === currentYear : false
    })
    .reduce((sum, b) => {
      const discount = b.bookingDiscountAmount ?? b.BookingDiscountAmount ?? 0
      return sum + Number(discount)
    }, 0)

  // format for UI
  const upcomingWashes = bookings
    .filter(b => {
      const st = b.bookingStatus ?? b.BookingStatus
      return st >= 1 && st <= 4
    }) // Pending, Confirmed, CheckedIn, InProgress
    .sort((a, b) => {
      const aDate = a.slotDate || a.SlotDate || ''
      const bDate = b.slotDate || b.SlotDate || ''
      return new Date(aDate).getTime() - new Date(bDate).getTime()
    })

  const nextBooking = upcomingWashes.length > 0 ? upcomingWashes[0] : null
  const nextDateStr = nextBooking?.slotDate || nextBooking?.SlotDate || ''
  const nextTimeStr = nextBooking?.slotStartTime || nextBooking?.SlotStartTime || ''
  const nextServiceStr = formatServiceSummary(nextBooking?.serviceSummary || nextBooking?.ServiceSummary)
  const nextPlate = nextBooking?.licensePlate || nextBooking?.LicensePlate || 'Phương tiện'
  const nextStation = nextBooking?.branchName || nextBooking?.BranchName || 'AutoWash Pro'

  const [historyPage, setHistoryPage] = useState(1)
  const historyPageSize = 5

  const sortedWashes = [...completedBookings].sort((a, b) => {
    const aDate = a.createdAtUtc || a.CreatedAtUtc || a.slotDate || a.SlotDate || ''
    const bDate = b.createdAtUtc || b.CreatedAtUtc || b.slotDate || b.SlotDate || ''
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
  const totalHistoryPages = Math.max(1, Math.ceil(sortedWashes.length / historyPageSize))
  const currentHistoryPage = Math.min(Math.max(1, historyPage), totalHistoryPages)
  const pagedWashes = sortedWashes.slice((currentHistoryPage - 1) * historyPageSize, currentHistoryPage * historyPageSize)

  return (
    <div className="portal-page" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
            XIN CHÀO, {firstName} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '6px', margin: 0 }}>
            Dưới đây là thông tin và hoạt động chăm sóc xe của bạn hôm nay.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/customer/vehicles"
            style={{
              background: '#ffffff',
              color: '#0284c7',
              border: '1.5px solid #0284c7',
              borderRadius: '10px',
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            QUẢN LÝ XE →
          </Link>
          <Link
            to="/customer/bookings?startBooking=true"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
            }}
          >
            ĐẶT LỊCH RỬA XE →
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        {/* Card 1: Lượt rửa */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
            🚗
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              LƯỢT RỬA XE
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {loading ? '...' : totalWashes}
            </div>
          </div>
        </div>

        {/* Card 2: Hạng */}
        <Link to="/customer/loyalty" style={{ textDecoration: 'none', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
            ⭐
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              HẠNG ({tierName.toUpperCase()})
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {loading ? '...' : currentPoints.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>điểm</span>
            </div>
          </div>
        </Link>

        {/* Card 3: Tiết kiệm */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
            💰
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TIẾT KIỆM NĂM NAY
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {loading ? '...' : Number(savedThisYear).toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>đ</span>
            </div>
          </div>
        </div>

        {/* Card 4: Lịch hẹn sắp tới */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
            📅
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              LỊCH HẸN SẮP TỚI
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {nextDateStr ? (
                <>
                  {new Date(nextDateStr).toLocaleDateString('vi-VN')}
                  {nextTimeStr && <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, display: 'block' }}>{nextTimeStr.substring(0, 5)}</span>}
                </>
              ) : (
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Chưa có lịch</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Left Upcoming + Right History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '24px', alignItems: 'stretch' }}>
        {/* Left: Upcoming Appointment Card */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Lịch Hẹn</h2>
            {nextBooking && (
              <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', fontWeight: 700, fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px' }}>
                ĐÃ LÊN LỊCH
              </span>
            )}
          </div>

          {nextBooking ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', marginBottom: 'auto', position: 'relative', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px', textTransform: 'uppercase' }}>
                {nextServiceStr}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📅</span>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Thời gian</div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{nextDateStr} - {nextTimeStr.substring(0, 5)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🚗</span>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Biển số xe</div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{nextPlate}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📍</span>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Địa điểm</div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{nextStation}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', marginBottom: 'auto' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚗</div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Bạn chưa có lịch hẹn nào sắp tới.</p>
            </div>
          )}

          <Link
            to="/customer/bookings"
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: '18px',
              padding: '12px',
              borderRadius: '10px',
              background: '#f1f5f9',
              color: '#0284c7',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease'
            }}
          >
            Xem chi tiết
          </Link>
        </div>

        {/* Right: Recent History Table */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Lịch Sử Gần Đây</h2>
            <Link to="/customer/bookings" style={{ color: '#0284c7', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
              Xem tất cả ({sortedWashes.length})
            </Link>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            {sortedWashes.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                Chưa có lịch sử đơn rửa xe hoàn thành nào.
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '14px 20px', fontWeight: 700 }}>Dịch vụ</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700 }}>Ngày</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700 }}>Biển số</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'right' }}>Tổng tiền</th>
                      <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedWashes.map(b => {
                      const amount = b.bookingFinalAmount ?? b.BookingFinalAmount ?? 0
                      const date = b.createdAtUtc || b.CreatedAtUtc || b.slotDate || b.SlotDate
                      const dateStr = date ? new Date(date).toLocaleDateString('vi-VN') : 'Hoàn thành'
                      const svc = formatServiceSummary(b.serviceSummary || b.ServiceSummary)
                      const plate = b.licensePlate || b.LicensePlate || 'Phương tiện'

                      return (
                        <tr key={b.bookingId || b.BookingId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0f172a' }}>{svc}</td>
                          <td style={{ padding: '16px 16px', color: '#64748b' }}>{dateStr}</td>
                          <td style={{ padding: '16px 16px', color: '#0f172a', fontWeight: 500 }}>{plate}</td>
                          <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                            {Number(amount).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                              HOÀN THÀNH
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalHistoryPages > 1 && (
                  <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', background: '#fafbfc', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Hiển thị <strong>{(currentHistoryPage - 1) * historyPageSize + 1} - {Math.min(currentHistoryPage * historyPageSize, sortedWashes.length)}</strong> trên tổng số <strong>{sortedWashes.length}</strong> đơn
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={currentHistoryPage === 1}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: currentHistoryPage === 1 ? '#f1f5f9' : '#ffffff',
                          color: currentHistoryPage === 1 ? '#94a3b8' : '#0f172a',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: currentHistoryPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ‹ Trước
                      </button>

                      {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setHistoryPage(page)}
                          style={{
                            minWidth: 32,
                            height: 32,
                            padding: '0 8px',
                            borderRadius: '6px',
                            border: page === currentHistoryPage ? '1px solid #0284c7' : '1px solid #cbd5e1',
                            background: page === currentHistoryPage ? '#0284c7' : '#ffffff',
                            color: page === currentHistoryPage ? '#ffffff' : '#0f172a',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                        disabled={currentHistoryPage === totalHistoryPages}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: currentHistoryPage === totalHistoryPages ? '#f1f5f9' : '#ffffff',
                          color: currentHistoryPage === totalHistoryPages ? '#94a3b8' : '#0f172a',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: currentHistoryPage === totalHistoryPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Sau ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
