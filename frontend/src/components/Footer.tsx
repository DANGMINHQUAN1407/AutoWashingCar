
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', borderBottom: 'none' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
          HỆ THỐNG RỬA XE TỰ ĐỘNG M-PERFORMANCE WASH
        </div>
        <div style={{ fontSize: '0.85rem', color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
          © 2026 M-PERFORMANCE WASH. ĐỒNG HÀNH CÙNG CHẤT LƯỢNG VƯỢT TRỘI.
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a className="footer-link" href="#" style={{ color: '#bbbbbb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>CHÍNH SÁCH BẢO MẬT</a>
          <a className="footer-link" href="#" style={{ color: '#bbbbbb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>ĐIỀU KHOẢN DỊCH VỤ</a>
          <a className="footer-link" href="/#services" style={{ color: '#bbbbbb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>CHI NHÁNH</a>
          <a className="footer-link" href="/#hero" style={{ color: '#bbbbbb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>LIÊN HỆ</a>
        </div>
      </div>
    </footer>
  )
}
