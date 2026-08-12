import { useState, useEffect } from 'react'
import type { BookingStatsQuery, BookingStatsByPeriodDto } from '../services/api'

function formatCurrency(amount: number) {
  return `₫${amount.toLocaleString('vi-VN')}`
}

type Props = {
  fetchStats: (query: BookingStatsQuery) => Promise<BookingStatsByPeriodDto[]>
}

export default function BookingStatsReport({ fetchStats }: Props) {
  const [groupBy, setGroupBy] = useState<1 | 2 | 3>(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [stats, setStats] = useState<BookingStatsByPeriodDto[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchStats({
        groupBy,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
      setStats(data)
    } catch (error) {
      console.error('Failed to load booking stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [groupBy, fromDate, toDate])

  return (
    <div className="mgr-panel" style={{ marginTop: '24px' }}>
      <div className="mgr-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ margin: 0 }}>Revenue & Orders Report</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>View by:</label>
            <select 
              className="form-input form-select-custom" 
              style={{ width: '120px', padding: '6px 12px', minHeight: '36px' }} 
              value={groupBy} 
              onChange={(e) => setGroupBy(Number(e.target.value) as 1 | 2 | 3)}
            >
              <option value={1} style={{ background: '#1e1e2d', color: 'white' }}>Daily</option>
              <option value={2} style={{ background: '#1e1e2d', color: 'white' }}>Weekly</option>
              <option value={3} style={{ background: '#1e1e2d', color: 'white' }}>Monthly</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>From:</label>
            <input 
              type="date" 
              className="form-input" 
              style={{ width: '140px', padding: '6px 12px', minHeight: '36px' }}
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>To:</label>
            <input 
              type="date" 
              className="form-input" 
              style={{ width: '140px', padding: '6px 12px', minHeight: '36px' }}
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="table-responsive">
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading report...</div>
        ) : (
          <table className="mgr-table">
            <thead>
              <tr>
                <th>Period</th>
                <th style={{ textAlign: 'right' }}>Online Orders</th>
                <th style={{ textAlign: 'right' }}>Online Revenue</th>
                <th style={{ textAlign: 'right' }}>Walk-In Orders</th>
                <th style={{ textAlign: 'right' }}>Walk-In Revenue</th>
                <th style={{ textAlign: 'right' }}>Total Orders</th>
                <th style={{ textAlign: 'right' }}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#bbc9cf' }}>No data found for the selected period.</td>
                </tr>
              ) : (
                stats.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#e2e2e8' }}>{row.periodLabel}</td>
                    <td style={{ textAlign: 'right' }}>{row.onlineCount}</td>
                    <td style={{ textAlign: 'right', color: '#00FFC2' }}>{formatCurrency(row.onlineAmount)}</td>
                    <td style={{ textAlign: 'right' }}>{row.walkInCount}</td>
                    <td style={{ textAlign: 'right', color: '#a5e7ff' }}>{formatCurrency(row.walkInAmount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'white' }}>{row.totalCount}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#ffb229' }}>{formatCurrency(row.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
