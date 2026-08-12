import { useState, useEffect } from 'react'
import api from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import AnimatedButton from '../../components/AnimatedButton'
import ConfirmModal from '../../components/ConfirmModal'
import Pagination from '../../components/Pagination'
import VoucherCard from '../../components/VoucherCard'
import './CustomerVouchers.css'
import '../Dashboard.css'

export default function CustomerVouchers() {
  
  // Tabs: 'my-vouchers' | 'redeem'
  const [activeTab, setActiveTab] = useState<'my-vouchers' | 'redeem'>('my-vouchers')
  
  // My Vouchers tab states
  const [myVouchers, setMyVouchers] = useState<any[]>([])
  const [myStatus, setMyStatus] = useState<number>(1) // 1 = Chưa sử dụng, 2 = Đã dùng, 3 = Hết hạn
  const [myPage, setMyPage] = useState<number>(1)
  const [myTotalCount, setMyTotalCount] = useState<number>(0)
  const [myLoading, setMyLoading] = useState<boolean>(false)
  
  // Redeem tab states
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([])
  const [availPage, setAvailPage] = useState<number>(1)
  const availPageSize = 6
  const [customerPoints, setCustomerPoints] = useState<number>(0)
  const [redeemLoading, setRedeemLoading] = useState<boolean>(false)
  
  // Branch filter for Redeem tab
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  
  // Modals & Feedback
  const [confirmRedeemVoucher, setConfirmRedeemVoucher] = useState<any | null>(null)
  const [submittingRedeem, setSubmittingRedeem] = useState<boolean>(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Fetch customer points & loyalty
  const fetchPoints = async () => {
    try {
      const data = await api.getMyLoyalty()
      setCustomerPoints(data?.currentPoints ?? data?.CurrentPoints ?? 0)
    } catch (err) {
      console.error('Lỗi khi lấy điểm tích lũy:', err)
    }
  }

  // Fetch My Vouchers
  const fetchMyVouchersList = async (page: number, status: number) => {
    setMyLoading(true)
    try {
      const res = await api.getMyVouchers({
        page,
        pageSize: 6,
        voucherStatus: status
      })
      setMyVouchers(res.items || [])
      setMyTotalCount(res.totalCount || 0)
    } catch (err) {
      console.error('Lỗi lấy danh sách voucher của tôi:', err)
      setMyVouchers([])
    } finally {
      setMyLoading(false)
    }
  }

  // Fetch Available Vouchers for Redemption
  const fetchAvailableVouchersList = async (branchId?: string) => {
    setRedeemLoading(true)
    try {
      const res = await api.getAvailableVouchers(branchId || undefined)
      setAvailableVouchers(res || [])
    } catch (err) {
      console.error('Lỗi lấy danh sách voucher có thể đổi:', err)
      setAvailableVouchers([])
    } finally {
      setRedeemLoading(false)
    }
  }

  // Fetch all active branches for branch filter
  const fetchBranches = async () => {
    try {
      const res = await api.getBranches({ isActive: true })
      setBranches(res.items || [])
    } catch (err) {
      console.error('Lỗi lấy danh sách chi nhánh:', err)
    }
  }

  // Initial load & Tab changes
  useEffect(() => {
    fetchPoints()
    fetchBranches()
    if (activeTab === 'my-vouchers') {
      fetchMyVouchersList(myPage, myStatus)
    } else {
      setAvailPage(1)
      fetchAvailableVouchersList(selectedBranchId)
    }
    setFeedbackMsg(null)
  }, [activeTab, myPage, myStatus])

  // Re-fetch when branch changes in redeem tab
  useEffect(() => {
    if (activeTab === 'redeem') {
      setAvailPage(1)
      fetchAvailableVouchersList(selectedBranchId)
    }
  }, [selectedBranchId])

  // Handle voucher copy code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Handle voucher redemption
  const handleRedeemVoucher = async () => {
    if (!confirmRedeemVoucher) return
    setSubmittingRedeem(true)
    setFeedbackMsg(null)
    try {
      const voucherId = confirmRedeemVoucher.VoucherId || confirmRedeemVoucher.voucherId
      await api.redeemVoucher(voucherId)
      
      // Update points and list
      await fetchPoints()
      await fetchAvailableVouchersList()
      
      setFeedbackMsg({
        type: 'success',
        text: `Đổi voucher ${confirmRedeemVoucher.VoucherCode || confirmRedeemVoucher.voucherCode} thành công!`
      })
      setConfirmRedeemVoucher(null)
      
      // Switch back or refresh
      setTimeout(() => {
        setActiveTab('my-vouchers')
        setMyStatus(1)
        setMyPage(1)
      }, 1500)
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: extractErrorMessage(err, 'Đổi voucher thất bại. Vui lòng kiểm tra lại điểm tích lũy.')
      })
    } finally {
      setSubmittingRedeem(false)
    }
  }

  // Formatter helpers
  const formatDiscount = (type: number, val: number) => {
    if (type === 1) return `${val}%`
    return `${val.toLocaleString('vi-VN')}đ`
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    let normalizedStr = dateStr
    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !/\-\d{2}:\d{2}$/.test(dateStr)) {
      normalizedStr = dateStr + 'Z'
    }
    const date = new Date(normalizedStr)
    const pad = (n: number) => String(n).padStart(2, '0')
    const day = pad(date.getDate())
    const month = pad(date.getMonth() + 1)
    const year = date.getFullYear()
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    return `${hours}:${minutes} ngày ${day}/${month}/${year}`
  }

  return (
    <div className="portal-page vouchers-page-container">
      <div className="dash-header">
        <div>
          <h2>Ưu đãi & Voucher</h2>
          <p>Xem danh sách quà tặng và đổi mã giảm giá bằng điểm tích lũy của bạn.</p>
        </div>
        <div className="points-display-badge card">
          <div className="points-badge-icon">🪙</div>
          <div className="points-badge-text">
            <span>Điểm tích lũy hiện có</span>
            <strong>{customerPoints.toLocaleString('vi-VN')} điểm</strong>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`feedback-alert animate-fade-in ${feedbackMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          <span className="alert-icon">{feedbackMsg.type === 'success' ? '✅' : '❌'}</span>
          <span className="alert-text">{feedbackMsg.text}</span>
          <button type="button" className="alert-close" onClick={() => setFeedbackMsg(null)}>&times;</button>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="vouchers-tabs">
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'my-vouchers' ? 'active' : ''}`}
          onClick={() => { setActiveTab('my-vouchers'); setMyPage(1); }}
        >
          🎫 Voucher của tôi
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'redeem' ? 'active' : ''}`}
          onClick={() => setActiveTab('redeem')}
        >
          🎁 Đổi Quà Tặng
        </button>
      </div>

      {activeTab === 'my-vouchers' && (
        <div className="tab-content-container animate-fade-up">
          {/* Status Filters */}
          <div className="filters-row">
            <button 
              type="button" 
              className={`filter-badge ${myStatus === 1 ? 'active' : ''}`}
              onClick={() => { setMyStatus(1); setMyPage(1); }}
            >
              Chưa sử dụng
            </button>
            <button 
              type="button" 
              className={`filter-badge ${myStatus === 2 ? 'active' : ''}`}
              onClick={() => { setMyStatus(2); setMyPage(1); }}
            >
              Đã sử dụng
            </button>
            <button 
              type="button" 
              className={`filter-badge ${myStatus === 3 ? 'active' : ''}`}
              onClick={() => { setMyStatus(3); setMyPage(1); }}
            >
              Đã hết hạn
            </button>
          </div>

          {myLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Đang tải danh sách voucher...</p>
            </div>
          ) : myVouchers.length === 0 ? (
            <div className="empty-statecard card">
              <div className="empty-state-icon">🎟️</div>
              <h3>Không tìm thấy voucher nào</h3>
              <p>Bạn chưa có voucher thuộc nhóm này. Hãy tích cực đặt lịch và đổi thưởng nhé!</p>
              {myStatus === 1 && (
              <AnimatedButton type="button" variant="primary" onClick={() => setActiveTab('redeem')} style={{ marginTop: '16px' }}>
                Đổi Voucher Ngay
              </AnimatedButton>
              )}
            </div>
          ) : (
            <>
              <div className="vouchers-grid">
                {myVouchers.map((item) => {
                  const itemStatus = item.VoucherStatus ?? item.voucherStatus ?? 1
                  const isExpired = itemStatus === 3
                  const isUsed = itemStatus === 2
                  const code = item.VoucherCode || item.voucherCode
                  const discountVal = item.DiscountValue ?? item.discountValue ?? 0
                  const type = item.DiscountType ?? item.discountType ?? 1
                  const minOrder = item.MinOrderAmount ?? item.minOrderAmount
                  const maxDiscount = item.MaxDiscountAmount ?? item.maxDiscountAmount
                  const expiry = item.ExpiredAtUtc ?? item.expiredAtUtc ?? item.EndUtc ?? item.endUtc

                  const conditions = [
                    minOrder != null && <>Đơn tối thiểu: <strong>{minOrder.toLocaleString('vi-VN')}đ</strong></>,
                    maxDiscount != null && type === 1 && <>Giảm tối đa: <strong>{maxDiscount.toLocaleString('vi-VN')}đ</strong></>,
                    <>Hạn dùng: <strong>{formatDate(expiry)}</strong></>
                  ].filter(Boolean) as React.ReactNode[]

                  return (
                    <VoucherCard
                      key={item.UserVoucherId || item.userVoucherId}
                      discountText={formatDiscount(type, discountVal)}
                      discountTag={type === 1 ? 'GIẢM PHẦN TRĂM' : 'GIẢM GIÁ TIỀN'}
                      title="Mã giảm giá"
                      code={code}
                      isExpired={isExpired}
                      isUsed={isUsed}
                      conditions={conditions}
                      actionButton={
                        !isUsed && !isExpired && (
                          <button 
                            type="button" 
                            className="copy-btn" 
                            onClick={() => handleCopyCode(code)}
                            title="Sao chép mã"
                          >
                            {copiedCode === code ? 'Đã chép!' : 'Sao chép'}
                          </button>
                        )
                      }
                      footer={
                        isUsed ? (
                          <span className="ticket-status-label used">ĐÃ SỬ DỤNG</span>
                        ) : isExpired ? (
                          <span className="ticket-status-label expired">HẾT HẠN</span>
                        ) : (
                          <span className="ticket-status-label available">CÓ HIỆU LỰC</span>
                        )
                      }
                    />
                  )
                })}
              </div>

              <Pagination
                currentPage={myPage}
                totalPages={Math.ceil(myTotalCount / 6)}
                totalCount={myTotalCount}
                itemName="voucher"
                onPageChange={setMyPage}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'redeem' && (
        <div className="tab-content-container animate-fade-up">

          {/* Branch Filter */}
          <div className="cv-branch-selector-wrapper">
            <label htmlFor="cv-branch-select" className="branch-select-label">
              <span>📍</span> Chọn chi nhánh:
            </label>
            <div className="branch-select-container">
              <select
                id="cv-branch-select"
                className="branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                <option value="">Tất cả chi nhánh</option>
                {branches.map((b: any) => {
                  const id = b.branchId ?? b.BranchId
                  const name = b.branchName ?? b.BranchName ?? b.name ?? b.Name
                  const address = b.address ?? b.Address ?? ''
                  const city = b.city ?? b.City ?? ''
                  return (
                    <option key={id} value={id}>
                      {name}{address ? ` - ${address}` : ''}{city ? `, ${city}` : ''}
                    </option>
                  )
                })}
              </select>
              <div className="branch-select-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {redeemLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Đang tải danh sách voucher ưu đãi...</p>
            </div>
          ) : availableVouchers.length === 0 ? (
            <div className="empty-statecard card">
              <div className="empty-state-icon">🎁</div>
              <h3>Không có quà tặng khả dụng</h3>
              <p>Hiện tại không có chương trình ưu đãi đổi voucher nào đang hoạt động. Vui lòng quay lại sau.</p>
            </div>
          ) : (
            (() => {
              const displayedAvailable = availableVouchers.slice(
                (availPage - 1) * availPageSize,
                availPage * availPageSize
              )

              return (
                <>
                  <div className="vouchers-grid">
                    {displayedAvailable.map((item) => {
                      const discountVal = item.DiscountValue ?? item.discountValue ?? 0
                      const type = item.DiscountType ?? item.discountType ?? 1
                      const reqPoints = item.RequiredPoints ?? item.requiredPoints ?? 0
                      const code = item.VoucherCode || item.voucherCode
                      const canRedeem = customerPoints >= reqPoints
                      const branch = item.BranchName || item.branchName

                      const conditions = [
                        <>Mã ưu đãi: <strong>{code}</strong></>,
                        branch && <>Áp dụng tại: <strong>{branch}</strong></>,
                        <>Thời hạn đổi: <strong>đến {formatDate(item.EndUtc || item.endUtc)}</strong></>
                      ].filter(Boolean) as React.ReactNode[]

                      return (
                        <VoucherCard
                          key={item.VoucherId || item.voucherId}
                          className="redeemable-ticket"
                          discountText={formatDiscount(type, discountVal)}
                          discountTag={type === 1 ? 'GIẢM PHẦN TRĂM' : 'GIẢM GIÁ TIỀN'}
                          title="Voucher Đổi Thưởng"
                          code={code}
                          conditions={conditions}
                          actionButton={
                            <span className="points-requirement-label">{reqPoints.toLocaleString('vi-VN')} điểm</span>
                          }
                          footer={
                            <AnimatedButton
                              type="button"
                              variant={canRedeem ? 'premium' : 'secondary'}
                              disabled={!canRedeem}
                              onClick={() => setConfirmRedeemVoucher(item)}
                              style={{ width: '100%', fontSize: '0.85rem' }}
                            >
                              {canRedeem ? 'Đổi Voucher' : `Cần thêm ${(reqPoints - customerPoints).toLocaleString('vi-VN')} điểm`}
                            </AnimatedButton>
                          }
                        />
                      )
                    })}
                  </div>

                  <Pagination
                    currentPage={availPage}
                    totalPages={Math.ceil(availableVouchers.length / availPageSize)}
                    totalCount={availableVouchers.length}
                    itemName="voucher"
                    onPageChange={setAvailPage}
                  />
                </>
              )
            })())}
          </div>
        )}

      <ConfirmModal
        isOpen={!!confirmRedeemVoucher}
        title="Xác nhận đổi Voucher"
        variant="primary"
        isLoading={submittingRedeem}
        onCancel={() => setConfirmRedeemVoucher(null)}
        onConfirm={handleRedeemVoucher}
        confirmText="Xác nhận đổi"
        cancelText="Hủy bỏ"
        message={
          <>
            <p>
              Bạn có chắc chắn muốn dùng{' '}
              <strong style={{ color: 'var(--color-primary)' }}>
                {((confirmRedeemVoucher?.RequiredPoints ?? confirmRedeemVoucher?.requiredPoints) || 0).toLocaleString('vi-VN')} điểm
              </strong>{' '}
              để đổi mã ưu đãi{' '}
              <strong style={{ color: 'var(--color-heading)' }}>
                {confirmRedeemVoucher?.VoucherCode || confirmRedeemVoucher?.voucherCode}
              </strong>?
            </p>
            <div className="confirm-modal-warning" style={{ marginTop: '12px' }}>
              Voucher sau khi đổi sẽ xuất hiện trong tab "Voucher của tôi" và điểm tích lũy của bạn sẽ bị trừ tương ứng.
            </div>
          </>
        }
      />
    </div>
  )
}
