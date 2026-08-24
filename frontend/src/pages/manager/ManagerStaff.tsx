import { useEffect, useState } from 'react'
import { getMyBranch, getBranchStaff } from '../../services/api'
import type { UserDto } from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import '../Dashboard.css'

export default function ManagerStaff() {
  const [staff, setStaff] = useState<UserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const myBranch = await getMyBranch()
        if (cancelled) return
        if (myBranch && myBranch.branchId) {
          const list = await getBranchStaff(myBranch.branchId)
          if (!cancelled) setStaff(list)
        } else {
          setError('Không tìm thấy chi nhánh được phân công.')
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(extractErrorMessage(e, 'Không thể tải danh sách nhân viên.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="portal-page animate-fade-in">
      <div className="dash-header">
        <div>
          <h2>Danh sách nhân viên</h2>
          <p>Theo dõi và quản lý nhân viên trực thuộc chi nhánh của bạn.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          Đang tải danh sách nhân viên...
        </div>
      ) : error ? (
        <div className="empty-state-premium">
          <div className="empty-state-icon-premium">⚠️</div>
          <h3>Lỗi tải danh sách nhân viên</h3>
          <p>{error}</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="empty-state-premium">
          <div className="empty-state-icon-premium">👥</div>
          <h3>Chưa có nhân viên</h3>
          <p>Hiện chưa có nhân viên nào được phân công về chi nhánh này.</p>
        </div>
      ) : (
        <div className="vehicle-list">
          {staff.map(s => (
            <div key={s.userId} className="vehicle-card" style={{ padding: '20px', border: '1px solid var(--color-border-dim)' }}>
              <div>
                <div className="vehicle-card-title" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-heading)' }}>
                  {s.fullName}
                </div>
                <div className="vehicle-card-meta" style={{ marginTop: '6px', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                  {s.email && <div>Email: {s.email}</div>}
                  {s.phoneNumber && <div>Số điện thoại: {s.phoneNumber}</div>}
                </div>
              </div>
              <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`} style={{ alignSelf: 'center' }}>
                {s.isActive ? 'Hoạt động' : 'Tạm dừng'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
