import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import type { Branch } from '../../types/branch'
import type { ReviewItem } from '../../types/review'
import { extractErrorMessage } from '../../utils/errorUtils'
import '../manager/ManagerReviews.css'

export default function StaffReviews() {
  const { user } = useAuth()
  const [myBranch, setMyBranch] = useState<Branch | null>(null)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters state
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined)
  const [visibilityFilter, setVisibilityFilter] = useState<boolean | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Moderation state statistics
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    visibleCount: 0,
    hiddenCount: 0,
  })

  // Load branch on mount using user.branchId
  useEffect(() => {
    async function loadBranch() {
      const branchId = user?.branchId || user?.BranchId
      if (!branchId) {
        setError('Tài khoản của bạn chưa được gán vào chi nhánh nào.')
        setLoading(false)
        return
      }
      try {
        const branch = await api.getBranchById(branchId)
        setMyBranch(branch)
      } catch (err) {
        setError(extractErrorMessage(err, 'Không thể tải thông tin chi nhánh.'))
      }
    }
    loadBranch()
  }, [user])

  // Load reviews when branch or query parameters change
  const fetchReviews = async () => {
    const branchId = myBranch?.branchId || user?.branchId || user?.BranchId
    if (!branchId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.getReviewsForModeration({
        branchId,
        page,
        pageSize: 6,
        rating: ratingFilter,
        isHidden: visibilityFilter,
        search: searchQuery.trim() || undefined,
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
    const branchId = myBranch?.branchId || user?.branchId || user?.BranchId
    if (!branchId) return
    try {
      const res = await api.getReviewsForModeration({
        branchId,
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
    const branchId = myBranch?.branchId || user?.branchId || user?.BranchId
    if (branchId) {
      fetchReviews()
      fetchStats()
    } else {
      setLoading(false)
    }
  }, [myBranch, page, ratingFilter, visibilityFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchReviews()
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
          <h2>Đánh giá từ khách hàng</h2>
          <p>{myBranch ? `Xem các phản hồi và đánh giá tại chi nhánh ${myBranch.name}.` : 'Tải thông tin chi nhánh...'}</p>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-error" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span>{error}</span>
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
                    <span className={`badge ${review.isHidden ? 'badge-danger' : 'badge-success'}`}>
                      {review.isHidden ? 'Đang bị ẩn' : 'Hiển thị'}
                    </span>
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
    </div>
  )
}
