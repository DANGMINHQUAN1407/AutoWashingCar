import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import AnimatedButton from '../../components/AnimatedButton'
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
    .slice(0, 3)
    .map(b => {
      const st = b.bookingStatus ?? b.BookingStatus
      const date = b.slotDate || b.SlotDate || ''
      const time = b.slotStartTime || b.SlotStartTime || ''
      const amount = b.bookingFinalAmount ?? b.BookingFinalAmount ?? 0
      
      let statusStr = 'Chờ xác nhận'
      if (st === 2) statusStr = 'Đã xác nhận'
      else if (st === 3) statusStr = 'Đã Check-in'
      else if (st === 4) statusStr = 'Đang rửa'

      return {
        id: b.bookingCode || b.BookingCode,
        service: formatServiceSummary(b.serviceSummary || b.ServiceSummary),
        date: `${date} ${time}`.trim() || 'Đã lên lịch',
        status: statusStr,
        car: b.licensePlate || b.LicensePlate || 'Phương tiện',
        price: `${amount.toLocaleString('vi-VN')} đ`
      }
    })

  const pastWashes = completedBookings
    .sort((a, b) => {
      const aDate = a.createdAtUtc || a.CreatedAtUtc || ''
      const bDate = b.createdAtUtc || b.CreatedAtUtc || ''
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })
    .slice(0, 5)
    .map(b => {
      const amount = b.bookingFinalAmount ?? b.BookingFinalAmount ?? 0
      const date = b.createdAtUtc || b.CreatedAtUtc
      return {
        id: b.bookingCode || b.BookingCode,
        service: formatServiceSummary(b.serviceSummary || b.ServiceSummary),
        date: date ? new Date(date).toLocaleDateString('vi-VN') : 'Đã hoàn thành',
        status: 'Hoàn thành',
        car: b.licensePlate || b.LicensePlate || 'Phương tiện',
        price: `${amount.toLocaleString('vi-VN')} đ`
      }
    })

  return (
    <div className="portal-page">
      <div className="dash-header">
        <div>
          <h2>Xin chào, {firstName} 👋</h2>
          <p>Dưới đây là thông tin và hoạt động chăm sóc xe của bạn hôm nay.</p>
        </div>
        <div className="dash-header-actions">
          <Link to="/customer/bookings?startBooking=true">
            <AnimatedButton variant="primary">Đặt lịch rửa xe</AnimatedButton>
          </Link>
          <Link to="/customer/vehicles">
            <AnimatedButton variant="secondary">Quản lý xe</AnimatedButton>
          </Link>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3>Tổng quan</h3>
        </div>
        <div className="dash-stats">
          <div className="dash-stat-card">
            <div className="dash-stat-top">
              <span className="stat-title">LƯỢT RỬA XE</span>
              <div className="dash-stat-icon-badge dash-stat-icon-badge--blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
              </div>
            </div>
            <div className="stat-val">{loading ? '...' : totalWashes}</div>
          </div>

          <Link to="/customer/loyalty" className="dash-stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="dash-stat-top">
              <span className="stat-title">HẠNG ({loading ? '...' : tierName.toUpperCase()})</span>
              <div className="dash-stat-icon-badge dash-stat-icon-badge--amber">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
            </div>
            <div className="stat-val">{loading ? '...' : `${currentPoints.toLocaleString()} điểm`}</div>
          </Link>

          <div className="dash-stat-card">
            <div className="dash-stat-top">
              <span className="stat-title">TIẾT KIỆM NĂM NAY</span>
              <div className="dash-stat-icon-badge dash-stat-icon-badge--green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <div className="stat-val">{loading ? '...' : `${Number(savedThisYear).toLocaleString('vi-VN')} đ`}</div>
          </div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3>Lịch hẹn sắp tới</h3>
          <Link to="/customer/bookings" className="dash-link">Xem tất cả</Link>
        </div>
        <div className="booking-list">
          {upcomingWashes.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', padding: '16px 0', fontSize: '0.9rem' }}>
              Bạn không có lịch hẹn nào sắp tới.
            </div>
          ) : (
            upcomingWashes.map(b => (
              <div key={b.id} className="booking-card active-booking">
                <div className="booking-status-indicator" />
                <div className="booking-main">
                  <div className="booking-header">
                    <h4>{b.service}</h4>
                    <span className="badge badge-primary">{b.status}</span>
                  </div>
                  <div className="booking-details">
                    <span><strong>Thời gian:</strong> {b.date}</span>
                    <span><strong>Biển số:</strong> {b.car}</span>
                    <span><strong>Tổng cộng:</strong> {b.price}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3>Lịch sử gần đây</h3>
        </div>
        <div className="booking-list">
          {pastWashes.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', padding: '16px 0', fontSize: '0.9rem' }}>
              Chưa có lịch sử rửa xe nào.
            </div>
          ) : (
            pastWashes.map(b => (
              <div key={b.id} className="booking-card">
                <div className="booking-main">
                  <div className="booking-header">
                    <h4>{b.service}</h4>
                    <span className="badge badge-success">{b.status}</span>
                  </div>
                  <div className="booking-details">
                    <span><strong>Thời gian:</strong> {b.date}</span>
                    <span><strong>Biển số:</strong> {b.car}</span>
                    <span><strong>Tổng cộng:</strong> {b.price}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
