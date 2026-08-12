import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <div className="footer-brand">
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-icon" style={{ width: 32, height: 32 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19 7H5C3.34 7 2 8.34 2 10v6c0 1.66 1.34 3 3 3h1a2 2 0 0 0 4 0h4a2 2 0 0 0 4 0h1c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3z" fill="url(#footCarGrad)" />
                <defs>
                  <linearGradient id="footCarGrad" x1="2" y1="7" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1e90ff" /><stop offset="1" stopColor="#00d4ff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="navbar-logo-text" style={{ fontSize: '1rem' }}>AutoWash<span>Pro</span></span>
          </Link>
          <p>Premium car washing service at your doorstep. Quality you can trust, convenience you'll love.</p>
        </div>
        <div className="footer-links">
          <div>
            <h4>Services</h4>
            <a href="#services">Basic Wash</a>
            <a href="#services">Premium Detail</a>
            <a href="#services">Full Package</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#about">About Us</a>
            <a href="#careers">Careers</a>
            <a href="#press">Press</a>
          </div>
          <div>
            <h4>Support</h4>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
            <a href="#terms">Terms & Privacy</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom container">
        <p>© 2025 AutoWashPro. All rights reserved.</p>
        <div className="footer-socials">
          {['facebook', 'twitter', 'instagram'].map(s => (
            <a key={s} href="#" aria-label={s} className="social-icon">
              {s === 'facebook' && <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>}
              {s === 'twitter' && <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>}
              {s === 'instagram' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
