import { useState, useEffect } from 'react'
import api from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import './ManagerCustomers.css'
import '../Dashboard.css'

export default function ManagerCustomers() {
  const [phoneSearch, setPhoneSearch] = useState('')
  const [customer, setCustomer] = useState<any>(null)
  const [loyalty, setLoyalty] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [tiers, setTiers] = useState<any[]>([])
  
  const [searchLoading, setSearchLoading] = useState(false)
  const [loyaltyLoading, setLoyaltyLoading] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  
  // Adjustment Form States
  const [adjustPointsValue, setAdjustPointsValue] = useState('')
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add')
  const [adjustDescription, setAdjustDescription] = useState('')
  
  // Feedback Messages
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const historyPageSize = 5

  // Fetch active tiers on mount for manager reference
  useEffect(() => {
    async function fetchTiers() {
      try {
        const tiersData = await api.getActiveTiers()
        setTiers(tiersData)
      } catch (err) {
        console.error('Error fetching tiers:', err)
      }
    }
    fetchTiers()
  }, [])

  // Refetch customer loyalty history when page changes
  useEffect(() => {
    if (customer) {
      fetchCustomerHistory(customer.userId ?? customer.UserId)
    }
  }, [historyPage])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneSearch.trim()) return

    setSearchLoading(true)
    setMessage(null)
    setCustomer(null)
    setLoyalty(null)
    setHistory([])
    setHistoryPage(1)

    try {
      const res = await api.lookupCustomerByPhone(phoneSearch.trim())
      if (res) {
        setCustomer(res)
        const userId = res.userId ?? res.UserId
        await fetchCustomerLoyaltyDetails(userId)
      } else {
        setMessage({ text: 'No customer found with this phone number.', type: 'error' })
      }
    } catch (err: any) {
      console.error(err)
      setMessage({ 
        text: err.message?.includes('404') || err.message?.includes('Not Found')
          ? 'Không tìm thấy khách hàng nào với số điện thoại này.' 
          : extractErrorMessage(err, 'Lỗi khi tìm kiếm khách hàng. Vui lòng thử lại.'), 
        type: 'error' 
      })
    } finally {
      setSearchLoading(false)
    }
  }

  const fetchCustomerLoyaltyDetails = async (userId: string) => {
    setLoyaltyLoading(true)
    try {
      const [loyaltyData, historyData] = await Promise.all([
        api.getUserLoyalty(userId).catch((err: any) => {
          if (err.message && (err.message.includes('404') || err.message.includes('Not Found'))) {
            return {
              currentPoints: 0,
              lifetimePoints: 0,
              tier: {
                tierName: 'Bronze',
                minPoints: 0,
                earnRate: 1.0,
                benefits: 'Standard membership details'
              }
            }
          }
          throw err
        }),
        api.getUserLoyaltyHistory(userId, { page: historyPage, pageSize: historyPageSize }).catch((err: any) => {
          if (err.message && (err.message.includes('404') || err.message.includes('Not Found'))) {
            return { items: [], totalCount: 0 }
          }
          throw err
        })
      ])
      setLoyalty(loyaltyData)
      setHistory(historyData.items || [])
      setHistoryTotal(historyData.totalCount || 0)
    } catch (err) {
      console.error('Error loading loyalty information:', err)
      setMessage({ text: extractErrorMessage(err, 'Không thể tải thông tin điểm tích lũy của khách hàng này.'), type: 'error' })
    } finally {
      setLoyaltyLoading(false)
    }
  }

  const fetchCustomerHistory = async (userId: string) => {
    try {
      const historyData = await api.getUserLoyaltyHistory(userId, { page: historyPage, pageSize: historyPageSize }).catch((err: any) => {
        if (err.message && (err.message.includes('404') || err.message.includes('Not Found'))) {
          return { items: [], totalCount: 0 }
        }
        throw err
      })
      setHistory(historyData.items || [])
      setHistoryTotal(historyData.totalCount || 0)
    } catch (err) {
      console.error('Error loading history page:', err)
    }
  }

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    const userId = customer.userId ?? customer.UserId

    const pointsNum = parseInt(adjustPointsValue, 10)
    if (isNaN(pointsNum) || pointsNum <= 0) {
      setMessage({ text: 'Please enter a valid positive number of points.', type: 'error' })
      return
    }

    const finalPoints = adjustType === 'add' ? pointsNum : -pointsNum

    setIsAdjusting(true)
    setMessage(null)

    try {
      await api.adjustPoints({
        UserId: userId,
        Points: finalPoints,
        Description: adjustDescription.trim() || undefined
      })
      
      setMessage({ text: 'Customer loyalty points adjusted successfully!', type: 'success' })
      
      // Reset form
      setAdjustPointsValue('')
      setAdjustDescription('')
      
      // Reload customer loyalty details
      await fetchCustomerLoyaltyDetails(userId)
    } catch (err: any) {
      console.error(err)
      setMessage({ text: extractErrorMessage(err, 'Điều chỉnh điểm thất bại. Vui lòng thử lại.'), type: 'error' })
    } finally {
      setIsAdjusting(false)
    }
  }

  const quickAdjust = (amount: number) => {
    setAdjustPointsValue(String(amount))
  }

  const currentPoints = loyalty?.currentPoints ?? loyalty?.CurrentPoints ?? 0
  const lifetimePoints = loyalty?.lifetimePoints ?? loyalty?.LifetimePoints ?? 0
  const tierName = loyalty?.tier?.tierName ?? loyalty?.Tier?.TierName ?? 'Bronze'
  const earnRate = loyalty?.tier?.earnRate ?? loyalty?.Tier?.EarnRate ?? 1.0

  return (
    <div className="portal-page manager-customers-container">
      <div className="dash-header">
        <div>
          <h2>Customers & Loyalty Management</h2>
          <p>Lookup branch customers, view their active tier, and manage loyalty points adjustments.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card search-card">
        <form onSubmit={handleSearch} className="customer-search-form">
          <div className="form-group flex-grow">
            <label className="form-label" htmlFor="manager-phone-search">Search Customer by Phone Number</label>
            <div className="search-input-wrapper">
              <input
                id="manager-phone-search"
                className="form-input"
                placeholder="Enter customer phone (e.g., 0912345678)..."
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn btn-primary search-submit-btn"
                disabled={searchLoading || !phoneSearch.trim()}
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={`alert-banner alert-${message.type}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {customer && (
        <div className="manager-loyalty-workspace animate-fade-in">
          {/* Left panel: Info & Adjustment */}
          <div className="workspace-left">
            {/* Customer profile details */}
            <div className="card customer-details-card">
              <h3 className="workspace-card-title">👤 Customer Profile</h3>
              <div className="profile-details-grid">
                <div className="detail-item">
                  <span className="detail-lbl">Full Name</span>
                  <strong className="detail-val">{customer.fullName ?? customer.FullName}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-lbl">Phone Number</span>
                  <span className="detail-val">{customer.phoneNumber ?? customer.PhoneNumber ?? 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-lbl">Email Address</span>
                  <span className="detail-val">{customer.email ?? customer.Email ?? 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-lbl">Guest Account</span>
                  <span className={`badge ${customer.isGuest ? 'badge-secondary' : 'badge-primary'}`}>
                    {customer.isGuest ? 'Guest (Walk-in)' : 'Registered'}
                  </span>
                </div>
              </div>

              {customer.vehicles && customer.vehicles.length > 0 && (
                <div className="customer-vehicles-section">
                  <h4 className="detail-lbl">Registered Vehicles</h4>
                  <div className="vehicle-pills">
                    {customer.vehicles.map((v: any, idx: number) => (
                      <span key={idx} className="vehicle-pill">
                        🚗 {v.licensePlate ?? v.LicensePlate} ({v.brand ?? v.Brand ?? 'Unknown Brand'})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Loyalty points summary */}
            <div className="card loyalty-summary-card">
              <h3 className="workspace-card-title">⭐ Loyalty Information</h3>
              {loyaltyLoading ? (
                <div className="card-loading">Loading loyalty profile...</div>
              ) : (
                <div className="loyalty-stats-grid">
                  <div className="loyalty-stat-box">
                    <span className="stat-lbl">Active Tier</span>
                    <strong className="stat-val-tier">{tierName}</strong>
                  </div>
                  <div className="loyalty-stat-box">
                    <span className="stat-lbl">Current Balance</span>
                    <strong className="stat-val-points">{currentPoints.toLocaleString()} pts</strong>
                  </div>
                  <div className="loyalty-stat-box">
                    <span className="stat-lbl">Lifetime Points</span>
                    <span className="stat-val-sub">{lifetimePoints.toLocaleString()} pts</span>
                  </div>
                  <div className="loyalty-stat-box">
                    <span className="stat-lbl">Earn Multiplier</span>
                    <span className="stat-val-sub">{Math.round(earnRate * 100)}% ({earnRate}x)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Adjustment Form Card */}
            <div className="card adjustment-card">
              <h3 className="workspace-card-title">⚙️ Adjust Loyalty Points</h3>
              <form onSubmit={handleAdjustPoints} className="adjustment-form">
                <div className="adjustment-type-toggle">
                  <button
                    type="button"
                    className={`toggle-option ${adjustType === 'add' ? 'active-add' : ''}`}
                    onClick={() => setAdjustType('add')}
                  >
                    ➕ Reward Points
                  </button>
                  <button
                    type="button"
                    className={`toggle-option ${adjustType === 'deduct' ? 'active-deduct' : ''}`}
                    onClick={() => setAdjustType('deduct')}
                  >
                    ➖ Deduct Points
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adjust-points-amount">Points Amount</label>
                  <input
                    id="adjust-points-amount"
                    className="form-input"
                    placeholder="Enter points value (e.g., 200)..."
                    type="number"
                    min="1"
                    value={adjustPointsValue}
                    onChange={(e) => setAdjustPointsValue(e.target.value)}
                    required
                  />
                  <div className="quick-adjust-buttons">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => quickAdjust(100)}>+100</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => quickAdjust(250)}>+250</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => quickAdjust(500)}>+500</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => quickAdjust(1000)}>+1000</button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adjust-description">Reason / Description</label>
                  <textarea
                    id="adjust-description"
                    className="form-input text-area-input"
                    placeholder="Provide a reason (e.g., Points reward for booking delay, promotion adjustment)..."
                    rows={3}
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    maxLength={500}
                  />
                </div>

                <button
                  type="submit"
                  className={`btn ${adjustType === 'add' ? 'btn-primary' : 'btn-danger'} w-full`}
                  disabled={isAdjusting || !adjustPointsValue}
                >
                  {isAdjusting ? 'Processing adjustment...' : adjustType === 'add' ? 'Confirm Reward' : 'Confirm Deduction'}
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Points Ledger History */}
          <div className="workspace-right">
            <div className="card ledger-history-card">
              <h3 className="workspace-card-title">📜 Points Transaction Ledger</h3>
              
              {loyaltyLoading ? (
                <div className="card-loading">Loading transaction history...</div>
              ) : history.length === 0 ? (
                <div className="empty-ledger">
                  <p>No transaction history recorded for this customer.</p>
                </div>
              ) : (
                <>
                  <div className="ledger-list">
                    {history.map((item) => {
                      const isCredit = item.entryTypeName === 'Earn' || item.entryTypeName === 'Adjust' && item.points > 0
                      const isDebit = item.points < 0 || item.entryTypeName === 'Redeem'
                      const displayPoints = item.points > 0 ? `+${item.points}` : item.points
                      
                      return (
                        <div key={item.loyaltyLedgerEntryId} className="ledger-item">
                          <div className="ledger-meta">
                            <span className="ledger-desc">{item.description || 'Points change'}</span>
                            <span className="ledger-date">
                              {new Date(item.createdAtUtc || item.CreatedAtUtc).toLocaleString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="ledger-nums">
                            <span className={`ledger-points ${isCredit ? 'points-credit' : isDebit ? 'points-debit' : ''}`}>
                              {displayPoints} pts
                            </span>
                            <span className="ledger-balance">Balance: {item.balanceAfter} pts</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Pagination */}
                  {historyTotal > historyPageSize && (
                    <div className="ledger-pagination">
                      <button 
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))} 
                        disabled={historyPage === 1}
                        className="btn btn-ghost btn-sm"
                      >
                        ← Prev
                      </button>
                      <span className="ledger-page-indicator">Page {historyPage} / {Math.ceil(historyTotal / historyPageSize)}</span>
                      <button 
                        onClick={() => setHistoryPage(p => p * historyPageSize < historyTotal ? p + 1 : p)} 
                        disabled={historyPage * historyPageSize >= historyTotal}
                        className="btn btn-ghost btn-sm"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Active Tiers Reference list */}
            <div className="card tiers-reference-card">
              <h3 className="workspace-card-title">🏆 Active Membership Tiers Reference</h3>
              <div className="reference-tiers-list">
                {tiers.map((t) => (
                  <div key={t.tierId || t.tierName} className="reference-tier-item">
                    <div className="ref-tier-header">
                      <h4>{t.tierName}</h4>
                      <span className="ref-tier-points">Threshold: {t.minPoints.toLocaleString()} pts</span>
                    </div>
                    <div className="ref-tier-body">
                      <span>Multiplier: {Math.round((t.earnRate || 0) * 100)}% ({t.earnRate}x)</span>
                      {t.benefits && <p className="ref-tier-benefits">Benefits: {t.benefits}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
