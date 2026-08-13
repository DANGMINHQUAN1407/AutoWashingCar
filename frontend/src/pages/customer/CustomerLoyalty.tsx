import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Pagination from '../../components/Pagination'
import './CustomerLoyalty.css'
import '../Dashboard.css'

export default function CustomerLoyalty() {
  const { user } = useAuth()
  const [loyalty, setLoyalty] = useState<any>(null)
  const [tiers, setTiers] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 5

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [loyaltyData, tiersData, historyData] = await Promise.all([
          api.getMyLoyalty(),
          api.getActiveTiers(),
          api.getMyLoyaltyHistory({ page, pageSize }),
        ])
        setLoyalty(loyaltyData)
        setTiers(tiersData)
        setHistory(historyData.items || [])
        setTotalCount(historyData.totalCount || 0)
      } catch (err) {
        console.error('Error fetching loyalty data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [page])

  const displayName = user?.FullName || user?.fullName || user?.name || 'VIP Member'
  const currentPoints = loyalty?.currentPoints ?? loyalty?.CurrentPoints ?? 0
  const lifetimePoints = loyalty?.lifetimePoints ?? loyalty?.LifetimePoints ?? 0
  const currentTier = loyalty?.tier ?? loyalty?.Tier
  const tierName = currentTier?.tierName ?? currentTier?.TierName ?? 'Bronze'
  const earnRate = currentTier?.earnRate ?? currentTier?.EarnRate ?? 1.0
  const benefits = currentTier?.benefits ?? currentTier?.Benefits ?? ''

  const nextTier = loyalty?.nextTier ?? loyalty?.NextTier
  const nextTierName = nextTier?.tierName ?? nextTier?.TierName ?? ''
  const pointsToNextTier = loyalty?.pointsToNextTier ?? loyalty?.PointsToNextTier ?? 0

  // Calculate progress percent
  const minPoints = currentTier?.minPoints ?? currentTier?.MinPoints ?? 0
  const nextMinPoints = nextTier?.minPoints ?? nextTier?.MinPoints ?? 0
  const pointsRange = nextMinPoints - minPoints
  const progressPercent = pointsRange > 0 
    ? Math.min(100, Math.max(0, ((currentPoints - minPoints) / pointsRange) * 100))
    : 100

  // Determine card style based on tier name
  const getTierClass = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('silver') || lower.includes('bạc')) return 'tier-silver'
    if (lower.includes('gold') || lower.includes('vàng')) return 'tier-gold'
    if (lower.includes('platinum') || lower.includes('kim cương') || lower.includes('diamond')) return 'tier-platinum'
    return 'tier-bronze'
  }


  if (loading && !loyalty) {
    return (
      <div className="portal-page">
        <div className="dash-header">
          <h2>Membership Program</h2>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your membership card...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-page loyalty-page-container">
      <div className="dash-header">
        <div>
          <h2>Membership & Loyalty</h2>
          <p>Track your level, benefits, and loyalty points history.</p>
        </div>
      </div>

      <div className="loyalty-grid">
        {/* Left column: Card and Progress */}
        <div className="loyalty-hero-section">
          {/* Metallic Glassmorphic VIP Card */}
          <div className={`membership-vip-card ${getTierClass(tierName)}`}>
            <div className="vip-card-glow"></div>
            <div className="vip-card-header">
              <span className="vip-card-brand">AutoWash<span className="brand-accent">Pro</span></span>
              <span className="vip-card-chip"></span>
            </div>
            <div className="vip-card-body">
              <div className="vip-card-tier-label">{tierName.toUpperCase()} MEMBER</div>
              <div className="vip-card-points-label">
                <span className="pts-num">{currentPoints.toLocaleString()}</span>
                <span className="pts-lbl">POINTS</span>
              </div>
            </div>
            <div className="vip-card-footer">
              <div className="vip-card-holder">
                <div className="holder-lbl">CARD HOLDER</div>
                <div className="holder-name">{displayName}</div>
              </div>
              <div className="vip-card-insignia">VIP</div>
            </div>
          </div>

          {/* Tier Progress Card */}
          {nextTierName && (
            <div className="card progress-card">
              <div className="progress-header">
                <span>Progress to <strong>{nextTierName}</strong></span>
                <span className="points-remaining">{pointsToNextTier.toLocaleString()} points needed</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="progress-footer">
                <span>{minPoints.toLocaleString()} pts</span>
                <span>{nextMinPoints.toLocaleString()} pts</span>
              </div>
            </div>
          )}

          {/* Benefits Info Card */}
          <div className="card benefits-card">
            <h3 className="section-title">Current Tier Benefits ({tierName})</h3>
            <div className="benefit-info-row">
              <div className="benefit-icon">🪙</div>
              <div className="benefit-text">
                <strong>Earn Rate:</strong> {Math.round(earnRate * 100)}% points back on every booking amount (1,000 VND spent = {earnRate * 10} points).
              </div>
            </div>
            {benefits && (
              <div className="benefit-info-row">
                <div className="benefit-icon">🎁</div>
                <div className="benefit-text">
                  <strong>Privileges:</strong> {benefits}
                </div>
              </div>
            )}
            <div className="benefit-info-row">
              <div className="benefit-icon">📊</div>
              <div className="benefit-text">
                <strong>Lifetime Accumulated:</strong> {lifetimePoints.toLocaleString()} points.
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Tiers comparison & history */}
        <div className="loyalty-data-section">
          {/* Point History Ledger */}
          <div className="card history-card">
            <h3 className="section-title">Points Transaction History</h3>
            
            {history.length === 0 ? (
              <div className="empty-history">
                <p>No loyalty transaction history found.</p>
                <span>Book a service to start earning points!</span>
              </div>
            ) : (
              <>
                <div className="history-list">
                  {history.map((item) => {
                    const isCredit = item.entryTypeName === 'Earn' || item.entryTypeName === 'Adjust' && item.points > 0
                    const isDebit = item.points < 0 || item.entryTypeName === 'Redeem'
                    const displayPoints = item.points > 0 ? `+${item.points}` : item.points
                    
                    return (
                      <div key={item.loyaltyLedgerEntryId} className="history-item">
                        <div className="history-meta">
                          <span className="history-desc">{item.description || 'Service booking reward'}</span>
                          <span className="history-date">
                            {new Date(item.createdAtUtc || item.CreatedAtUtc).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="history-nums">
                          <span className={`history-points ${isCredit ? 'points-credit' : isDebit ? 'points-debit' : ''}`}>
                            {displayPoints} pts
                          </span>
                          <span className="history-balance">Bal: {item.balanceAfter} pts</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(totalCount / pageSize)}
                  totalCount={totalCount}
                  itemName="giao dịch"
                  onPageChange={setPage}
                />
              </>
            )}
          </div>

          {/* Membership Tier List */}
          <div className="card tiers-list-card">
            <h3 className="section-title">Membership Tier Comparison</h3>
            <div className="tier-comparison-grid">
              {tiers.map((t) => {
                const isCurrent = t.tierId === currentTier?.tierId || t.tierName === currentTier?.tierName
                
                return (
                  <div key={t.tierId || t.tierName} className={`tier-compare-card ${isCurrent ? 'current-compare-tier' : ''}`}>
                    {isCurrent && <span className="current-badge">YOUR TIER</span>}
                    <h4>{t.tierName}</h4>
                    <div className="tier-req">Min points: <strong>{t.minPoints.toLocaleString()}</strong></div>
                    <div className="tier-rate">Earn rate: <strong>{Math.round((t.earnRate || 0) * 100)}%</strong></div>
                    {t.benefits && <p className="tier-benefits">{t.benefits}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
