import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBranches, getAdminDashboardStats, getAdminBookingStats } from '../../services/api'
import type { Branch } from '../../types/branch'
import BookingStatsReport from '../../components/BookingStatsReport'
import '../manager/ManagerDashboard.css'
import './AdminDashboard.css'

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10']

const SYSTEM_ALERTS = [
  {
    id: 1,
    title: 'Branch District 7 — low staff',
    message: 'Only 2 staff scheduled for peak hours tomorrow.',
    type: 'warning' as const,
  },
  {
    id: 2,
    title: 'New manager account created',
    message: 'Manager account for Branch Thu Duc was created successfully.',
    type: 'info' as const,
  },
  {
    id: 3,
    title: 'Monthly revenue target reached',
    message: 'System has exceeded the monthly revenue goal by 12%.',
    type: 'success' as const,
  },
]

export default function AdminDashboard() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const branchResult = await getBranches({ pageSize: 100 })
        const dashboardStats = await getAdminDashboardStats()

        if (!cancelled) {
          setBranches(branchResult.items)
          setStats(dashboardStats)
        }
      } catch (err) {
        console.warn('Failed to load admin dashboard stats:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const activeBranches = branches.filter((b) => b.isActive)
  const inactiveBranches = branches.filter((b) => !b.isActive)
  const networkHealth =
    branches.length > 0
      ? Math.round((activeBranches.length / branches.length) * 100)
      : 0

  return (
    <div className="adm-dashboard">
      {/* Header */}
      <header className="mgr-dash-header">
        <div>
          <h2>System Dashboard</h2>
          <p>Overview of all branches and system health across the network.</p>
        </div>
        <Link to="/admin/branches" className="mgr-btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Manage Branches
        </Link>
      </header>

      {/* Stats Grid */}
      <section className="mgr-stats-grid">
        {/* Total Branches */}
        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--cyan">
              <svg width="22" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="mgr-stat-trend">
              <span className="mgr-status-dot" style={{ background: '#00FFC2' }} />
              {loading ? '…' : `${activeBranches.length} active`}
            </div>
          </div>
          <div className="mgr-stat-label">Total Branches</div>
          <div className="mgr-stat-value">{loading ? '—' : branches.length}</div>
        </div>

        {/* Total Staff */}
        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--amber">
              <svg width="22" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="mgr-stat-trend">
              <svg width="14" height="8" viewBox="0 0 14 8" fill="#00FFC2">
                <path d="M0.93 8L0 7.07L4.93 2.1L7.6 4.77L11.07 1.33H9.33V0H13.33V4H12V2.27L7.6 6.67L4.93 4L0.93 8" />
              </svg>
              +8%
            </div>
          </div>
          <div className="mgr-stat-label">Total Staff</div>
          <div className="mgr-stat-value">{loading ? '—' : (stats?.totalStaff ?? 0)}</div>
        </div>

        {/* Revenue */}
        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="mgr-stat-trend">
              <svg width="14" height="8" viewBox="0 0 14 8" fill="#00FFC2">
                <path d="M0.93 8L0 7.07L4.93 2.1L7.6 4.77L11.07 1.33H9.33V0H13.33V4H12V2.27L7.6 6.67L4.93 4L0.93 8" />
              </svg>
              +12%
            </div>
          </div>
          <div className="mgr-stat-label">System Revenue</div>
          <div className="mgr-stat-value">{loading ? '—' : `₫${(stats?.systemRevenue ?? 0).toLocaleString('vi-VN')}`}</div>
        </div>

        {/* Network Health */}
        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--teal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="mgr-stat-trend mgr-stat-trend--muted">Live</div>
          </div>
          <div className="mgr-stat-label">Network Health</div>
          <div className="mgr-stat-value">{loading ? '—' : `${networkHealth}%`}</div>
        </div>
      </section>

      {/* Booking Stats Report */}
      <BookingStatsReport fetchStats={getAdminBookingStats} />

      {/* Main grid: chart + alerts */}
      <section className="adm-main-grid">
        {/* Left col */}
        <div className="adm-left-col">
          {/* Revenue chart */}
          <div className="mgr-panel mgr-chart-panel">
            <div className="mgr-chart-header">
              <h3>Revenue Growth</h3>
              <div className="mgr-chart-legend">
                <span className="mgr-chart-legend-dot" />
                Current Month
              </div>
            </div>
            <div className="mgr-chart-bars">
              <div className="mgr-chart-grid">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="mgr-chart-grid-line" />
                ))}
              </div>
              {(stats?.revenueWeeks ?? []).map((pct: number, i: number) => (
                <div key={WEEK_LABELS[i] || i} className="mgr-chart-bar" style={{ height: `${pct}%` }} />
              ))}
            </div>
            <div className="mgr-chart-labels">
              {WEEK_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          {/* Branches table */}
          <div className="mgr-panel">
            <div className="mgr-panel-header">
              <h3>All Branches</h3>
              <span className="mgr-branch-code">{branches.length} total</span>
            </div>
            <table className="mgr-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>City</th>
                  <th>Manager</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#bbc9cf' }}>
                      Loading branches...
                    </td>
                  </tr>
                )}
                {!loading && branches.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#bbc9cf' }}>
                      No branches found.
                    </td>
                  </tr>
                )}
                {!loading && branches.map((branch) => (
                  <tr key={branch.branchId}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#e2e2e8' }}>{branch.name}</div>
                      <span className="mgr-branch-code">{branch.branchCode}</span>
                    </td>
                    <td className="muted">{branch.city || '—'}</td>
                    <td className="muted">{branch.managerName ?? '—'}</td>
                    <td>
                      <span className={`mgr-status-badge ${branch.isActive ? 'mgr-status-badge--open' : 'mgr-status-badge--closed'}`}>
                        <span className="mgr-status-dot" />
                        {branch.isActive ? 'Open' : 'Closed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right col */}
        <div className="adm-right-col">
          {/* Network summary card */}
          <div className="mgr-panel adm-network-card">
            <div className="adm-network-glow" />
            <h3>Network Summary</h3>

            <div className="adm-network-row">
              <div className="adm-network-item">
                <span className="adm-network-label">Active Branches</span>
                <span className="adm-network-val adm-network-val--green">
                  {loading ? '—' : activeBranches.length}
                </span>
              </div>
              <div className="adm-network-item">
                <span className="adm-network-label">Inactive</span>
                <span className="adm-network-val adm-network-val--red">
                  {loading ? '—' : inactiveBranches.length}
                </span>
              </div>
            </div>

            <div className="adm-health-bar-wrap">
              <div className="adm-health-bar-label">
                <span>Uptime</span>
                <span>{loading ? '…' : `${networkHealth}%`}</span>
              </div>
              <div className="adm-health-bar">
                <div
                  className="adm-health-bar-fill"
                  style={{ width: loading ? '0%' : `${networkHealth}%` }}
                />
              </div>
            </div>

            <div className="adm-network-stats-row">
              <div className="adm-network-stat">
                <span className="adm-network-stat-label">Total Staff</span>
                <span className="adm-network-stat-val">{loading ? '—' : (stats?.totalStaff ?? 0)}</span>
              </div>
              <div className="adm-network-stat">
                <span className="adm-network-stat-label">Monthly Washes</span>
                <span className="adm-network-stat-val">{loading ? '—' : (stats?.monthlyWashes ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mgr-panel mgr-quick-actions">
            <h3>Quick Actions</h3>
            <div className="mgr-quick-actions-list">
              <Link to="/admin/users" className="mgr-quick-action-btn">
                <span className="mgr-quick-action-icon" style={{ background: 'rgba(165,231,255,0.1)', color: '#a5e7ff' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                  </svg>
                </span>
                Manage Users
              </Link>
              <Link to="/admin/branches" className="mgr-quick-action-btn">
                <span className="mgr-quick-action-icon" style={{ background: 'rgba(175,198,255,0.1)', color: '#afc6ff' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </span>
                View All Branches
              </Link>
              <Link to="/admin/settings" className="mgr-quick-action-btn">
                <span className="mgr-quick-action-icon" style={{ background: 'rgba(255,178,41,0.1)', color: '#ffb229' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                System Settings
              </Link>
            </div>
          </div>

          {/* System Alerts */}
          <div className="mgr-panel adm-alerts-card">
            <div className="mgr-panel-header">
              <h3>System Alerts</h3>
              <span className="adm-alert-count">{SYSTEM_ALERTS.length}</span>
            </div>
            <div className="adm-alerts-list">
              {SYSTEM_ALERTS.map((alert) => (
                <div key={alert.id} className={`adm-alert-item adm-alert-item--${alert.type}`}>
                  <div className="adm-alert-dot" />
                  <div className="adm-alert-body">
                    <div className="adm-alert-title">{alert.title}</div>
                    <div className="adm-alert-msg">{alert.message}</div>
                  </div>
                  <span className={`adm-alert-badge adm-alert-badge--${alert.type}`}>
                    {alert.type === 'warning' ? 'Warning' : alert.type === 'success' ? 'OK' : 'Info'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
