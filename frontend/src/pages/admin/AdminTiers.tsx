import { useEffect, useState } from 'react'
import api from '../../services/api'
import { type Tier, type TierBenefit, BenefitTypeLabels } from '../../types/tier'
import { extractErrorMessage } from '../../utils/errorUtils'
import ConfirmModal from '../../components/ConfirmModal'
import './AdminTiers.css'
import '../Dashboard.css'

type TierModalMode = 'create' | 'edit' | null
type BenefitModalMode = 'create' | 'edit' | null

export default function AdminTiers() {
  // Navigation / Loading States
  const [tiers, setTiers] = useState<Tier[]>([])
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null)
  const [benefits, setBenefits] = useState<TierBenefit[]>([])

  const [loadingTiers, setLoadingTiers] = useState(true)
  const [loadingBenefits, setLoadingBenefits] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pagination for Tiers
  const [page, setPage] = useState(1)
  const [pageSize] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Interaction loaders
  const [actionLoadingTierId, setActionLoadingTierId] = useState<string | null>(null)
  const [actionLoadingBenefitId, setActionLoadingBenefitId] = useState<string | null>(null)

  // Modals state
  const [tierModalMode, setTierModalMode] = useState<TierModalMode>(null)
  const [benefitModalMode, setBenefitModalMode] = useState<BenefitModalMode>(null)
  const [selectedBenefit, setSelectedBenefit] = useState<TierBenefit | null>(null)
  const [benefitToDelete, setBenefitToDelete] = useState<TierBenefit | null>(null)
  const [deleteBenefitLoading, setDeleteBenefitLoading] = useState(false)

  // Form states
  const [tierForm, setTierForm] = useState({
    tierName: '',
    minPoints: 0,
    earnRate: 1.0,
    benefits: '',
  })
  const [tierFormLoading, setTierFormLoading] = useState(false)
  const [tierFormError, setTierFormError] = useState<string | null>(null)

  const [benefitForm, setBenefitForm] = useState({
    benefitType: 1, // Default to DiscountPercent
    benefitValue: '',
    description: '',
  })
  const [benefitFormLoading, setBenefitFormLoading] = useState(false)
  const [benefitFormError, setBenefitFormError] = useState<string | null>(null)

  // Custom Toast State
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error'; message: string }>>([])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Normalize tier name to get specific accent styles (Gold, Silver...)
  const getTierClassName = (name: string) => {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const nameClean = normalized.replace('đ', 'd').replace(' ', '')
    if (nameClean.includes('dong') || nameClean.includes('bronze')) return 'tier-dong'
    if (nameClean.includes('bac') || nameClean.includes('silver')) return 'tier-bac'
    if (nameClean.includes('vang') || nameClean.includes('gold')) return 'tier-vang'
    if (nameClean.includes('kimcuong') || nameClean.includes('diamond')) return 'tier-kimcuong'
    return ''
  }

  // Fetch Tiers list
  const fetchTiers = async (shouldKeepSelection = true) => {
    setLoadingTiers(true)
    setError(null)
    try {
      const res = await api.getTiers({ page, pageSize })
      setTiers(res.items)
      setTotalCount(res.totalCount)
      setTotalPages(res.totalPages || Math.max(1, Math.ceil(res.totalCount / pageSize)))

      if (res.items.length > 0) {
        if (shouldKeepSelection && selectedTier) {
          const updated = res.items.find((t: Tier) => t.tierId === selectedTier.tierId)
          setSelectedTier(updated || res.items[0])
        } else {
          setSelectedTier(res.items[0])
        }
      } else {
        setSelectedTier(null)
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Không thể tải danh sách hạng thành viên.')
      showToast('Lỗi tải danh sách hạng', 'error')
    } finally {
      setLoadingTiers(false)
    }
  }

  // Fetch Benefits of the selected tier
  const fetchBenefits = async (tierId: string) => {
    setLoadingBenefits(true)
    try {
      const res = await api.getTierBenefits(tierId)
      setBenefits(res)
    } catch (err: any) {
      console.error(err)
      showToast('Không thể tải danh sách quyền lợi', 'error')
    } finally {
      setLoadingBenefits(false)
    }
  }

  useEffect(() => {
    fetchTiers(false)
  }, [page])

  useEffect(() => {
    if (selectedTier) {
      fetchBenefits(selectedTier.tierId)
    } else {
      setBenefits([])
    }
  }, [selectedTier])

  // Toggle Tier active/inactive
  const handleToggleTierActive = async (e: React.MouseEvent, tier: Tier) => {
    e.stopPropagation() // Prevent selecting card
    setActionLoadingTierId(tier.tierId)
    const targetStatus = !tier.isActive
    try {
      if (targetStatus) {
        await api.activateTier(tier.tierId)
        showToast(`Đã kích hoạt hạng ${tier.tierName}`, 'success')
      } else {
        await api.deactivateTier(tier.tierId)
        showToast(`Đã vô hiệu hóa hạng ${tier.tierName}`, 'success')
      }
      setTiers(prev => prev.map(t => t.tierId === tier.tierId ? { ...t, isActive: targetStatus } : t))
      if (selectedTier?.tierId === tier.tierId) {
        setSelectedTier(prev => prev ? { ...prev, isActive: targetStatus } : null)
      }
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err), 'error')
    } finally {
      setActionLoadingTierId(null)
    }
  }

  // Toggle Benefit active/inactive
  const handleToggleBenefitActive = async (benefit: TierBenefit) => {
    setActionLoadingBenefitId(benefit.tierBenefitId)
    const targetStatus = !benefit.isActive
    try {
      if (targetStatus) {
        await api.activateTierBenefit(benefit.tierBenefitId)
        showToast(`Đã kích hoạt quyền lợi: ${benefit.benefitTypeName}`, 'success')
      } else {
        await api.deactivateTierBenefit(benefit.tierBenefitId)
        showToast(`Đã vô hiệu hóa quyền lợi: ${benefit.benefitTypeName}`, 'success')
      }
      setBenefits(prev => prev.map(b => b.tierBenefitId === benefit.tierBenefitId ? { ...b, isActive: targetStatus } : b))
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err), 'error')
    } finally {
      setActionLoadingBenefitId(null)
    }
  }

  // Delete Benefit
  const handleDeleteBenefit = async () => {
    if (!benefitToDelete) return
    setDeleteBenefitLoading(true)
    try {
      await api.deleteTierBenefit(benefitToDelete.tierBenefitId)
      showToast(`Đã xóa vĩnh viễn quyền lợi: ${benefitToDelete.benefitTypeName}`, 'success')
      setBenefitToDelete(null)
      if (selectedTier) fetchBenefits(selectedTier.tierId)
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err), 'error')
    } finally {
      setDeleteBenefitLoading(false)
    }
  }

  // Open Tier modal
  const openTierModal = (mode: TierModalMode, tier: Tier | null = null) => {
    setTierFormError(null)
    if (mode === 'edit' && tier) {
      setTierForm({
        tierName: tier.tierName,
        minPoints: tier.minPoints,
        earnRate: tier.earnRate,
        benefits: tier.benefits || '',
      })
    } else {
      setTierForm({
        tierName: '',
        minPoints: 0,
        earnRate: 1.0,
        benefits: '',
      })
    }
    setTierModalMode(mode)
  }

  // Handle Tier Submit
  const handleTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTierFormLoading(true)
    setTierFormError(null)
    try {
      if (tierForm.minPoints < 0) {
        throw new Error('Số điểm tối thiểu phải lớn hơn hoặc bằng 0')
      }
      if (tierForm.earnRate < 0) {
        throw new Error('Tỉ lệ tích điểm phải lớn hơn hoặc bằng 0')
      }

      if (tierModalMode === 'create') {
        const created = await api.createTier({
          TierName: tierForm.tierName,
          MinPoints: tierForm.minPoints,
          EarnRate: tierForm.earnRate,
          Benefits: tierForm.benefits || undefined,
        })
        showToast(`Tạo thành công hạng mới: ${created.tierName}`, 'success')
        setTierModalMode(null)
        await fetchTiers(false)
      } else if (tierModalMode === 'edit' && selectedTier) {
        const updated = await api.updateTier(selectedTier.tierId, {
          TierName: tierForm.tierName,
          MinPoints: tierForm.minPoints,
          EarnRate: tierForm.earnRate,
          Benefits: tierForm.benefits || undefined,
        })
        showToast(`Cập nhật thành công hạng: ${updated.tierName}`, 'success')
        setTierModalMode(null)
        await fetchTiers(true)
      }
    } catch (err: any) {
      console.error(err)
      setTierFormError(err?.message || 'Lưu thông tin hạng thành viên thất bại.')
    } finally {
      setTierFormLoading(false)
    }
  }

  // Open Benefit modal
  const openBenefitModal = (mode: BenefitModalMode, benefit: TierBenefit | null = null) => {
    setBenefitFormError(null)
    if (mode === 'edit' && benefit) {
      setSelectedBenefit(benefit)
      setBenefitForm({
        benefitType: benefit.benefitType,
        benefitValue: benefit.benefitValue,
        description: benefit.description || '',
      })
    } else {
      // Find the first benefit type that doesn't exist in the current tier's benefits
      const existingTypes = benefits.map(b => b.benefitType)
      const firstAvailableType = [1, 2, 3, 4, 5].find(t => !existingTypes.includes(t)) || 1
      
      setSelectedBenefit(null)
      setBenefitForm({
        benefitType: firstAvailableType,
        benefitValue: '',
        description: '',
      })
    }
    setBenefitModalMode(mode)
  }

  // Validate benefit value based on type
  const validateBenefitValue = (type: number, value: string) => {
    const valTrim = value.trim()
    if (!valTrim) throw new Error('Vui lòng nhập giá trị quyền lợi.')

    if (type === 1 || type === 5) {
      const num = Number(valTrim)
      if (isNaN(num) || num < 0 || num > 100) {
        throw new Error('Giá trị phần trăm phải là một số từ 0 đến 100.')
      }
    } else if (type === 2) {
      const num = Number(valTrim)
      if (isNaN(num) || !Number.isInteger(num) || num < 0) {
        throw new Error('Số ngày đặt trước phải là một số nguyên dương.')
      }
    }
  }

  // Handle Benefit Submit
  const handleBenefitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTier) return
    setBenefitFormLoading(true)
    setBenefitFormError(null)
    try {
      validateBenefitValue(benefitForm.benefitType, benefitForm.benefitValue)

      const payload = {
        BenefitType: benefitForm.benefitType,
        BenefitValue: benefitForm.benefitValue.trim(),
        Description: benefitForm.description.trim() || undefined,
      }

      if (benefitModalMode === 'create') {
        await api.createTierBenefit(selectedTier.tierId, payload)
        showToast('Thêm quyền lợi mới thành công', 'success')
      } else if (benefitModalMode === 'edit' && selectedBenefit) {
        await api.updateTierBenefit(selectedBenefit.tierBenefitId, payload)
        showToast('Cập nhật quyền lợi thành công', 'success')
      }
      setBenefitModalMode(null)
      fetchBenefits(selectedTier.tierId)
    } catch (err: any) {
      console.error(err)
      setBenefitFormError(err?.message || 'Lưu quyền lợi thất bại. Vui lòng thử lại.')
    } finally {
      setBenefitFormLoading(false)
    }
  }

  // Helper labels for benefit format guidelines
  const getBenefitHelperText = (type: number) => {
    switch (type) {
      case 1:
        return 'Tỷ lệ % giảm giá trực tiếp vào hóa đơn đặt lịch rửa xe (ví dụ: 10 đại diện cho giảm 10%).'
      case 2:
        return 'Số ngày tối đa khách hàng có thể đặt lịch trước (ví dụ: 5 nghĩa là được đặt trước tối đa 5 ngày).'
      case 3:
        return 'Mô tả dịch vụ miễn phí được tặng kèm (ví dụ: Miễn phí 1 lần rửa khoang máy hoặc Miễn phí vệ sinh lọc gió).'
      case 4:
        return 'Mô tả dịch vụ hỗ trợ ưu tiên (ví dụ: Phục vụ ngay không cần xếp hàng, hoặc Hotline hỗ trợ 24/7).'
      case 5:
        return 'Tỷ lệ % điểm thưởng cộng thêm khi tích điểm hóa đơn (ví dụ: 20 đại diện cho việc cộng thêm 20% số điểm tích lũy chuẩn).'
      default:
        return ''
    }
  }

  return (
    <div className="portal-page tiers-page">
      {/* Page Header */}
      <div className="dash-header">
        <div>
          <h2>Quản lý hạng thành viên</h2>
          <p>Cấu hình các hạng thành viên khách hàng và quyền lợi tương ứng theo mức tích lũy.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-premium-glow"
          onClick={() => openTierModal('create')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm hạng mới
        </button>
      </div>

      {/* Main split screen layout */}
      <div className="tiers-dashboard-layout">
        
        {/* Left Side: Tiers list */}
        <div className="tiers-list-pane">
          {loadingTiers ? (
            // Skeleton load list
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton-tier-card skeleton-shimmer" />
            ))
          ) : error ? (
            <div className="empty-state-premium">
              <div className="empty-state-icon-premium">⚠️</div>
              <h3>Có lỗi xảy ra</h3>
              <p>{error}</p>
              <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={() => fetchTiers(false)}>
                Thử lại
              </button>
            </div>
          ) : tiers.length === 0 ? (
            <div className="empty-state-premium">
              <div className="empty-state-icon-premium">👑</div>
              <h3>Không tìm thấy hạng thành viên nào</h3>
              <p>Chưa có hạng thành viên nào được tạo. Hãy tạo mới hạng đầu tiên!</p>
            </div>
          ) : (
            tiers.map(t => {
              const isSelected = selectedTier?.tierId === t.tierId
              const tierClass = getTierClassName(t.tierName)
              return (
                <div
                  key={t.tierId}
                  className={`tier-card-premium ${tierClass} ${isSelected ? 'selected' : ''} ${t.isActive ? 'active-tier' : 'inactive-tier'}`}
                  onClick={() => setSelectedTier(t)}
                >
                  <div className="tier-card-header">
                    <div className="tier-title-area">
                      <h3>{t.tierName}</h3>
                    </div>
                    <span className={`badge tier-badge ${t.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {t.isActive ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>

                  <div className="tier-body">
                    <div className="tier-stat-item">
                      <span className="tier-stat-label">Điểm tối thiểu</span>
                      <span className="tier-stat-value">
                        {t.minPoints.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>điểm</span>
                      </span>
                    </div>
                    <div className="tier-stat-item">
                      <span className="tier-stat-label">Hệ số tích điểm</span>
                      <span className="tier-stat-value tier-stat-value-highlight">
                        x{t.earnRate}
                      </span>
                    </div>
                  </div>

                  {t.benefits && (
                    <div className="tier-desc">
                      <strong>Tổng quan:</strong> {t.benefits}
                    </div>
                  )}

                  <div className="tier-actions">
                    {/* Active toggle switch */}
                    <label className="switch-premium" title={t.isActive ? 'Vô hiệu hóa hạng' : 'Kích hoạt hạng'} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={t.isActive}
                        disabled={actionLoadingTierId === t.tierId}
                        onChange={(e) => handleToggleTierActive(e as any, t)}
                      />
                      <span className="slider-premium" />
                    </label>

                    <div className="tier-action-buttons">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px 12px' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          openTierModal('edit', t)
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Sửa
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          
          {/* Pagination */}
          {!loadingTiers && !error && tiers.length > 0 && (
            <div className="pagination-container-premium animate-fade-in" style={{ marginTop: '20px' }}>
              <div className="pagination-stats" style={{ fontSize: '0.85rem' }}>
                Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng: {totalCount})
              </div>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Benefits config detail */}
        <div className={`benefits-detail-pane ${loadingBenefits ? 'skeleton-shimmer' : ''}`}>
          {!selectedTier ? (
            <div className="empty-state-premium" style={{ border: 'none', height: '100%' }}>
              <div className="empty-state-icon-premium">✨</div>
              <h3>Chưa chọn Hạng thành viên</h3>
              <p>Chọn một hạng thành viên ở cột bên trái để quản lý chi tiết các quyền lợi đi kèm hạng đó.</p>
            </div>
          ) : (
            <div>
              <div className="benefits-header">
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--color-heading)' }}>
                    Quyền lợi: Hạng {selectedTier.tierName}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Tối đa 5 quyền lợi tương ứng với 5 loại cấu hình.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={loadingBenefits || benefits.length >= 5}
                  onClick={() => openBenefitModal('create')}
                  title={benefits.length >= 5 ? 'Hạng này đã có đầy đủ 5 loại quyền lợi tối đa.' : 'Thêm quyền lợi'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Thêm quyền lợi
                </button>
              </div>

              {loadingBenefits ? (
                <div className="benefits-list">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="skeleton-user-card skeleton-shimmer" style={{ height: '70px', padding: '12px' }} />
                  ))}
                </div>
              ) : benefits.length === 0 ? (
                <div className="empty-state-premium" style={{ background: 'transparent' }}>
                  <div className="empty-state-icon-premium">🎁</div>
                  <h3>Chưa có quyền lợi chi tiết</h3>
                  <p>Hạng này chưa được gán bất kỳ quyền lợi cụ thể nào. Nhấp vào "Thêm quyền lợi" để thiết lập.</p>
                </div>
              ) : (
                <div className="benefits-list">
                  {benefits.map(b => (
                    <div
                      key={b.tierBenefitId}
                      className={`benefit-item-card ${b.isActive ? 'active-benefit' : 'inactive-benefit'}`}
                    >
                      <div className="benefit-details-col">
                        <div className="benefit-title-row">
                          <span className="benefit-type-tag">{b.benefitTypeName}</span>
                          <span className="benefit-val-badge">
                            {b.benefitType === 1 || b.benefitType === 5 ? `${b.benefitValue}%` : 
                             b.benefitType === 2 ? `${b.benefitValue} ngày` : b.benefitValue}
                          </span>
                        </div>
                        {b.description && (
                          <span className="benefit-desc-text">{b.description}</span>
                        )}
                      </div>

                      <div className="benefit-actions-col">
                        {/* Switch active toggle */}
                        <label className="switch-premium" title={b.isActive ? 'Tạm tắt quyền lợi' : 'Kích hoạt lại quyền lợi'}>
                          <input
                            type="checkbox"
                            checked={b.isActive}
                            disabled={actionLoadingBenefitId === b.tierBenefitId}
                            onChange={() => handleToggleBenefitActive(b)}
                          />
                          <span className="slider-premium" />
                        </label>

                        {/* Edit button */}
                        <button
                          type="button"
                          className="action-btn-circle"
                          title="Sửa quyền lợi"
                          onClick={() => openBenefitModal('edit', b)}
                          disabled={actionLoadingBenefitId === b.tierBenefitId}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          className="action-btn-circle"
                          title="Xóa vĩnh viễn"
                          onClick={() => setBenefitToDelete(b)}
                          disabled={actionLoadingBenefitId === b.tierBenefitId}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Tier Modal ── */}
      {tierModalMode && (
        <div className="confirm-modal-overlay" onClick={() => !tierFormLoading && setTierModalMode(null)}>
          <div className="confirm-modal-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'left', alignItems: 'stretch' }}>
            <div className="vehicle-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--color-heading)' }}>
                  {tierModalMode === 'edit' ? 'Chỉnh sửa Hạng thành viên' : 'Thêm Hạng thành viên mới'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Thiết lập tên hạng, mốc điểm tối thiểu và hệ số tích điểm.
                </p>
              </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setTierModalMode(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleTierSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {tierFormError && (
                <div className="badge badge-danger" style={{ display: 'block', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  {tierFormError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="tier-name-input">Tên hạng *</label>
                <input
                  id="tier-name-input"
                  className="form-input"
                  required
                  placeholder="Ví dụ: Đồng, Bạc, Vàng, Kim cương..."
                  value={tierForm.tierName}
                  onChange={e => {
                    setTierForm(prev => ({ ...prev, tierName: e.target.value }))
                    setTierFormError(null)
                  }}
                />
              </div>

              <div className="form-row-double">
                <div className="form-group">
                  <label className="form-label" htmlFor="tier-points-input">Điểm tích lũy tối thiểu *</label>
                  <input
                    id="tier-points-input"
                    type="number"
                    min="0"
                    className="form-input"
                    required
                    placeholder="Ví dụ: 500"
                    value={tierForm.minPoints || ''}
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0
                      setTierForm(prev => ({ ...prev, minPoints: val }))
                      setTierFormError(null)
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="tier-rate-input">Tỷ lệ tích điểm thưởng *</label>
                  <input
                    id="tier-rate-input"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    required
                    placeholder="Ví dụ: 1.2"
                    value={tierForm.earnRate || ''}
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0.0
                      setTierForm(prev => ({ ...prev, earnRate: val }))
                      setTierFormError(null)
                    }}
                  />
                  <span className="benefit-help-text" style={{ marginTop: '4px', display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Hệ số nhân điểm thưởng (ví dụ: 1.0 là mặc định, 1.2 là tích điểm nhanh hơn 20%). Tránh nhập dạng phần trăm 100.
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="tier-desc-input">Tổng quan quyền lợi (Mô tả ngắn)</label>
                <textarea
                  id="tier-desc-input"
                  className="form-input"
                  rows={3}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                  placeholder="Ví dụ: Tặng quà sinh nhật, Giảm giá đặt trước và có hàng ưu tiên..."
                  value={tierForm.benefits}
                  onChange={e => setTierForm(prev => ({ ...prev, benefits: e.target.value }))}
                />
              </div>

              <div className="confirm-modal-actions" style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setTierModalMode(null)}
                  disabled={tierFormLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={tierFormLoading}
                >
                  {tierFormLoading ? 'Đang lưu...' : (tierModalMode === 'edit' ? 'Lưu thay đổi' : 'Tạo mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add / Edit Benefit Modal ── */}
      {benefitModalMode && selectedTier && (
        <div className="confirm-modal-overlay" onClick={() => !benefitFormLoading && setBenefitModalMode(null)}>
          <div className="confirm-modal-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'left', alignItems: 'stretch' }}>
            <div className="vehicle-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--color-heading)' }}>
                  {benefitModalMode === 'edit' ? 'Chỉnh sửa Quyền lợi' : `Thêm Quyền lợi: Hạng ${selectedTier.tierName}`}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Thiết lập giá trị cụ thể và mô tả chi tiết cho loại quyền lợi.
                </p>
              </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setBenefitModalMode(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleBenefitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {benefitFormError && (
                <div className="badge badge-danger" style={{ display: 'block', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  {benefitFormError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="benefit-type-select">Loại quyền lợi *</label>
                <select
                  id="benefit-type-select"
                  className="form-input form-select-custom"
                  value={benefitForm.benefitType}
                  disabled={benefitModalMode === 'edit'} // Benefit type must be unique, edit type of existing record is not logical
                  onChange={e => {
                    const newType = parseInt(e.target.value)
                    setBenefitForm(prev => ({ ...prev, benefitType: newType, benefitValue: '' }))
                  }}
                >
                  {[1, 2, 3, 4, 5].map(typeVal => {
                    const isExisting = benefits.some(b => b.benefitType === typeVal)
                    const isEditingThis = selectedBenefit?.benefitType === typeVal
                    
                    // Logic: Hide or disable type if it already exists on this tier (and we aren't editing it)
                    if (isExisting && !isEditingThis && benefitModalMode !== 'edit') {
                      return null
                    }
                    
                    return (
                      <option key={typeVal} value={typeVal}>
                        {BenefitTypeLabels[typeVal]}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="benefit-value-input">Giá trị quyền lợi *</label>
                <div className="benefit-form-input-wrapper form-input-addon-container">
                  <input
                    id="benefit-value-input"
                    className="form-input"
                    required
                    type={benefitForm.benefitType === 1 || benefitForm.benefitType === 2 || benefitForm.benefitType === 5 ? 'number' : 'text'}
                    min="0"
                    placeholder={
                      benefitForm.benefitType === 1 || benefitForm.benefitType === 5 ? 'Ví dụ: 15' : 
                      benefitForm.benefitType === 2 ? 'Ví dụ: 7' : 'Ví dụ: Tặng khăn lau cao cấp'
                    }
                    value={benefitForm.benefitValue}
                    onChange={e => setBenefitForm(prev => ({ ...prev, benefitValue: e.target.value }))}
                  />
                  {(benefitForm.benefitType === 1 || benefitForm.benefitType === 5) && (
                    <span className="benefit-form-input-addon">%</span>
                  )}
                  {benefitForm.benefitType === 2 && (
                    <span className="benefit-form-input-addon">ngày</span>
                  )}
                </div>
                <span className="benefit-help-text">
                  {getBenefitHelperText(benefitForm.benefitType)}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="benefit-desc-input">Mô tả hiển thị chi tiết (Dành cho khách hàng)</label>
                <input
                  id="benefit-desc-input"
                  className="form-input"
                  placeholder="Ví dụ: Giảm giá 10% cho mỗi hóa đơn rửa xe tự động..."
                  value={benefitForm.description}
                  onChange={e => setBenefitForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="confirm-modal-actions" style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setBenefitModalMode(null)}
                  disabled={benefitFormLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={benefitFormLoading}
                >
                  {benefitFormLoading ? 'Đang lưu...' : (benefitModalMode === 'edit' ? 'Lưu thay đổi' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!benefitToDelete}
        title="Xóa Quyền Lợi"
        variant="danger"
        isLoading={deleteBenefitLoading}
        onCancel={() => setBenefitToDelete(null)}
        onConfirm={handleDeleteBenefit}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        message={
          <>
            <p>
              Bạn có chắc chắn muốn xóa quyền lợi{' '}
              <strong style={{ color: 'var(--color-heading)', background: 'var(--color-primary-dim)', padding: '2px 6px', borderRadius: '4px' }}>
                {benefitToDelete?.benefitTypeName}
              </strong>{' '}
              khỏi hạng này không?
            </p>
            <div className="confirm-modal-warning" style={{ marginTop: '12px', color: 'var(--color-danger)' }}>
              Hành động này không thể hoàn tác. Khách hàng thuộc hạng này sẽ mất quyền lợi này ngay lập tức.
            </div>
          </>
        }
      />

      {/* Toast Notifications container */}
      <div className="toast-container-custom">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast-custom ${toast.type === 'success' ? 'toast-custom-success' : 'toast-custom-error'}`}
          >
            {toast.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 8 12 12 16 14" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span style={{ fontSize: '0.92rem', color: 'var(--color-heading)', fontWeight: 500 }}>
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
// Recompiled to clear Vite cache
