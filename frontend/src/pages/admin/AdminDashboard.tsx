import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBranches, getAdminDashboardStats, getAdminBookingStats, getUsers } from '../../services/api'
import type { Branch } from '../../types/branch'
import BookingStatsReport from '../../components/BookingStatsReport'
import '../manager/ManagerDashboard.css'
import './AdminDashboard.css'

function getWaveTrendChartData(revenueWeeks: number[] = [], weeklyAmounts: number[] = []) {
  const pcts = revenueWeeks && revenueWeeks.length > 0 ? revenueWeeks : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  const amts = weeklyAmounts && weeklyAmounts.length > 0 ? weeklyAmounts : pcts.map(() => 0)
  const n = pcts.length
  
  const width = 680
  const height = 200
  const padLeft = 55
  const padRight = 20
  const padTop = 32
  const padBottom = 28
  
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom

  let peakIdx = 0
  let maxPct = -1
  const points = pcts.map((pct, i) => {
    const x = padLeft + (i / (n - 1)) * innerW
    const clamped = Math.max(0, Math.min(100, pct))
    const y = padTop + (1 - (clamped > 0 ? Math.max(12, Math.min(88, clamped)) : 0) / 100) * innerH
    if (clamped > maxPct) {
      maxPct = clamped
      peakIdx = i
    }
    const amt = amts[i] ?? 0
    const label = amt >= 1000000 ? `${(amt / 1000000).toFixed(1)}M` : amt > 0 ? `${(amt / 1000).toFixed(0)}k` : '0 đ'
    return { x, y, pct: clamped, amt, label, weekLabel: `Tuần ${i + 1}`, isPeak: false }
  })

  if (points[peakIdx]) {
    points[peakIdx].isPeak = true
  }

  let linePath = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const mx = (p0.x + p1.x) / 2
    linePath += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`
  }

  const areaPath = `${linePath} L ${points[n - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`

  return { points, linePath, areaPath, width, height, padLeft, padRight, padTop, padBottom, innerH, peakPoint: points[peakIdx] }
}

export default function AdminDashboard() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [branchRes, dashboardStats, usersRes] = await Promise.all([
          getBranches({ pageSize: 100 }).catch(() => null),
          getAdminDashboardStats().catch(() => null),
          getUsers({ pageSize: 100 }).catch(() => null)
        ])
        setBranches(branchRes?.items ?? (Array.isArray(branchRes) ? branchRes : []))
        setStats(dashboardStats)
        setUsers(usersRes?.items ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const customerCount = stats?.totalCustomers ?? users.filter((u) => String(u.role).toLowerCase().includes('customer')).length
  const totalBookings = stats?.totalBookings ?? stats?.activeOrders ?? 0
  const loyaltyMembers = stats?.loyaltyMembers ?? customerCount
  const completedServices = stats?.completedServices ?? stats?.monthlyWashes ?? 0
  const totalVehicles = stats?.totalVehicles ?? customerCount
  const vouchersUsed = stats?.vouchersUsed ?? 0
  const pointsRedeemed = stats?.pointsRedeemed ?? 0
  const systemRev = stats?.systemRevenue ?? stats?.netRevenue ?? 0

  return (
    <div className="adm-dashboard">
      {/* Top Header */}
      <header className="adm-dash-header" style={{ marginBottom: '4px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Tổng quan hệ thống</h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginTop: '4px' }}>
            Hiệu suất thời gian thực và giám sát toàn diện các chi nhánh.
          </p>
        </div>
        <div className="adm-header-actions">
          <Link to="/admin/branches" className="mgr-btn-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10 3L3 8.5V17H7V12H13V17H17V8.5L10 3Z" />
            </svg>
            Quản lý chi nhánh
          </Link>
        </div>
      </header>

      {/* 8 Metric KPI Cards (Fleet Bento Style 4x2 Grid) */}
      <div className="adm-kpi-grid">
        {/* Card 1: Total Revenue */}
        <div className="adm-kpi-card">
          <div className="adm-kpi-card-top">
            <span className="adm-kpi-label">Tổng doanh thu</span>
            <div className="adm-kpi-icon-badge adm-kpi-icon-badge--blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="adm-kpi-bottom">
            <span className="adm-kpi-value">
              {loading ? '—' : `₫${systemRev.toLocaleString('vi-VN')}`}
            </span>
          </div>
        </div>

        {/* Card 2: Customers */}
        <div className="adm-kpi-card">
          <div className="adm-kpi-card-top">
            <span className="adm-kpi-label">Khách hàng</span>
            <div className="adm-kpi-icon-badge adm-kpi-icon-badge--indigo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
          </div>
          <div className="adm-kpi-bottom">
            <span className="adm-kpi-value">{loading ? '—' : customerCount}</span>
          </div>
        </div>

        {/* Card 3: Total Bookings */}
        <div className="adm-kpi-card">
          <div className="adm-kpi-card-top">
            <span className="adm-kpi-label">Lịch hẹn</span>
            <div className="adm-kpi-icon-badge adm-kpi-icon-badge--teal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
          </div>
          <div className="adm-kpi-bottom">
            <span className="adm-kpi-value">{loading ? '—' : totalBookings}</span>
          </div>
        </div>

        {/* Card 4: Loyalty Members */}
        <div className="adm-kpi-card">
          <div className="adm-kpi-card-top">
            <span className="adm-kpi-label">Thành viên tích điểm</span>
            <div className="adm-kpi-icon-badge adm-kpi-icon-badge--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            </div>
          </div>
          <div className="adm-kpi-bottom">
            <span className="adm-kpi-value">{loading ? '—' : loyaltyMembers}</span>
          </div>
        </div>

        {/* Card 5: Completed Services */}
        <div className="adm-kpi-card">
          <div className="adm-kpi-card-top">
            <span className="adm-kpi-label">Dịch vụ hoàn thành</span>
            <div className="adm-kpi-icon-badge adm-kpi-icon-badge--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
          </div>
          <div className="adm-kpi-bottom">
            <span className="adm-kpi-value">{loading ? '—' : completedServices}</span>
            <span className="adm-kpi-badge adm-kpi-badge--success">Hoàn thành 100%</span>
          </div>
        </div>

        {/* Card 6: Vehicles */}
        <div className="adm-kpi-card">
          <div className="adm-kpi-card-top">
            <span className="adm-kpi-label">Xe</span>
            <div className="adm-kpi-icon-badge adm-kpi-icon-badge--blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="9" rx="2"/><path d="M5 11l2-6h10l2 6"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/></svg>
            </div>
          </div>
          <div className="adm-kpi-bottom">
            <span className="adm-kpi-value">{loading ? '—' : totalVehicles}</span>
          </div>
        </div>

        {/* Card 7: Vouchers Used */}
        <div className="adm-kpi-card">
          <div className="adm-kpi-card-top">
            <span className="adm-kpi-label">Lượt dùng khuyến mãi</span>
            <div className="adm-kpi-icon-badge adm-kpi-icon-badge--amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
          </div>
          <div className="adm-kpi-bottom">
            <span className="adm-kpi-value">{loading ? '—' : vouchersUsed}</span>
          </div>
        </div>

        {/* Card 8: Points Redeemed */}
        <div className="adm-kpi-card">
          <div className="adm-kpi-card-top">
            <span className="adm-kpi-label">Điểm đã đổi</span>
            <div className="adm-kpi-icon-badge adm-kpi-icon-badge--rose">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            </div>
          </div>
          <div className="adm-kpi-bottom">
            <span className="adm-kpi-value">{loading ? '—' : pointsRedeemed}</span>
          </div>
        </div>
      </div>

      {/* Main Bento Grid: Xu hướng doanh thu (Wave Curve) + Trạng thái lịch hẹn */}
      <section className="adm-main-grid">
        {/* Left Card: Xu hướng doanh thu theo tháng / tuần */}
        <div className="adm-trend-card">
          <div className="adm-trend-header">
            <div>
              <h3 className="adm-trend-title">Xu hướng doanh thu</h3>
              <span className="adm-trend-tag">Đang hiển thị: Toàn thời gian</span>
            </div>
            <div className="adm-trend-legend" style={{ marginBottom: 0 }}>
              <span className="adm-trend-legend-dot" />
              <span>Doanh thu tuần & tháng</span>
            </div>
          </div>

          {/* Smooth Wave Chart */}
          <div className="adm-wave-container">
            {(() => {
              const { points, linePath, areaPath, width, height, padLeft, padRight, padTop, innerH } = getWaveTrendChartData(stats?.revenueWeeks, stats?.revenueWeeklyAmounts)
              return (
                <svg 
                  viewBox={`0 0 ${width} ${height}`} 
                  preserveAspectRatio="none"
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="waveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                      <stop offset="85%" stopColor="#2563eb" stopOpacity="0.03" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="waveLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="50%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <filter id="waveGlow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2563eb" floodOpacity="0.3" />
                    </filter>
                  </defs>

                  {/* Y-axis horizontal grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = padTop + ratio * innerH
                    const tickVal = Math.round(systemRev * (1 - ratio))
                    const formattedTick = tickVal >= 1000000
                      ? `${(tickVal / 1000000).toLocaleString('vi-VN')} tr`
                      : `${(tickVal / 1000).toLocaleString('vi-VN')} k`
                    return (
                      <g key={idx}>
                        <line 
                          x1={padLeft} 
                          y1={y} 
                          x2={width - padRight} 
                          y2={y} 
                          stroke="#e2e8f0" 
                          strokeWidth="1" 
                          strokeDasharray={ratio === 1 ? 'none' : '3 3'}
                        />
                        <text 
                          x={padLeft - 8} 
                          y={y + 3.5} 
                          textAnchor="end" 
                          fontSize="10" 
                          fill="#94a3b8" 
                          fontWeight="600"
                        >
                          {ratio === 1 ? '0 đ' : formattedTick}
                        </text>
                      </g>
                    )
                  })}

                  <path d={areaPath} fill="url(#waveAreaGrad)" />

                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="url(#waveLineGrad)" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    filter="url(#waveGlow)"
                  />

                  {points.map((pt, i) => (
                    <g key={`pt-${i}`}>
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r={pt.isPeak ? 5.5 : 4} 
                        fill="#ffffff" 
                        stroke="#2563eb" 
                        strokeWidth={pt.isPeak ? 3 : 2.5} 
                      />
                      
                      {pt.isPeak && (
                        <g>
                          <rect 
                            x={pt.x - 26} 
                            y={pt.y - 32} 
                            width="52" 
                            height="24" 
                            rx="5" 
                            fill="#0f172a" 
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                          />
                          <polygon 
                            points={`${pt.x - 4},${pt.y - 8} ${pt.x + 4},${pt.y - 8} ${pt.x},${pt.y - 3}`} 
                            fill="#0f172a" 
                          />
                          <text 
                            x={pt.x} 
                            y={pt.y - 16} 
                            textAnchor="middle" 
                            fontSize="10.5" 
                            fontWeight="700" 
                            fill="#ffffff"
                          >
                            {pt.label}
                          </text>
                        </g>
                      )}

                      <text 
                        x={pt.x} 
                        y={height - 8} 
                        textAnchor="middle" 
                        fontSize="10.5" 
                        fontWeight="600" 
                        fill="#64748b"
                      >
                        {pt.weekLabel}
                      </text>
                    </g>
                  ))}
                </svg>
              )
            })()}
          </div>

          {/* Bottom 3 Summary Boxes */}
          <div className="adm-trend-summary-row">
            <div className="adm-summary-box">
              <div className="adm-summary-box-label">Tổng doanh thu</div>
              <div className="adm-summary-box-val">₫{systemRev.toLocaleString('vi-VN')}</div>
            </div>
            <div className="adm-summary-box">
              <div className="adm-summary-box-label">Trung bình theo tháng</div>
              <div className="adm-summary-box-val">₫{systemRev.toLocaleString('vi-VN')}</div>
            </div>
            <div className="adm-summary-box">
              <div className="adm-summary-box-label">Doanh thu cao nhất</div>
              <div className="adm-summary-box-val">₫{systemRev.toLocaleString('vi-VN')}</div>
              <div className="adm-summary-box-sub">Tháng {new Date().getMonth() + 1}, {new Date().getFullYear()}</div>
            </div>
          </div>
        </div>

        {/* Right Card: Trạng thái lịch hẹn */}
        <div className="adm-trend-card">
          <div className="adm-trend-header">
            <div>
              <h3 className="adm-trend-title">Trạng thái lịch hẹn</h3>
              <span className="adm-trend-tag">Đang hiển thị: Toàn thời gian</span>
            </div>
            <span className="adm-kpi-badge adm-kpi-badge--success" style={{ padding: '4px 10px', fontSize: '11.5px' }}>
              Tỷ lệ hoàn thành {totalBookings > 0 ? Math.round((completedServices / totalBookings) * 100) : 100}%
            </span>
          </div>

          <div className="adm-status-body">
            {/* Donut Ring */}
            {(() => {
              const activeCount = stats?.activeOrders ?? (totalBookings - completedServices);
              const radius = 52;
              const circ = 2 * Math.PI * radius;
              const completedPct = totalBookings > 0 ? (completedServices / totalBookings) : 1;
              const activePct = totalBookings > 0 ? (activeCount / totalBookings) : 0;

              return (
                <div className="adm-donut-circle-wrap">
                  <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx="65"
                      cy="65"
                      r={radius}
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="14"
                    />
                    {/* Active/Pending slice (Amber) */}
                    <circle
                      cx="65"
                      cy="65"
                      r={radius}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="14"
                      strokeDasharray={`${circ * (completedPct + activePct)} ${circ * Math.max(0, 1 - completedPct - activePct)}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Completed slice (Green) */}
                    <circle
                      cx="65"
                      cy="65"
                      r={radius}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="14"
                      strokeDasharray={`${circ * completedPct} ${circ * Math.max(0, 1 - completedPct)}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="adm-donut-center-text">
                    <div className="adm-donut-center-num">{totalBookings || completedServices}</div>
                    <div className="adm-donut-center-sub">tổng lịch hẹn</div>
                  </div>
                </div>
              );
            })()}

            {/* Breakdown Progress Bars */}
            <div className="adm-status-breakdown">
              {/* Row 1: Hoàn thành */}
              <div className="adm-status-row-item">
                <div className="adm-status-row-top">
                  <div className="adm-status-row-left">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    <span>Hoàn thành</span>
                  </div>
                  <span className="adm-status-row-count">{completedServices}</span>
                </div>
                <div className="adm-progress-bar-bg">
                  <div className="adm-progress-bar-fill adm-progress-bar-fill--green" style={{ width: `${totalBookings > 0 ? Math.min(100, Math.round((completedServices / totalBookings) * 100)) : 100}%` }} />
                </div>
              </div>

              {/* Row 2: Đang chờ */}
              <div className="adm-status-row-item">
                <div className="adm-status-row-top">
                  <div className="adm-status-row-left">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                    <span>Đang chờ / Đang xử lý</span>
                  </div>
                  <span className="adm-status-row-count">{stats?.activeOrders ?? (totalBookings - completedServices)}</span>
                </div>
                <div className="adm-progress-bar-bg">
                  <div className="adm-progress-bar-fill adm-progress-bar-fill--orange" style={{ width: `${totalBookings > 0 ? Math.round(((stats?.activeOrders ?? (totalBookings - completedServices)) / totalBookings) * 100) : 0}%` }} />
                </div>
              </div>

              {/* Row 3: Đã hủy */}
              <div className="adm-status-row-item">
                <div className="adm-status-row-top">
                  <div className="adm-status-row-left">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    <span>Đã hủy</span>
                  </div>
                  <span className="adm-status-row-count">{stats?.cancelledOrders ?? 0}</span>
                </div>
                <div className="adm-progress-bar-bg">
                  <div className="adm-progress-bar-fill adm-progress-bar-fill--red" style={{ width: `${totalBookings > 0 ? Math.round(((stats?.cancelledOrders ?? 0) / totalBookings) * 100) : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          <Link to="/admin/branches" className="fleet-btn-secondary" style={{ marginTop: '20px' }}>
            Xem tất cả lịch hẹn & chi nhánh
          </Link>
        </div>
      </section>

      {/* Recent Activity Table (Full-width Bento Box with proper spacing and addresses) */}
      <section className="fleet-card">
        <div className="fleet-card-header">
          <h3>Hoạt động gần đây</h3>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Nhật ký vận hành thời gian thực</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="fleet-activity-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Thời gian</th>
                <th style={{ width: '35%' }}>Xe / Chi nhánh</th>
                <th style={{ width: '35%' }}>Hành động / Dịch vụ</th>
                <th style={{ width: '15%' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b, i) => {
                const times = ['10:42 SA', '10:15 SA', '09:55 SA', '08:30 SA']
                const actions = [
                  'Hoàn thành dịch vụ: Gói Cao Cấp',
                  'Xe vào khoang rửa 2',
                  'Xe vào khoang chăm sóc & đánh bóng',
                  'Khách đã check-in qua ứng dụng'
                ]
                return (
                  <tr key={b.branchId}>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>{times[i % times.length]}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{b.city || 'Việt Nam'} · {b.branchCode}</div>
                    </td>
                    <td style={{ color: '#334155' }}>{actions[i % actions.length]}</td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.isActive ? '#10b981' : '#f59e0b' }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: b.isActive ? '#10b981' : '#f59e0b' }}>
                          {b.isActive ? 'Hoạt động tốt' : 'Đang bảo trì'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {branches.length === 0 && (
                <>
                  <tr>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>10:42 SA</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>AutoWash Pro Hải Châu</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>Đà Nẵng · BR-003</div>
                    </td>
                    <td style={{ color: '#334155' }}>Hoàn thành dịch vụ: Gói Cao Cấp</td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#10b981' }}>Hoạt động tốt</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>10:15 SA</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>AutoWash Pro Cầu Giấy</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>Hà Nội · BR-002</div>
                    </td>
                    <td style={{ color: '#334155' }}>Xe vào khoang rửa 4</td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00687a' }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#00687a' }}>Đang xử lý</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>09:55 SA</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>AutoWash Pro Quận 1</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>TP. Hồ Chí Minh · BR-001</div>
                    </td>
                    <td style={{ color: '#334155' }}>Xe vào khoang chăm sóc & đánh bóng</td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#3b82f6' }}>Đang rửa xe</span>
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed Revenue & Orders Report Table */}
      <BookingStatsReport fetchStats={getAdminBookingStats} />
    </div>
  )
}
