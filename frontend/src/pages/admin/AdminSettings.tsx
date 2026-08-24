import '../Dashboard.css'

export default function AdminSettings() {
  return (
    <div className="portal-page">
      <div className="dash-header">
        <div>
          <h2>Cài đặt hệ thống</h2>
          <p>Cấu hình các quy định chung và thông tin hệ thống.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Thông tin chung</h3>
        <div className="vehicle-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="company-name">Tên thương hiệu</label>
            <input id="company-name" className="form-input" defaultValue="AutoWashPro" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="support-email">Email hỗ trợ</label>
            <input id="support-email" className="form-input" defaultValue="support@autowashpro.com" />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Chính sách đặt lịch</h3>
        <div className="vehicle-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="cancel-hours">Thời gian cho phép hủy trước (giờ)</label>
            <input id="cancel-hours" type="number" className="form-input" defaultValue="2" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="loyalty-rate">Điểm tích lũy cho mỗi 1.000 đ</label>
            <input id="loyalty-rate" type="number" className="form-input" defaultValue="1" />
          </div>
        </div>
        <div className="vehicle-form-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-primary">Lưu cài đặt</button>
        </div>
      </div>
    </div>
  )
}
