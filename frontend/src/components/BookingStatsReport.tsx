import { useState, useEffect } from 'react'
import type { BookingStatsQuery, BookingStatsByPeriodDto } from '../services/api'
import Pagination from './Pagination'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchStats({
        groupBy,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
      setStats(data || [])
      setCurrentPage(1)
    } catch (error) {
      console.error('Failed to load booking stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [groupBy, fromDate, toDate])

  // Pagination calculation
  const totalPages = Math.ceil(stats.length / pageSize)
  const pagedStats = stats.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Summary calculation
  const totalOnlineCount = stats.reduce((sum, r) => sum + (r.onlineCount || 0), 0)
  const totalOnlineAmount = stats.reduce((sum, r) => sum + (r.onlineAmount || 0), 0)
  const totalWalkInCount = stats.reduce((sum, r) => sum + (r.walkInCount || 0), 0)
  const totalWalkInAmount = stats.reduce((sum, r) => sum + (r.walkInAmount || 0), 0)
  const totalOverallCount = stats.reduce((sum, r) => sum + (r.totalCount || 0), 0)
  const totalOverallAmount = stats.reduce((sum, r) => sum + (r.totalAmount || 0), 0)

  return (
    <div className="mgr-panel" style={{ marginTop: '24px' }}>
      <div className="mgr-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ margin: 0 }}>Báo cáo Doanh thu & Đơn hàng</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Xem theo:</label>
            <select 
              className="form-input form-select-custom" 
              style={{ width: '120px', padding: '6px 12px', minHeight: '36px', height: '36px' }} 
              value={groupBy} 
              onChange={(e) => setGroupBy(Number(e.target.value) as 1 | 2 | 3)}
            >
              <option value={1}>Theo ngày</option>
              <option value={2}>Theo tuần</option>
              <option value={3}>Theo tháng</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Từ ngày:</label>
            <input 
              type="date" 
              className="form-input" 
              style={{ width: '140px', padding: '6px 12px', minHeight: '36px', height: '36px' }}
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Đến ngày:</label>
            <input 
              type="date" 
              className="form-input" 
              style={{ width: '140px', padding: '6px 12px', minHeight: '36px', height: '36px' }}
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Hiển thị:</label>
            <select 
              className="form-input form-select-custom" 
              style={{ width: '100px', padding: '6px 12px', minHeight: '36px', height: '36px' }} 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value={5}>5 dòng</option>
              <option value={10}>10 dòng</option>
              <option value={15}>15 dòng</option>
              <option value={20}>20 dòng</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="table-responsive">
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải báo cáo...</div>
        ) : (
          <>
            <table className="mgr-table">
              <thead>
                <tr>
                  <th>Kỳ báo cáo</th>
                  <th style={{ textAlign: 'right' }}>Đơn Online</th>
                  <th style={{ textAlign: 'right' }}>Doanh thu Online</th>
                  <th style={{ textAlign: 'right' }}>Đơn Trực tiếp (Walk-In)</th>
                  <th style={{ textAlign: 'right' }}>Doanh thu Trực tiếp</th>
                  <th style={{ textAlign: 'right' }}>Tổng số đơn</th>
                  <th style={{ textAlign: 'right' }}>Tổng doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Không có dữ liệu trong khoảng thời gian đã chọn.</td>
                  </tr>
                ) : (
                  pagedStats.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{row.periodLabel}</td>
                      <td style={{ textAlign: 'right', color: '#334155' }}>{row.onlineCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>{formatCurrency(row.onlineAmount)}</td>
                      <td style={{ textAlign: 'right', color: '#334155' }}>{row.walkInCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{formatCurrency(row.walkInAmount)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{row.totalCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>{formatCurrency(row.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {stats.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                    <td style={{ color: '#0f172a' }}>Tổng cộng ({stats.length} kỳ)</td>
                    <td style={{ textAlign: 'right', color: '#334155' }}>{totalOnlineCount}</td>
                    <td style={{ textAlign: 'right', color: '#0284c7' }}>{formatCurrency(totalOnlineAmount)}</td>
                    <td style={{ textAlign: 'right', color: '#334155' }}>{totalWalkInCount}</td>
                    <td style={{ textAlign: 'right', color: '#2563eb' }}>{formatCurrency(totalWalkInAmount)}</td>
                    <td style={{ textAlign: 'right', color: '#0f172a' }}>{totalOverallCount}</td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>{formatCurrency(totalOverallAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>

            <div style={{ marginTop: '16px' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={stats.length}
                itemName="kỳ báo cáo"
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
