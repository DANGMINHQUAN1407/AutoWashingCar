import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBranchServices, getMyBranch, getManagerDashboardStats, getManagerBookingStats, getBookingQueue } from '../../services/api'
import type { Branch } from '../../types/branch'
import { extractErrorMessage } from '../../utils/errorUtils'
import BookingStatsReport from '../../components/BookingStatsReport'
import './ManagerDashboard.css'

const WEEK_LABELS = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5', 'Tuần 6', 'Tuần 7', 'Tuần 8', 'Tuần 9', 'Tuần 10']

function getSingleLineChartData(revenueWeeks: number[] = [], weeklyAmounts: number[] = []) {
  const pcts = revenueWeeks && revenueWeeks.length > 0 ? revenueWeeks : [25, 48, 22, 42, 58, 30, 88, 46, 52, 40]
  const amts = weeklyAmounts && weeklyAmounts.length > 0 ? weeklyAmounts : pcts.map(p => p * 35000)
  const n = pcts.length
  
  const width = 800
  const height = 240
  const padLeft = 45
  const padRight = 30
  const padTop = 45
  const padBottom = 35
  
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom

  let peakIdx = 0
  let maxPct = -1
  const points = pcts.map((pct, i) => {
    const x = padLeft + (i / (n - 1)) * innerW
    const clamped = Math.max(8, Math.min(92, pct))
    const y = padTop + (1 - clamped / 100) * innerH
    if (clamped > maxPct) {
      maxPct = clamped
      peakIdx = i
    }
    const amt = amts[i] ?? 0
    const label = amt >= 1000000 ? `${(amt / 1000000).toFixed(1)}M` : amt > 0 ? `${(amt / 1000).toFixed(0)}k` : '₫0'
    return { x, y, pct: clamped, amt, label, weekLabel: WEEK_LABELS[i] || `W${i + 1}`, isPeak: false }
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

function MiniRingProgress({ percent, color = '#38bdf8' }: { percent: number; color?: string }) {
  const size = 36
  const stroke = 3.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', fontSize: '9px', fontWeight: 700, color: '#ffffff' }}>{percent}%</span>
    </div>
  )
}

function SalesDonutChart({ totalRate = 100, onlinePct = 55, walkInPct = 30, vipPct = 15 }: { totalRate?: number; onlinePct?: number; walkInPct?: number; vipPct?: number }) {
  const size = 170
  const strokeWidth = 16
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  const c1 = (onlinePct / 100) * circumference
  const c2 = (walkInPct / 100) * circumference
  const c3 = (vipPct / 100) * circumference
  
  const offset1 = 0
  const offset2 = -c1
  const offset3 = -(c1 + c2)

  return (
    <div className="mgr-panel" style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Tỷ lệ kênh bán hàng</h3>
        <span style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}>•••</span>
      </div>

      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, margin: '0 auto 16px' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
            strokeDasharray={`${c1} ${circumference - c1}`}
            strokeDashoffset={offset1}
            strokeLinecap="round"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth={strokeWidth}
            strokeDasharray={`${c2} ${circumference - c2}`}
            strokeDashoffset={offset2}
            strokeLinecap="round"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeDasharray={`${c3} ${circumference - c3}`}
            strokeDashoffset={offset3}
            strokeLinecap="round"
          />
        </svg>
        
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalRate}%</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: '3px' }}>Hoàn tất</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3b82f6' }} />
          Online ({onlinePct}%)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e' }} />
          Trực tiếp ({walkInPct}%)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444' }} />
          VIP ({vipPct}%)
        </div>
      </div>
    </div>
  )
}

function statusClass(status: number) {
  if (status === 5 || status === 6) return 'mgr-status-badge--completed'
  if (status === 1 || status === 2) return 'mgr-status-badge--pending'
  return 'mgr-status-badge--progress'
}

function getStatusLabel(status: number) {
  switch (status) {
    case 1: return 'Chờ xác nhận'
    case 2: return 'Đã xác nhận'
    case 3: return 'Đã check-in'
    case 4: return 'Đang thực hiện'
    case 5: return 'Hoàn thành'
    case 6: return 'Đã đóng'
    case 7: return 'Đã hủy'
    case 8: return 'Vắng mặt'
    default: return 'Khác'
  }
}

const getInitials = (name?: string) => {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const getAvatarColor = (name?: string) => {
  if (!name) return 'blue'
  const colors = ['cyan', 'amber', 'blue', 'teal']
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myBranch, setMyBranch] = useState<Branch | null>(null)
  const [serviceCount, setServiceCount] = useState(0)
  const [activeServiceCount, setActiveServiceCount] = useState(0)
  const [bookings, setBookings] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [myBranchResult, statsResult] = await Promise.all([
          getMyBranch().catch(() => null),
          getManagerDashboardStats().catch(() => null)
        ])

        if (cancelled) return

        setMyBranch(myBranchResult)
        setStats(statsResult)

        if (myBranchResult?.branchId) {
          const [services, queueRes] = await Promise.all([
            getBranchServices(myBranchResult.branchId).catch(() => []),
            getBookingQueue({ page: 1, pageSize: 5 }).catch(() => null)
          ])
          if (!cancelled) {
            setServiceCount(services.length)
            setActiveServiceCount(services.filter((s) => s.isActive).length)
            setBookings(queueRes?.items ?? [])
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractErrorMessage(err, 'Không thể tải dữ liệu Dashboard.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const subtitle = myBranch
    ? `Theo dõi hiệu suất vận hành thời gian thực cho ${myBranch.name}.`
    : 'Chào mừng! Hiện tại tài khoản của bạn chưa được gán chi nhánh.'

  if (loading) {
    return <div className="mgr-loading">Đang tải bảng điều khiển...</div>
  }

  if (error && !myBranch) {
    return <div className="mgr-error">{error}</div>
  }

  return (
    <div className="mgr-dashboard">
      <div className="mgr-dash-header">
        <div>
          <h2>Tổng quan chi nhánh</h2>
          <p>{subtitle}</p>
        </div>
        <Link to="/manager/services" className="mgr-btn-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M13 12.5L8 7.5L9.4 6.1L13 9.7L17.6 5.1L19 6.5L13 12.5" />
          </svg>
          Quản lý dịch vụ
        </Link>
      </div>

      <div className="mgr-stats-grid">
        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--cyan">
              <svg width="22" height="20" viewBox="0 0 22 20" fill="currentColor" aria-hidden>
                <path d="M11 4C10.58 4 10.23 3.85 9.94 3.56C9.65 3.27 9.5 2.92 9.5 2.5C9.5 2.15 9.62 1.78 9.86 1.38C10.1 0.98 10.48 0.52 11 0C11.52 0.52 11.9 0.98 12.14 1.38C12.38 1.78 12.5 2.15 12.5 2.5C12.5 2.92 12.35 3.27 12.06 3.56C11.77 3.85 11.42 4 11 4M6 4C5.58 4 5.23 3.85 4.94 3.56C4.65 3.27 4.5 2.92 4.5 2.5C4.5 2.15 4.62 1.78 4.86 1.38C5.1 0.98 5.48 0.52 6 0C6.52 0.52 6.9 0.98 7.14 1.38C7.38 1.78 7.5 2.15 7.5 2.5C7.5 2.92 7.35 3.27 7.06 3.56C6.77 3.85 6.42 4 6 4M16 4C15.58 4 15.23 3.85 14.94 3.56C14.65 3.27 14.5 2.92 14.5 2.5C14.5 2.15 14.62 1.78 14.86 1.38C15.1 0.98 15.48 0.52 16 0C16.52 0.52 16.9 0.98 17.14 1.38C17.38 1.78 17.5 2.15 17.5 2.5C17.5 2.92 17.35 3.27 17.06 3.56C16.77 3.85 16.42 4 16 4M5 18V19C5 19.28 4.9 19.52 4.71 19.71C4.52 19.9 4.28 20 4 20H3C2.72 20 2.48 19.9 2.29 19.71C2.1 19.52 2 19.28 2 19V11L4.1 5C4.2 4.7 4.38 4.46 4.64 4.28C4.9 4.09 5.18 4 5.5 4H16.5C16.82 4 17.1 4.09 17.36 4.28C17.62 4.46 17.8 4.7 17.9 5L20 11V19C20 19.28 19.9 19.52 19.71 19.71C19.52 19.9 19.28 20 19 20H18C17.72 20 17.48 19.9 17.29 19.71C17.1 19.52 17 19.28 17 19V18H5M4.8 9H17.2L16.15 6H5.85L4.8 9" />
              </svg>
            </div>
            <MiniRingProgress percent={100} color="#67e8f9" />
          </div>
          <div className="mgr-stat-label">Dịch vụ đang mở</div>
          <div className="mgr-stat-value">{activeServiceCount || serviceCount}</div>
        </div>

        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--amber">
              <svg width="22" height="16" viewBox="0 0 22 16" fill="currentColor" aria-hidden>
                <path d="M0 16V13.2C0 12.63 0.15 12.11 0.44 11.64C0.73 11.16 1.12 10.8 1.6 10.55C2.63 10.03 3.68 9.65 4.75 9.39C5.82 9.13 6.9 9 8 9C9.1 9 10.18 9.13 11.25 9.39C12.32 9.65 13.37 10.03 14.4 10.55C14.88 10.8 15.27 11.16 15.56 11.64C15.85 12.11 16 12.63 16 13.2V16H0M18 16V13C18 12.27 17.8 11.56 17.39 10.89C16.98 10.21 16.4 9.63 15.65 9.15C16.5 9.25 17.3 9.42 18.05 9.66C18.8 9.9 19.5 10.2 20.15 10.55C20.75 10.88 21.21 11.25 21.53 11.66C21.84 12.07 22 12.52 22 13V16H18M8 8C6.9 8 5.96 7.61 5.18 6.83C4.39 6.04 4 5.1 4 4C4 2.9 4.39 1.96 5.18 1.18C5.96 0.39 6.9 0 8 0C9.1 0 10.04 0.39 10.82 1.18C11.61 1.96 12 2.9 12 4C12 5.1 11.61 6.04 10.82 6.83C10.04 7.61 9.1 8 8 8" />
              </svg>
            </div>
            <MiniRingProgress percent={100} color="#fde047" />
          </div>
          <div className="mgr-stat-label">Chi nhánh quản lý</div>
          <div className="mgr-stat-value">{myBranch ? 1 : 0}</div>
        </div>

        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--blue">
              <svg width="22" height="16" viewBox="0 0 22 16" fill="currentColor" aria-hidden>
                <path d="M15 9C14.17 9 13.46 8.71 12.88 8.13C12.29 7.54 12 6.83 12 6C12 5.17 12.29 4.46 12.88 3.88C13.46 3.29 14.17 3 15 3C15.83 3 16.54 3.29 17.13 3.88C17.71 4.46 18 5.17 18 6C18 6.83 17.71 7.54 17.13 8.13C16.54 8.71 15.83 9 15 9M8 12C7.45 12 6.98 11.8 6.59 11.41C6.19 11.02 6 10.55 6 10V2C6 1.45 6.19 0.98 6.59 0.59C6.98 0.19 7.45 0 8 0H18C18.55 0 19.02 0.19 19.41 0.59C19.81 0.98 20 1.45 20 2V10C20 10.55 19.81 11.02 19.41 11.41C19.02 11.8 18.55 12 18 12H8" />
              </svg>
            </div>
            <MiniRingProgress percent={100} color="#93c5fd" />
          </div>
          <div className="mgr-stat-label">Doanh thu chi nhánh</div>
          <div className="mgr-stat-value">{loading ? '—' : `₫${(stats?.branchRevenue ?? 0).toLocaleString('vi-VN')}`}</div>
        </div>

        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--teal">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M12 14C11.17 14 10.44 13.71 9.79 13.21C9.15 12.71 8.75 12.05 8.6 11.25C8.45 10.45 8.55 9.67 8.9 8.9C9.25 8.13 9.8 7.5 10.55 7C11.3 6.5 12.13 6.25 13.05 6.25C13.97 6.25 14.8 6.5 15.55 7C16.3 7.5 16.85 8.13 17.2 8.9C17.55 9.67 17.65 10.45 17.5 11.25C17.35 12.05 16.95 12.71 16.3 13.21C15.65 13.71 14.92 14 14.1 14M9 13H3V3H9V13M7 11V5H5V11H7" />
              </svg>
            </div>
            <MiniRingProgress percent={100} color="#6ee7b7" />
          </div>
          <div className="mgr-stat-label">Đơn đang xử lý</div>
          <div className="mgr-stat-value">{loading ? '—' : (stats?.activeOrders ?? 0)}</div>
        </div>
      </div>

      <BookingStatsReport fetchStats={getManagerBookingStats} />

      <div className="mgr-main-grid">
        <div className="mgr-left-col">
          <div className="mgr-panel mgr-chart-panel">
            <div className="mgr-chart-header">
              <div>
                <h3>Biểu đồ doanh thu tuần</h3>
                <div style={{ fontSize: '13px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
                  Tháng hiện tại: ₫{(stats?.currentMonthRevenue ?? stats?.netRevenue ?? stats?.branchRevenue ?? 0).toLocaleString('vi-VN')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mgr-filter-pill">Theo tuần ▾</span>
              </div>
            </div>

            {(() => {
              const { points, linePath, areaPath, width, height, padLeft, padRight, padTop, padBottom, innerH } = getSingleLineChartData(stats?.revenueWeeks, stats?.revenueWeeklyAmounts)
              return (
                <div className="coupler-chart-container" style={{ position: 'relative', width: '100%', height: '240px', marginTop: '10px' }}>
                  <svg 
                    viewBox={`0 0 ${width} ${height}`} 
                    preserveAspectRatio="none"
                    style={{ width: '100%', height: '100%', overflow: 'visible' }}
                  >
                    <defs>
                      <linearGradient id="singleWaveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                        <stop offset="80%" stopColor="#3b82f6" stopOpacity="0.02" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="singleWaveLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                      <filter id="singleWaveGlow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.35" />
                      </filter>
                    </defs>

                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, idx) => {
                      const y = padTop + ratio * innerH
                      return (
                        <g key={idx}>
                          <line 
                            x1={padLeft} 
                            y1={y} 
                            x2={width - padRight} 
                            y2={y} 
                            stroke="#f1f5f9" 
                            strokeWidth="1.2" 
                            strokeDasharray={ratio === 1 ? 'none' : '4 4'}
                          />
                          <text 
                            x={padLeft - 10} 
                            y={y + 4} 
                            textAnchor="end" 
                            fontSize="11" 
                            fill="#94a3b8" 
                            fontWeight="500"
                          >
                            {Math.round((1 - ratio) * 100)}
                          </text>
                        </g>
                      )
                    })}

                    <path d={areaPath} fill="url(#singleWaveAreaGrad)" />

                    <path 
                      d={linePath} 
                      fill="none" 
                      stroke="url(#singleWaveLineGrad)" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      filter="url(#singleWaveGlow)"
                    />

                    {points.map((pt, i) => (
                      <g key={`pt-${i}`}>
                        {pt.isPeak && (
                          <rect 
                            x={pt.x - 16} 
                            y={pt.y} 
                            width="32" 
                            height={height - padBottom - pt.y} 
                            fill="#3b82f6" 
                            opacity="0.12" 
                            rx="4"
                          />
                        )}

                        <circle 
                          cx={pt.x} 
                          cy={pt.y} 
                          r={pt.isPeak ? 6 : 4.5} 
                          fill="#ffffff" 
                          stroke="#3b82f6" 
                          strokeWidth={pt.isPeak ? 3 : 2.5} 
                        />
                        
                        {pt.isPeak && (
                          <g>
                            <rect 
                              x={pt.x - 30} 
                              y={pt.y - 38} 
                              width="60" 
                              height="28" 
                              rx="6" 
                              fill="#0f172a" 
                              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.25))"
                            />
                            <polygon 
                              points={`${pt.x - 5},${pt.y - 10} ${pt.x + 5},${pt.y - 10} ${pt.x},${pt.y - 4}`} 
                              fill="#0f172a" 
                            />
                            <text 
                              x={pt.x} 
                              y={pt.y - 26} 
                              textAnchor="middle" 
                              fontSize="9" 
                              fontWeight="600" 
                              fill="#94a3b8"
                            >
                              Doanh thu
                            </text>
                            <text 
                              x={pt.x} 
                              y={pt.y - 14} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="700" 
                              fill="#ffffff"
                            >
                              {pt.label}
                            </text>
                          </g>
                        )}

                        <text 
                          x={pt.x} 
                          y={height - 10} 
                          textAnchor="middle" 
                          fontSize="11.5" 
                          fontWeight="600" 
                          fill="#64748b"
                        >
                          {pt.weekLabel}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              )
            })()}
          </div>

          <div className="mgr-panel">
            <div className="mgr-panel-header">
              <h3>Lịch hẹn gần đây</h3>
              <Link to="/manager/slots" className="mgr-link-btn">Xem tất cả</Link>
            </div>
            <table className="mgr-table">
              <thead>
                <tr>
                  <th>Tên khách hàng</th>
                  <th>Gói dịch vụ</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#bbc9cf', padding: '24px' }}>
                      Không có lịch hẹn nào hôm nay
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const initials = getInitials(booking.customerName)
                    const avatarColor = getAvatarColor(booking.customerName)
                    const statusLbl = getStatusLabel(booking.bookingStatus)
                    const timeStr = booking.slotStartTime ? booking.slotStartTime.substring(0, 5) : '—'
                    return (
                      <tr key={booking.bookingId}>
                        <td>
                          <div className="mgr-customer-cell">
                            <div className={`mgr-avatar mgr-avatar--${avatarColor}`}>{initials}</div>
                            {booking.customerName || 'Khách hàng'}
                          </div>
                        </td>
                        <td>{booking.serviceSummary || 'Rửa xe'}</td>
                        <td className="muted">{timeStr}</td>
                        <td>
                          <span className={`mgr-status-badge ${statusClass(booking.bookingStatus)}`}>
                            <span className="mgr-status-dot" />
                            {statusLbl}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mgr-right-col">
          <SalesDonutChart 
            totalRate={stats?.conversionRate ?? 100} 
            onlinePct={stats?.onlinePct ?? 55} 
            walkInPct={stats?.walkInPct ?? 30} 
            vipPct={stats?.vipPct ?? 15} 
          />

          <div className="mgr-panel mgr-branch-info">
            <div className="mgr-branch-info-glow" />
            <h3>Thông tin chi nhánh</h3>
            {myBranch ? (
              <>
                <div className="mgr-field-label">Tên chi nhánh</div>
                <div className="mgr-field-value mgr-field-value--lg">{myBranch.name}</div>

                <div className="mgr-field-label">Địa chỉ</div>
                <div className="mgr-address-row">
                  <svg width="12" height="15" viewBox="0 0 12 15" fill="currentColor" aria-hidden>
                    <path d="M6 7.5C6.41 7.5 6.77 7.35 7.06 7.06C7.35 6.77 7.5 6.41 7.5 6C7.5 5.59 7.35 5.23 7.06 4.94C6.77 4.65 6.41 4.5 6 4.5C5.59 4.5 5.23 4.65 4.94 4.94C4.65 5.23 4.5 5.59 4.5 6C4.5 6.41 4.65 6.77 4.94 7.06C5.23 7.35 5.59 7.5 6 7.5M6 13C7.53 11.61 8.66 10.34 9.39 9.2C10.13 8.05 10.5 7.04 10.5 6.15C10.5 4.79 10.07 3.67 9.2 2.8C8.33 1.93 7.26 1.5 6 1.5C4.74 1.5 3.67 1.93 2.8 2.8C1.93 3.67 1.5 4.79 1.5 6.15C1.5 7.04 1.87 8.05 2.61 9.2C3.34 10.34 4.48 11.61 6 13M6 15C3.99 13.29 2.48 11.7 1.49 10.23C0.5 8.76 0 7.4 0 6.15C0 4.28 0.6 2.78 1.81 1.67C3.02 0.56 4.41 0 6 0C7.59 0 8.98 0.56 10.19 1.67C11.4 2.78 12 4.28 12 6.15C12 7.4 11.5 8.76 10.51 10.23C9.52 11.7 8.01 13.29 6 15" />
                  </svg>
                  <div className="mgr-field-value">{myBranch.address}, {myBranch.city}</div>
                </div>

                {myBranch.phone && (
                  <>
                    <div className="mgr-field-label">Số điện thoại</div>
                    <div className="mgr-field-value">{myBranch.phone}</div>
                  </>
                )}

                <div className="mgr-branch-status-row">
                  <span>Trạng thái hoạt động</span>
                  <span className={`mgr-status-badge ${myBranch.isActive ? 'mgr-status-badge--open' : 'mgr-status-badge--closed'}`}>
                    {myBranch.isActive ? 'Đang mở cửa' : 'Đóng cửa'}
                  </span>
                </div>
              </>
            ) : (
              <p className="mgr-field-value">Tài khoản chưa được phân công quản lý chi nhánh nào.</p>
            )}
          </div>

          <div className="mgr-panel mgr-quick-actions">
            <h3>Thao tác nhanh</h3>
            <div className="mgr-quick-actions-list">
              <Link to="/manager/services" className="mgr-quick-action-btn">
                <span className="mgr-quick-action-icon" style={{ background: 'rgba(165,231,255,0.1)', color: '#a5e7ff' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M13 12.5L8 7.5L9.4 6.1L13 9.7L17.6 5.1L19 6.5L13 12.5M10 17.5C8.62 17.5 7.32 17.24 6.1 16.71C4.88 16.19 3.83 15.46 2.93 14.54C2.04 13.62 1.31 12.57 0.79 11.35C0.26 10.12 0 8.83 0 7.5C0 6.17 0.26 4.88 0.79 3.65C1.31 2.43 2.04 1.38 2.93 0.46C3.83 -0.46 4.88 -1.19 6.1 -1.71C7.32 -2.24 8.62 -2.5 10 -2.5C11.38 -2.5 12.68 -2.24 13.9 -1.71C15.12 -1.19 16.17 -0.46 17.07 0.46C17.96 1.38 18.69 2.43 19.21 3.65C19.74 4.88 20 6.17 20 7.5C20 8.83 19.74 10.12 19.21 11.35C18.69 12.57 17.96 13.62 17.07 14.54C16.17 15.46 15.12 16.19 13.9 16.71C12.68 17.24 11.38 17.5 10 17.5" /></svg>
                </span>
                Quản lý dịch vụ
              </Link>
              <Link to="/manager/staff" className="mgr-quick-action-btn">
                <span className="mgr-quick-action-icon" style={{ background: 'rgba(175,198,255,0.1)', color: '#afc6ff' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M4 16H16V4H4V16M2 18C1.45 18 0.98 17.8 0.59 17.41C0.19 17.02 0 16.55 0 16V2C0 1.45 0.19 0.98 0.59 0.59C0.98 0.19 1.45 0 2 0H18C18.55 0 19.02 0.19 19.41 0.59C19.81 0.98 20 1.45 20 2V16C20 16.55 19.81 17.02 19.41 17.41C19.02 17.8 18.55 18 18 18H2" /></svg>
                </span>
                Quản lý nhân viên
              </Link>
              <Link to="/manager/slots" className="mgr-quick-action-btn">
                <span className="mgr-quick-action-icon" style={{ background: 'rgba(255,178,41,0.1)', color: '#ffb229' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M4 16H16V6H4V16M2 18C1.45 18 0.98 17.8 0.59 17.41C0.19 17.02 0 16.55 0 16V4C0 3.45 0.19 2.98 0.59 2.59C0.98 2.19 1.45 2 2 2H16C16.55 2 17.02 2.19 17.41 2.59C17.81 2.98 18 3.45 18 4V16C18 16.55 17.81 17.02 17.41 17.41C17.02 17.8 16.55 18 16 18H2" /></svg>
                </span>
                Quản lý khung giờ
              </Link>
            </div>
          </div>

          <div className="mgr-panel mgr-pro-tip">
            <div className="mgr-pro-tip-bg" />
            <div className="mgr-pro-tip-content">
              <div className="mgr-pro-tip-label">Mẹo quản lý</div>
              <div className="mgr-pro-tip-text">
                Khung giờ cao điểm đạt 95% công suất.<br />
                Hãy tối ưu sắp xếp các khoang rửa.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
