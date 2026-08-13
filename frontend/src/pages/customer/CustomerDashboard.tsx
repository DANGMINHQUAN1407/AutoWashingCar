import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import AnimatedButton from '../../components/AnimatedButton'
import '../Dashboard.css'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const nameStr = user?.FullName || user?.fullName || user?.name || ''
  const firstName = nameStr ? nameStr.split(' ').pop() : 'there'
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
  const tierName = loyalty?.tier?.tierName ?? loyalty?.Tier?.TierName ?? 'Bronze'

  // Calculations
  const completedBookings = bookings.filter(b => {
    const st = b.bookingStatus ?? b.BookingStatus
    return st === 5 || st === 6 // Completed or Closed
  })
  const totalWashes = completedBookings.length
  
  const currentYear = new Date().getFullYear()
  const savedThisYear = completedBookings
    .filter(b => {
      const d = b.createdAtUtc || b.CreatedAtUtc
      return d ? new Date(d).getFullYear() === currentYear : false
    })
    .reduce((sum, b) => {
      const discount = b.bookingDiscountAmount ?? b.BookingDiscountAmount ?? 0
      const points = b.redeemedPoints ?? b.RedeemedPoints ?? 0
      return sum + (discount - points)
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
      
      let statusStr = 'Pending'
      if (st === 2) statusStr = 'Confirmed'
      else if (st === 3) statusStr = 'Checked In'
      else if (st === 4) statusStr = 'In Progress'

      return {
        id: b.bookingCode || b.BookingCode,
        service: b.serviceSummary || b.ServiceSummary || 'Car Wash',
        date: `${date} ${time}`.trim() || 'Unknown',
        status: statusStr,
        car: b.licensePlate || b.LicensePlate || 'Unknown',
        price: `${amount.toLocaleString('vi-VN')} VND`
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
        service: b.serviceSummary || b.ServiceSummary || 'Car Wash',
        date: date ? new Date(date).toLocaleDateString('vi-VN') : 'Unknown',
        status: 'Completed',
        car: b.licensePlate || b.LicensePlate || 'Unknown',
        price: `${amount.toLocaleString('vi-VN')} VND`
      }
    })

  return (
    <div className="portal-page">
      <div className="dash-header">
        <div>
          <h2>Welcome back, {firstName}</h2>
          <p>Here's what's happening with your vehicles today.</p>
        </div>
        <div className="dash-header-actions">
          <Link to="/customer/bookings?startBooking=true">
            <AnimatedButton variant="primary">Book New Wash</AnimatedButton>
          </Link>
          <Link to="/customer/vehicles">
            <AnimatedButton variant="secondary">Manage Vehicles</AnimatedButton>
          </Link>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3>Overview</h3>
        </div>
        <div className="dash-stats">
          <div className="dash-stat-card">
            <div className="stat-icon">🚗</div>
            <div className="stat-info">
              <div className="stat-title">Total Washes</div>
              <div className="stat-val">{loading ? '...' : totalWashes}</div>
            </div>
          </div>
          <Link to="/customer/loyalty" className="dash-stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <div className="stat-title">Loyalty ({loading ? '...' : tierName})</div>
              <div className="stat-val">{loading ? '...' : `${currentPoints.toLocaleString()} pts`}</div>
            </div>
          </Link>
          <div className="dash-stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <div className="stat-title">Saved this year</div>
              <div className="stat-val">{loading ? '...' : `${(savedThisYear / 1000).toLocaleString('vi-VN')}k VND`}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3>Upcoming Bookings</h3>
          <Link to="/customer/bookings" className="dash-link">View all</Link>
        </div>
        <div className="booking-list">
          {upcomingWashes.map(b => (
            <div key={b.id} className="booking-card active-booking">
              <div className="booking-status-indicator" />
              <div className="booking-main">
                <div className="booking-header">
                  <h4>{b.service}</h4>
                  <span className="badge badge-primary">{b.status}</span>
                </div>
                <div className="booking-details">
                  <span><strong>Date:</strong> {b.date}</span>
                  <span><strong>Vehicle:</strong> {b.car}</span>
                  <span><strong>Total:</strong> {b.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3>Recent Washes</h3>
        </div>
        <div className="booking-list">
          {pastWashes.map(b => (
            <div key={b.id} className="booking-card">
              <div className="booking-main">
                <div className="booking-header">
                  <h4>{b.service}</h4>
                  <span className="badge badge-success">{b.status}</span>
                </div>
                <div className="booking-details">
                  <span><strong>Date:</strong> {b.date}</span>
                  <span><strong>Vehicle:</strong> {b.car}</span>
                  <span><strong>Total:</strong> {b.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
