
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', borderBottom: 'none' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
          M-SERIES PERFORMANCE WASH
        </div>
        <div style={{ fontSize: '0.85rem', color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
          © 2026 M-SERIES PERFORMANCE WASH. ENGINEERED FOR PRECISION.
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a className="footer-link" href="#" style={{ color: '#bbbbbb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>PRIVACY POLICY</a>
          <a className="footer-link" href="#" style={{ color: '#bbbbbb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>TERMS OF SERVICE</a>
          <a className="footer-link" href="#" style={{ color: '#bbbbbb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>LOCATIONS</a>
          <a className="footer-link" href="#" style={{ color: '#bbbbbb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>CONTACT</a>
        </div>
      </div>
    </footer>
  )
}
