import { useEffect, useState } from 'react'
import api from '../../services/api'
import type { Branch } from '../../types/branch'
import type { ReviewItem } from '../../types/review'
import { extractErrorMessage } from '../../utils/errorUtils'
import ConfirmModal from '../../components/ConfirmModal'
import './ManagerReviews.css'

export default function ManagerReviews() {
  const [myBranch, setMyBranch] = useState<Branch | null>(null)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filters state
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined)
  const [visibilityFilter, setVisibilityFilter] = useState<boolean | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [typeFilter, setTypeFilter] = useState<number | undefined>(undefined)

  // Moderation state statistics
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    visibleCount: 0,
    hiddenCount: 0,
  })

  // Delete review confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Load branch on mount
  useEffect(() => {
    async function loadBranch() {
      try {
        const branch = await api.getMyBranch()
        setMyBranch(branch)
      } catch (err) {
        setError(extractErrorMessage(err, 'Không thể tải thông tin chi nhánh.'))
      }
    }
    loadBranch()
  }, [])

  // Load reviews when branch or query parameters change
  const fetchReviews = async () => {
    if (!myBranch?.branchId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.getReviewsForModeration({
        branchId: myBranch.branchId,
        page,
        pageSize: 6,
        rating: ratingFilter,
        isHidden: visibilityFilter,
        search: searchQuery.trim() || undefined,
        reviewType: typeFilter,
      })
      setReviews(res.items || [])
      setTotalCount(res.totalCount)
      setTotalPages(res.totalPages)
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể tải danh sách đánh giá.'))
    } finally {
      setLoading(false)
    }
  }

  // Load statistics (gets all reviews to calculate)
  const fetchStats = async () => {
    if (!myBranch?.branchId) return
    try {
      const res = await api.getReviewsForModeration({
        branchId: myBranch.branchId,
        page: 1,
        pageSize: 1000,
      })
      const items = res.items || []
      const total = items.length
      const visible = items.filter(r => !r.isHidden).length
      const hidden = items.filter(r => r.isHidden).length
      
      // Only average Service Reviews (Type 1) to represent overall branch service rating accurately
      const serviceReviews = items.filter(r => r.reviewType === 1)
      const avg = serviceReviews.length > 0 ? serviceReviews.reduce((acc, r) => acc + r.rating, 0) / serviceReviews.length : 0
      
      setStats({
        averageRating: Number(avg.toFixed(1)),
        totalReviews: total,
        visibleCount: visible,
        hiddenCount: hidden,
      })
    } catch (err) {
      console.error('Failed to load review statistics', err)
    }
  }

  useEffect(() => {
    if (myBranch?.branchId) {
      fetchReviews()
      fetchStats()
    }
  }, [myBranch, page, ratingFilter, visibilityFilter, typeFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchReviews()
  }

  const handleToggleHide = async (review: ReviewItem) => {
    setError(null)
    setSuccess(null)
    try {
      const newStatus = !review.isHidden
      await api.toggleHideReview(review.reviewId, newStatus)
      setSuccess(newStatus ? 'Ẩn đánh giá thành công!' : 'Hiển thị đánh giá thành công!')
      // Refresh local list & stats
      fetchReviews()
      fetchStats()
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể thay đổi trạng thái ẩn/hiện của đánh giá.'))
    }
  }

  const handleDeleteClick = (review: ReviewItem) => {
    setReviewToDelete(review)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return
    setDeleteLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await api.deleteReview(reviewToDelete.reviewId)
      setSuccess('Xóa đánh giá thành công!')
      setShowDeleteConfirm(false)
      setReviewToDelete(null)
      fetchReviews()
      fetchStats()
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể xóa đánh giá.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'star filled' : 'star empty'}>
          ★
        </span>
      )
    }
    return <div className="stars-wrapper">{stars}</div>
  }

  return (
    <div className="mgr-reviews">
      <div className="mgr-dash-header">
        <div>
          <h2>Quản lý Đánh giá khách hàng</h2>
          <p>{myBranch ? `Xem và kiểm duyệt đánh giá tại chi nhánh ${myBranch.name}.` : 'Tải thông tin chi nhánh...'}</p>
        </div>
      </div>

      {success && (
        <div className="alert-banner alert-success" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span>{success}</span>
          <button type="button" className="close-alert" onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}
      {error && (
        <div className="alert-banner alert-error" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span>{error}</span>
          <button type="button" className="close-alert" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mgr-stats-grid">
        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--cyan">★</div>
            <div className="mgr-stat-trend">{stats.averageRating >= 4.0 ? 'Tuyệt vời' : 'Trung bình'}</div>
          </div>
          <div className="mgr-stat-label">Điểm đánh giá trung bình</div>
          <div className="mgr-stat-value">{stats.averageRating} / 5</div>
        </div>

        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--blue">💬</div>
          </div>
          <div className="mgr-stat-label">Tổng số lượt đánh giá</div>
          <div className="mgr-stat-value">{stats.totalReviews}</div>
        </div>

        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--teal">👁</div>
          </div>
          <div className="mgr-stat-label">Đánh giá hiển thị</div>
          <div className="mgr-stat-value">{stats.visibleCount}</div>
        </div>

        <div className="mgr-stat-card">
          <div className="mgr-stat-top">
            <div className="mgr-stat-icon mgr-stat-icon--amber">⚙</div>
          </div>
          <div className="mgr-stat-label">Đánh giá bị ẩn</div>
          <div className="mgr-stat-value">{stats.hiddenCount}</div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="mgr-panel filter-panel">
        <form onSubmit={handleSearchSubmit} className="filter-form">
          <div className="filter-group-row">
            <div className="filter-item">
              <label className="form-label">Tìm kiếm đánh giá</label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập tên khách hàng, bình luận..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary search-submit-btn">Tìm kiếm</button>
              </div>
            </div>

            <div className="filter-item">
              <label className="form-label">Lọc số sao</label>
              <select
                className="form-input"
                value={ratingFilter === undefined ? '' : ratingFilter}
                onChange={e => {
                  const val = e.target.value
                  setRatingFilter(val === '' ? undefined : Number(val))
                  setPage(1)
                }}
              >
                <option value="">Tất cả số sao</option>
                <option value="5">5 Sao</option>
                <option value="4">4 Sao</option>
                <option value="3">3 Sao</option>
                <option value="2">2 Sao</option>
                <option value="1">1 Sao</option>
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">Trạng thái kiểm duyệt</label>
              <select
                className="form-input"
                value={visibilityFilter === undefined ? '' : String(visibilityFilter)}
                onChange={e => {
                  const val = e.target.value
                  setVisibilityFilter(val === '' ? undefined : val === 'true')
                  setPage(1)
                }}
              >
                <option value="">Tất cả</option>
                <option value="false">Đang hiển thị</option>
                <option value="true">Đang bị ẩn</option>
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">Loại đánh giá</label>
              <select
                className="form-input"
                value={typeFilter === undefined ? '' : String(typeFilter)}
                onChange={e => {
                  const val = e.target.value
                  setTypeFilter(val === '' ? undefined : Number(val))
                  setPage(1)
                }}
              >
                <option value="">Tất cả loại</option>
                <option value="1">Đánh giá Dịch vụ</option>
                <option value="2">Đánh giá Nhân viên</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Reviews List */}
      <div className="mgr-panel">
        <h3 className="panel-title">Danh sách đánh giá ({totalCount})</h3>
        
        {loading ? (
          <div className="card-loading">Đang tải danh sách đánh giá...</div>
        ) : reviews.length === 0 ? (
          <div className="empty-ledger">Không tìm thấy đánh giá nào phù hợp với bộ lọc.</div>
        ) : (
          <div className="reviews-grid">
            {reviews.map(review => {
              const date = new Date(review.createdAtUtc)
              const formattedDate = date.toLocaleString('vi-VN', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              const initials = review.userFullName ? review.userFullName.substring(0, 2).toUpperCase() : 'KH'
              
              return (
                <div key={review.reviewId} className={`review-card ${review.isHidden ? 'card-hidden' : ''}`}>
                  <div className="review-card-header">
                    <div className="reviewer-info">
                      <div className="reviewer-avatar">{initials}</div>
                      <div>
                        <h4 className="reviewer-name">{review.userFullName}</h4>
                        <span className="review-date">{formattedDate}</span>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>

                  <div className="review-card-body">
                    <p className="review-comment">
                      {review.comment ? `"${review.comment}"` : <span className="no-comment">Không có bình luận chi tiết.</span>}
                    </p>
                    
                    <div className="review-metadata-tags">
                      {review.serviceName && (
                        <span className="metadata-tag">
                          🔧 Dịch vụ: <strong>{review.serviceName}</strong>
                        </span>
                      )}
                      {review.staffFullName && (
                        <span className="metadata-tag">
                          👤 Nhân viên: <strong>{review.staffFullName}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="review-card-footer">
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className={`badge ${review.isHidden ? 'badge-danger' : 'badge-success'}`}>
                        {review.isHidden ? 'Đang bị ẩn' : 'Hiển thị'}
                      </span>
                      <span className={`badge ${review.reviewType === 2 ? 'badge-warning' : 'badge-primary'}`} style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: review.reviewType === 2 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(30, 144, 255, 0.1)',
                        color: review.reviewType === 2 ? '#f59e0b' : '#1e90ff',
                        border: review.reviewType === 2 ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(30, 144, 255, 0.2)'
                      }}>
                        {review.reviewType === 2 ? 'Nhân viên' : 'Dịch vụ'}
                      </span>
                    </div>

                    <div className="review-card-actions">
                      <button
                        type="button"
                        className={`btn btn-sm ${review.isHidden ? 'btn-ghost' : 'btn-secondary'}`}
                        onClick={() => handleToggleHide(review)}
                      >
                        {review.isHidden ? 'Hiện đánh giá' : 'Ẩn đánh giá'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteClick(review)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="ledger-pagination">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              Trang trước
            </button>
            <span className="ledger-page-indicator">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => p + 1)}
            >
              Trang sau
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm && !!reviewToDelete}
        title="Xác nhận xóa đánh giá"
        variant="danger"
        isLoading={deleteLoading}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setReviewToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        confirmText="Xóa đánh giá"
        cancelText="Hủy bỏ"
        message={
          <>
            <p>Bạn có chắc chắn muốn xóa đánh giá này từ khách hàng <strong>{reviewToDelete?.userFullName}</strong>?</p>
            <div className="confirm-modal-warning" style={{ marginTop: '12px' }}>
              Hành động này không thể hoàn tác. Đánh giá sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu.
            </div>
          </>
        }
      />
    </div>
  )
}
