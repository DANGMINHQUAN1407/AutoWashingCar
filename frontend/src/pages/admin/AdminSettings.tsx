import '../Dashboard.css'

export default function AdminSettings() {
  return (
    <div className="portal-page">
      <div className="dash-header">
        <div>
          <h2>System Settings</h2>
          <p>Configure global policies and application settings.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>General</h3>
        <div className="vehicle-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="company-name">Company Name</label>
            <input id="company-name" className="form-input" defaultValue="AutoWashPro" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="support-email">Support Email</label>
            <input id="support-email" className="form-input" defaultValue="support@autowashpro.com" />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Booking Policy</h3>
        <div className="vehicle-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="cancel-hours">Cancellation Window (hours)</label>
            <input id="cancel-hours" type="number" className="form-input" defaultValue="2" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="loyalty-rate">Loyalty Points per 1,000 VND</label>
            <input id="loyalty-rate" type="number" className="form-input" defaultValue="1" />
          </div>
        </div>
        <div className="vehicle-form-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-primary">Save Settings</button>
        </div>
      </div>
    </div>
  )
}
