import { useState, useEffect, useCallback } from 'react'
import * as api from '../../services/api'
import type { VehicleTransferRequestDto, VehicleOwnershipHistoryDto } from '../../services/api'
import ConfirmModal from '../../components/ConfirmModal'
import AnimatedButton from '../../components/AnimatedButton'
import { extractErrorMessage } from '../../utils/errorUtils'
import './AdminBranches.css'
import './AdminUsers.css'
import '../Dashboard.css'

const STATUS_MAP: Record<number, { label: string; badgeClass: string }> = {
  1: { label: 'Chờ duyệt', badgeClass: 'badge-warning' },
  2: { label: 'Đã chấp thuận', badgeClass: 'badge-success' },
  3: { label: 'Đã từ chối', badgeClass: 'badge-danger' },
  4: { label: 'Đã hủy', badgeClass: 'badge-secondary' },
}

const VEHICLE_TYPE_MAP: Record<number, string> = {
  1: 'Xe máy',
  2: 'Ô tô',
  3: 'Xe tải',
}

export default function AdminVehicleTransfers() {
  const [requests, setRequests] = useState<VehicleTransferRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters and Pagination
  const [statusFilter, setStatusFilter] = useState<string>('') // '' = all, '1', '2', '3', '4'
  const [licensePlateSearch, setLicensePlateSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<VehicleTransferRequestDto | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)

  // Ownership History Modal
  const [historyVehicleId, setHistoryVehicleId] = useState<string | null>(null)
  const [historyPlate, setHistoryPlate] = useState<string>('')
  const [historyList, setHistoryList] = useState<VehicleOwnershipHistoryDto[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Toast state
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' }>>([])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getAdminVehicleTransfers({
        status: statusFilter ? Number(statusFilter) : undefined,
        licensePlate: licensePlateSearch.trim() || undefined,
        page,
        pageSize,
      })
      setRequests(res.items || [])
      setTotalCount(res.totalCount || 0)
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể tải danh sách yêu cầu chuyển nhượng xe.'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, licensePlateSearch, page, pageSize])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleOpenReview = (req: VehicleTransferRequestDto, action: 'approve' | 'reject') => {
    setSelectedRequest(req)
    setReviewAction(action)
    setReviewNote('')
  }

  const handleConfirmReview = async () => {
    if (!selectedRequest || !reviewAction) return
    setReviewLoading(true)
    try {
      if (reviewAction === 'approve') {
        await api.approveVehicleTransfer(selectedRequest.vehicleTransferRequestId, reviewNote.trim() || undefined)
        showToast(`Đã phê duyệt chuyển quyền sở hữu xe biển số ${selectedRequest.licensePlate} thành công!`)
      } else {
        await api.rejectVehicleTransfer(selectedRequest.vehicleTransferRequestId, reviewNote.trim() || undefined)
        showToast(`Đã từ chối yêu cầu chuyển nhượng xe ${selectedRequest.licensePlate}.`, 'error')
      }
      setSelectedRequest(null)
      setReviewAction(null)
      loadRequests()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Không thể thực hiện phê duyệt.'), 'error')
    } finally {
      setReviewLoading(false)
    }
  }

  const handleViewHistory = async (req: VehicleTransferRequestDto) => {
    setHistoryVehicleId(req.vehicleId)
    setHistoryPlate(req.licensePlate)
    setHistoryLoading(true)
    try {
      const history = await api.getVehicleOwnershipHistory(req.vehicleId)
      setHistoryList(history)
    } catch (err) {
      showToast(extractErrorMessage(err, 'Không thể tải lịch sử sở hữu.'), 'error')
    } finally {
      setHistoryLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="portal-page">
      {/* Toast notifications */}
      <div className="portal-toasts-container" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map(t => (
          <div key={t.id} className={`badge ${t.type === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '12px 20px', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {t.message}
          </div>
        ))}
      </div>

      <div className="dash-header">
        <div>
          <h2>Quản lý chuyển nhượng xe</h2>
          <p>Phê duyệt và theo dõi yêu cầu chuyển giao quyền sở hữu phương tiện giữa các khách hàng.</p>
        </div>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ display: 'block', padding: '12px 16px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-filters-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ flex: '1', minWidth: '240px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm kiếm theo biển số xe (VD: 51F-123.45)..."
            value={licensePlateSearch}
            onChange={e => {
              setLicensePlateSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div style={{ width: '200px' }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="1">Chờ duyệt</option>
            <option value="2">Đã chấp thuận</option>
            <option value="3">Đã từ chối</option>
            <option value="4">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-subtle, #f8fafc)', borderBottom: '1px solid var(--color-border-dim, #e2e8f0)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Biển số xe</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Loại xe</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Chủ cũ</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Chủ mới (Yêu cầu)</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Lý do chuyển</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Ngày tạo</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Đang tải danh sách yêu cầu chuyển nhượng...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Không có yêu cầu chuyển nhượng xe nào phù hợp.
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  const statusInfo = STATUS_MAP[req.status] || { label: 'Không xác định', badgeClass: 'badge-secondary' }
                  const isPending = req.status === 1
                  return (
                    <tr key={req.vehicleTransferRequestId} style={{ borderBottom: '1px solid var(--color-border-dim, #f1f5f9)' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-primary)' }}>
                        {req.licensePlate}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {VEHICLE_TYPE_MAP[req.vehicleType] || 'Khác'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {req.fromUserName || 'Chủ sở hữu hiện tại'}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 500 }}>
                        {req.toUserName || 'Khách hàng yêu cầu'}
                      </td>
                      <td style={{ padding: '14px 18px', maxWidth: '200px', fontSize: '0.88rem' }}>
                        {req.reason || <em>Không có lý do</em>}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`badge ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        {new Date(req.createdAtUtc).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            title="Xem lịch sử chủ xe"
                            onClick={() => handleViewHistory(req)}
                          >
                            📜 Lịch sử
                          </button>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{ background: '#10b981', color: '#fff', border: 'none' }}
                                onClick={() => handleOpenReview(req, 'approve')}
                              >
                                ✓ Duyệt
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                                onClick={() => handleOpenReview(req, 'reject')}
                              >
                                ✕ Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--color-border-dim)' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
              Trang {page} / {totalPages} (Tổng số {totalCount} yêu cầu)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Trang trước
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Trang sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && reviewAction && (
        <ConfirmModal
          isOpen={true}
          title={reviewAction === 'approve' ? 'Phê duyệt chuyển nhượng xe' : 'Từ chối chuyển nhượng xe'}
          variant={reviewAction === 'approve' ? 'success' : 'danger'}
          confirmText={reviewAction === 'approve' ? 'Phê duyệt' : 'Từ chối'}
          cancelText="Đóng"
          isLoading={reviewLoading}
          onConfirm={handleConfirmReview}
          onCancel={() => {
            setSelectedRequest(null)
            setReviewAction(null)
          }}
          message={
            <div>
              <p>
                Bạn có chắc chắn muốn <strong>{reviewAction === 'approve' ? 'PHÊ DUYỆT' : 'TỪ CHỐI'}</strong> yêu cầu chuyển nhượng xe biển số{' '}
                <span className="highlight-plate">{selectedRequest.licensePlate}</span> cho khách hàng <strong>{selectedRequest.toUserName || ''}</strong>?
              </p>
              <div style={{ marginTop: '16px', textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  Ghi chú phản hồi (Tùy chọn)
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Nhập lý do phê duyệt hoặc lý do từ chối gửi tới khách hàng..."
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                />
              </div>
            </div>
          }
        />
      )}

      {/* Ownership History Modal */}
      {historyVehicleId && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-content card" style={{ maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Lịch sử chủ sở hữu xe: {historyPlate}</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setHistoryVehicleId(null)
                  setHistoryList([])
                }}
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <p style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>Đang tải lịch sử sở hữu...</p>
            ) : historyList.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>Chưa có lịch sử chuyển nhượng nào cho xe này.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyList.map((h, idx) => (
                  <div key={h.vehicleOwnershipHistoryId || idx} style={{ border: '1px solid var(--color-border-dim)', borderRadius: '8px', padding: '12px 16px', background: 'var(--color-bg-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--color-primary)' }}>{h.userName}</strong>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {h.ownedToUtc ? 'Đã chuyển nhượng' : 'Chủ sở hữu hiện tại'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      <div>Sở hữu từ: {new Date(h.ownedFromUtc).toLocaleString('vi-VN')}</div>
                      {h.ownedToUtc && <div>Đến ngày: {new Date(h.ownedToUtc).toLocaleString('vi-VN')}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <AnimatedButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setHistoryVehicleId(null)
                  setHistoryList([])
                }}
              >
                Đóng
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
