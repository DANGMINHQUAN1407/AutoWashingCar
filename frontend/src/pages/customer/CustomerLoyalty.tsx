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
  const [tierBenefits, setTierBenefits] = useState<any[]>([])
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

        const currentTierId = loyaltyData?.tier?.tierId || loyaltyData?.Tier?.TierId
        if (currentTierId) {
          try {
            const currentBenefits = await api.getTierBenefits(currentTierId)
            setTierBenefits(Array.isArray(currentBenefits) ? currentBenefits.filter(b => b.isActive || b.IsActive) : [])
          } catch (e) {
            console.error('Failed to load tier benefits', e)
          }
        }
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
    ? Math.min(100, Math.max(0, ((lifetimePoints - minPoints) / pointsRange) * 100))
    : 100

  // Determine card style based on tier name
  const getTierClass = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('silver') || lower.includes('bạc')) return 'tier-silver'
    if (lower.includes('gold') || lower.includes('vàng')) return 'tier-gold'
    if (lower.includes('platinum') || lower.includes('kim cương') || lower.includes('diamond')) return 'tier-platinum'
    return 'tier-bronze'
  }

  const getBenefitIcon = (type: number) => {
    switch (type) {
      case 1: return '🏷️'
      case 2: return '📅'
      case 3: return '🎁'
      case 4: return '🚀'
      case 5: return '⭐'
      default: return '✨'
    }
  }

  const formatBenefitTitle = (benefit: any) => {
    const type = benefit.benefitType || benefit.BenefitType
    const val = benefit.benefitValue || benefit.BenefitValue
    const desc = benefit.description || benefit.Description
    const name = benefit.benefitTypeName || benefit.BenefitTypeName || 'Quyền lợi'

    if (type === 1) return `Giảm ${val}% cho mọi đơn đặt lịch`
    if (type === 2) return `Giảm ${Number(val).toLocaleString('vi-VN')} đ trực tiếp cho mỗi đơn`
    if (type === 3) return desc ? `Dịch vụ tặng kèm: ${desc}` : `Tặng dịch vụ (Mã: ${val})`
    if (type === 4) return desc ? `${desc} (${val})` : val
    if (type === 5) return `Tích thêm +${val}% điểm thưởng mỗi lần rửa`
    return desc || `${name}: ${val}`
  }

  if (loading && !loyalty) {
    return (
      <div className="portal-page">
        <div className="dash-header">
          <h2>Chương trình thành viên</h2>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải thông tin thẻ thành viên...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-page loyalty-page-container">
      <div className="dash-header">
        <div>
          <h2>Hạng thành viên & Điểm thưởng</h2>
          <p>Theo dõi cấp độ thành viên, quyền lợi và lịch sử tích điểm của bạn.</p>
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
              <div className="vip-card-tier-label">THÀNH VIÊN HẠNG {tierName.toUpperCase()}</div>
              <div className="vip-card-points-label">
                <span className="pts-num">{currentPoints.toLocaleString()}</span>
                <span className="pts-lbl">ĐIỂM</span>
              </div>
            </div>
            <div className="vip-card-footer">
              <div className="vip-card-holder">
                <div className="holder-lbl">CHỦ THẺ</div>
                <div className="holder-name">{displayName}</div>
              </div>
              <div className="vip-card-insignia">VIP</div>
            </div>
          </div>

          {/* Tier Progress Card */}
          {nextTierName && (
            <div className="card progress-card">
              <div className="progress-header">
                <span>Tiến trình lên hạng <strong>{nextTierName}</strong></span>
                <span className="points-remaining">Cần thêm {pointsToNextTier.toLocaleString()} điểm</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="progress-footer">
                <span>{minPoints.toLocaleString()} điểm</span>
                <span>{nextMinPoints.toLocaleString()} điểm</span>
              </div>
            </div>
          )}

          {/* Benefits Info Card */}
          <div className="card benefits-card">
            <h3 className="section-title">Quyền lợi hạng hiện tại ({tierName})</h3>
            <div className="benefit-info-row">
              <div className="benefit-icon">🪙</div>
              <div className="benefit-text">
                <strong>Hệ số tích điểm:</strong> Tích {Math.round(earnRate * 100)}% điểm thưởng trên tổng tiền thanh toán (1.000 đ = {earnRate * 10} điểm).
              </div>
            </div>
            
            {/* Dynamic list of active tier benefits */}
            {tierBenefits.length > 0 ? (
              tierBenefits.map((b, idx) => (
                <div key={b.tierBenefitId || idx} className="benefit-info-row animate-fade-in">
                  <div className="benefit-icon">{getBenefitIcon(b.benefitType || b.BenefitType)}</div>
                  <div className="benefit-text">
                    <strong>{b.benefitTypeName || b.BenefitTypeName || 'Đặc quyền'}:</strong> {formatBenefitTitle(b)}
                  </div>
                </div>
              ))
            ) : benefits ? (
              <div className="benefit-info-row">
                <div className="benefit-icon">🎁</div>
                <div className="benefit-text">
                  <strong>Đặc quyền:</strong> {benefits}
                </div>
              </div>
            ) : null}

            <div className="benefit-info-row">
              <div className="benefit-icon">📊</div>
              <div className="benefit-text">
                <strong>Tổng điểm trọn đời:</strong> {lifetimePoints.toLocaleString()} điểm.
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Tiers comparison & history */}
        <div className="loyalty-data-section">
          {/* Point History Ledger */}
          <div className="card history-card">
            <h3 className="section-title">Nhật ký lịch sử điểm thưởng</h3>
            
            {history.length === 0 ? (
              <div className="empty-history">
                <p>Chưa có giao dịch tích điểm nào.</p>
                <span>Hãy đặt lịch rửa xe để bắt đầu tích lũy điểm thưởng!</span>
              </div>
            ) : (
              <>
                <div className="history-list">
                  {history.map((item) => {
                    const isCredit = item.entryTypeName === 'Earn' || (item.entryTypeName === 'Adjust' && item.points > 0)
                    const isDebit = item.points < 0 || item.entryTypeName === 'Redeem'
                    const displayPoints = item.points > 0 ? `+${item.points}` : item.points
                    
                    return (
                      <div key={item.loyaltyLedgerEntryId} className="history-item">
                        <div className="history-meta">
                          <span className="history-desc">{item.description || 'Thưởng tích điểm dịch vụ'}</span>
                          <span className="history-date">
                            {new Date(item.createdAtUtc || item.CreatedAtUtc).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="history-nums">
                          <span className={`history-points ${isCredit ? 'points-credit' : isDebit ? 'points-debit' : ''}`}>
                            {displayPoints} điểm
                          </span>
                          <span className="history-balance">Số dư: {item.balanceAfter} điểm</span>
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
            <h3 className="section-title">Bảng so sánh các Hạng thành viên</h3>
            <div className="tier-comparison-grid">
              {tiers.map((t) => {
                const isCurrent = t.tierId === currentTier?.tierId || t.tierName === currentTier?.tierName
                
                return (
                  <div key={t.tierId || t.tierName} className={`tier-compare-card ${isCurrent ? 'current-compare-tier' : ''}`}>
                    {isCurrent && <span className="current-badge">HẠNG HIỆN TẠI</span>}
                    <h4>{t.tierName}</h4>
                    <div className="tier-req">Điểm tối thiểu: <strong>{t.minPoints.toLocaleString()}</strong></div>
                    <div className="tier-rate">Hệ số tích điểm: <strong>{Math.round((t.earnRate || 0) * 100)}%</strong></div>
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
