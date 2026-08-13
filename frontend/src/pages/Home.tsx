import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { type ServiceCatalogItem } from '../services/api'
import { type Branch, type BranchService } from '../types/branch'
import AnimatedButton from '../components/AnimatedButton'
import './Home.css'

// Map Imports (Leaflet & React-Leaflet)
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Resolve Leaflet marker icon asset paths under Vite
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

// Helper Component to programmatically pan/zoom map view
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.8 })
  }, [center, zoom, map])
  return null
}

/* ── Data ── */

const steps = [
  { stepNum: 1, title: 'Phun nước áp lực' },
  { stepNum: 2, title: 'Phủ bọt tuyết' },
  { stepNum: 3, title: 'Chải mút xốp mềm' },
  { stepNum: 4, title: 'Phủ Wax bóng' },
  { stepNum: 5, title: 'Sấy khô tự động' }
]


/* ── Component ── */
interface DisplayService {
  id: string
  name: string
  description?: string
  basePrice: number
  durationMinutes: number
  isActive: boolean
}

const defaultPromos = [
  {
    voucherCode: 'WELCOME20',
    voucherType: 1, // System
    discountType: 1, // Percentage
    discountValue: 20,
    minOrderAmount: 0,
    maxDiscountAmount: 50000,
    endUtc: '2026-12-31T23:59:59Z',
    description: '20% off for newly registered accounts.'
  },
  {
    voucherCode: 'WASHPRO50K',
    voucherType: 1, // System
    discountType: 2, // Fixed amount
    discountValue: 50000,
    minOrderAmount: 200000,
    endUtc: '2026-12-31T23:59:59Z',
    description: 'Get 50,000 VND off on bookings of 200,000 VND or more.'
  },
  {
    voucherCode: 'SUMMER30K',
    voucherType: 1,
    discountType: 2,
    discountValue: 30000,
    minOrderAmount: 150000,
    endUtc: '2026-09-30T23:59:59Z',
    description: 'Summer special promotion.'
  }
]

export default function Home() {
  const [apiServices, setApiServices] = useState<ServiceCatalogItem[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [branchServices, setBranchServices] = useState<BranchService[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [loadingBranches, setLoadingBranches] = useState(true)

  // Map Center & Zoom States
  const defaultCenter: [number, number] = [10.776, 106.701]
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter)
  const [mapZoom, setMapZoom] = useState<number>(12)

  const selectedBranch = branches.find(b => b.branchId === selectedBranchId)

  // Update map center and zoom level based on selection
  useEffect(() => {
    if (selectedBranch && selectedBranch.latitude && selectedBranch.longitude) {
      setMapCenter([Number(selectedBranch.latitude), Number(selectedBranch.longitude)])
      setMapZoom(16)
    } else {
      const validBranches = branches.filter(
        b => b.latitude && b.longitude && !isNaN(Number(b.latitude)) && !isNaN(Number(b.longitude))
      )
      if (validBranches.length > 0) {
        const avgLat = validBranches.reduce((sum, b) => sum + Number(b.latitude), 0) / validBranches.length
        const avgLng = validBranches.reduce((sum, b) => sum + Number(b.longitude), 0) / validBranches.length
        setMapCenter([avgLat, avgLng])
        setMapZoom(12)
      } else {
        setMapCenter(defaultCenter)
        setMapZoom(12)
      }
    }
  }, [selectedBranchId, branches])
  // Promo Vouchers states
  const [promoVouchers, setPromoVouchers] = useState<any[]>([])
  const [activeVoucherIndex, setActiveVoucherIndex] = useState<number>(0)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Real stats & reviews states
  // Real stats state
  const [systemStats, setSystemStats] = useState({ averageRating: 4.9, totalBookings: 12000 })

  useEffect(() => {
    // Fetch stats
    api.getSystemStats()
      .then(res => setSystemStats(res))
      .catch(err => console.error('Failed to load system stats', err))

    // Fetch active branches
    api.getBranches({ isActive: true, pageSize: 100 })
      .then(res => setBranches(res.items || []))
      .catch(err => console.error('Failed to load branches', err))
      .finally(() => setLoadingBranches(false))

    // Fetch full service catalog
    api.getServiceCatalog({ isActive: true, pageSize: 100 })
      .then(res => setApiServices(res.items || []))
      .catch(err => console.error('Failed to load services', err))
      .finally(() => setLoadingServices(false))

    // Fetch active approved vouchers for home page banner promotion
    api.getVouchers({ approvalStatus: 2, pageSize: 10 })
      .then(res => {
        if (res && res.items && res.items.length > 0) {
          const activeOnly = res.items.filter((v: any) => v.isActive)
          setPromoVouchers(activeOnly.length > 0 ? activeOnly : defaultPromos)
        } else {
          setPromoVouchers(defaultPromos)
        }
      })
      .catch(() => {
        setPromoVouchers(defaultPromos)
      })
  }, [])

  // Auto sliding carousel for vouchers
  useEffect(() => {
    if (promoVouchers.length <= 1) return
    const interval = setInterval(() => {
      setActiveVoucherIndex(prev => (prev + 1) % promoVouchers.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [promoVouchers])

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  useEffect(() => {
    if (!selectedBranchId) {
      setBranchServices([])
    } else {
      setLoadingServices(true)
      api.getBranchServices(selectedBranchId)
        .then(res => setBranchServices(res || []))
        .catch(err => console.error('Failed to load branch services', err))
        .finally(() => setLoadingServices(false))
    }
  }, [selectedBranchId])

  // Fetch stats based on selected branch
  useEffect(() => {
    api.getSystemStats(selectedBranchId || undefined)
      .then(res => setSystemStats(res))
      .catch(err => console.error('Failed to load stats', err))
  }, [selectedBranchId])

  const displayServices: DisplayService[] = selectedBranchId
    ? branchServices
      .filter(bs => bs.isActive)
      .map(bs => ({
        id: bs.branchServiceId,
        name: bs.serviceName,
        description: apiServices.find(s => s.serviceCatalogItemId === bs.serviceId)?.description ?? 'No detailed description available.',
        basePrice: bs.basePrice,
        durationMinutes: bs.durationMinutes,
        isActive: bs.isActive,
      }))
    : apiServices.slice(0, 6).map(svc => ({
      id: svc.serviceCatalogItemId,
      name: svc.name,
      description: svc.description,
      basePrice: svc.basePrice,
      durationMinutes: svc.durationMinutes,
      isActive: svc.isActive,
    }))
  return (
    <div className="home">
      {/* ── Background Bubbles ── */}
      <div className="bubble-container">
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
      </div>

      {/* ── Hero ── */}
      <section id="hero" className="hero" style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuCJJSC727lz-r6cVbyz1znhEVTZvf-WLPG_0ONdUM4o6LRLP4T45lgyrKs_KDWqJLMdNrBSKixS-grW5wTP6Lx4LVm59ZgE-DW_TcPbhw3RDd73yayBp9xsuo0j872_oI1NaTjbtoNi_zudLBjgRR5Lj4ycWrTE6H5fFwwoCtQ6BEPW1DI1KT9TjG8GeQWrWLkb7iERJnILlPACrPsE2S-MLkfHZsjL26KYM5wDhjbycoWa2bXTUKUi5w')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '600px'
      }}>
        <div className="hero-bg-grid" />
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />

        <div className="container hero-inner">
          <div className="hero-content animate-fade-up">
            <div className="section-label">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ marginRight: '6px' }}><circle cx="5" cy="5" r="5" /></svg>
              NOW AVAILABLE IN YOUR CITY
            </div>

            <h1 className="hero-title">
              Rửa xe tự động<br />
              <span className="gradient-text">Công nghệ 4.0</span>
            </h1>

            <p className="hero-subtitle">
              Trải nghiệm dịch vụ làm sạch nhanh chóng, an toàn và sáng bóng vượt trội với hệ thống máy móc tự động hoàn toàn mới.
            </p>

            <div className="hero-cta">
              <Link to="/customer/bookings?startBooking=true">
                <AnimatedButton variant="premium" size="lg">
                  Đặt lịch ngay
                </AnimatedButton>
              </Link>
              <a href="#process">
                <AnimatedButton variant="ghost" size="lg" showArrow={false}>
                  Tìm hiểu thêm
                </AnimatedButton>
              </a>
            </div>


          </div>

          <div className="hero-visual animate-fade-up delay-2">
            <div className="hero-voucher-showcase">
              <div className="showcase-header">
                <span className="sparkle-icon">✨</span>
                <h4>FEATURED OFFERS</h4>
                <span className="live-pulse"></span>
              </div>

              {promoVouchers.length === 0 ? (
                <div className="showcase-loading">
                  <div className="spinner-mini"></div>
                  <span>Loading offers...</span>
                </div>
              ) : (
                (() => {
                  const item = promoVouchers[activeVoucherIndex]
                  const code = item.voucherCode || item.VoucherCode
                  const discountVal = item.discountValue ?? item.DiscountValue ?? 0
                  const type = item.discountType ?? item.DiscountType ?? 1
                  const minOrder = item.minOrderAmount ?? item.MinOrderAmount
                  const desc = item.description || (type === 1 ? `Get ${discountVal}% off services` : `Get ${discountVal.toLocaleString('en-US')} VND off your booking`)

                  return (
                    <div className="hero-ticket-wrapper">
                      <div className="hero-ticket">
                        <div className="hero-ticket-notch notch-l"></div>
                        <div className="hero-ticket-notch notch-r"></div>

                        <div className="hero-ticket-top">
                          <div className="hero-ticket-discount">
                            {type === 1 ? `${discountVal}%` : `${(discountVal / 1000).toLocaleString('en-US')}K`}
                          </div>
                          <div className="hero-ticket-off">DISCOUNT</div>
                        </div>

                        <div className="hero-ticket-divider"></div>

                        <div className="hero-ticket-bottom">
                          <div className="hero-ticket-desc">{desc}</div>
                          <div className="hero-ticket-cond">
                            {minOrder ? `Min booking: ${(minOrder / 1000).toLocaleString('en-US')}K` : 'No minimum booking'}
                          </div>
                          <div className="hero-ticket-code-row">
                            <code className="hero-ticket-code">{code}</code>
                            <button
                              type="button"
                              className="hero-copy-btn"
                              onClick={() => handleCopyCode(code)}
                            >
                              {copiedCode === code ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {promoVouchers.length > 1 && (
                        <div className="slider-dots">
                          {promoVouchers.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className={`dot ${idx === activeVoucherIndex ? 'active' : ''}`}
                              onClick={() => setActiveVoucherIndex(idx)}
                              aria-label={`Go to slide ${idx + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()
              )}
            </div>

            {/* Floating badges */}
            <div className="float-badge float-badge-1">
              <span>✨</span> Hot Deals!
            </div>
            <Link to="/customer/bookings?startBooking=true" className="float-badge float-badge-2" style={{ textDecoration: 'none' }}>
              <span>🔥</span> Book Now!
            </Link>
          </div>
        </div>
      </section>

      <div className="m-stripe-divider" />

      {/* ── Why Choose Us ── */}
      <section className="section" style={{ background: '#000000', padding: '5rem 0' }}>
        <div className="container animate-fade-up">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="section-label">AuraWash</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>Tại sao chọn AutoWashPro?</h2>
            <p style={{ color: '#bbbbbb', marginTop: '0.5rem' }}>Hiệu suất tối đa, bảo vệ tối ưu.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '0px', border: '1px solid #3c3c3c' }} className="card">
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', marginBottom: '12px' }}>Tốc độ siêu tốc</h3>
              <p style={{ color: '#bbbbbb', fontSize: '1rem', lineHeight: '1.5' }}>Chỉ mất 5 phút cho một quy trình rửa xe hoàn chỉnh, tiết kiệm thời gian quý báu của bạn.</p>
            </div>
            <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '0px', border: '1px solid #3c3c3c' }} className="card">
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', marginBottom: '12px' }}>Tiết kiệm nước</h3>
              <p style={{ color: '#bbbbbb', fontSize: '1rem', lineHeight: '1.5' }}>Công nghệ tái chế nước tiên tiến giúp tiết kiệm đến 80% lượng nước so với rửa thủ công.</p>
            </div>
            <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '0px', border: '1px solid #3c3c3c' }} className="card">
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', marginBottom: '12px' }}>Không trầy xước</h3>
              <p style={{ color: '#bbbbbb', fontSize: '1rem', lineHeight: '1.5' }}>Sử dụng chổi mút xốp siêu mềm và bọt tuyết chuyên dụng, bảo vệ lớp sơn xe tuyệt đối.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="m-stripe-divider" />

      {/* ── Services ── */}
      <section id="services" className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Our Services</div>
            <h2>Find Your <span className="gradient-text">Perfect Wash</span></h2>
            <p>From a quick exterior rinse to a full ceramic detailing — we have a package for every car and every budget.</p>
          </div>

          <div className="branch-map-wrapper">
            <div className="branch-map-layout">
              {/* Map View */}
              <div className="branch-map-view">
                {loadingBranches ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                    Loading branches map...
                  </div>
                ) : (
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController center={mapCenter} zoom={mapZoom} />
                    {branches
                      .filter(b => b.latitude && b.longitude && !isNaN(Number(b.latitude)) && !isNaN(Number(b.longitude)))
                      .map(b => (
                        <Marker
                          key={b.branchId}
                          position={[Number(b.latitude), Number(b.longitude)]}
                          eventHandlers={{
                            click: () => {
                              setSelectedBranchId(b.branchId)
                            }
                          }}
                        >
                          <Popup>
                            <div style={{ padding: '2px' }}>
                              <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'inherit' }}>{b.name}</strong>
                              <span style={{ display: 'block', fontSize: '12px', opacity: 0.85, marginBottom: '6px' }}>{b.address}</span>
                              <button
                                type="button"
                                style={{
                                  background: 'var(--color-primary, #3b82f6)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setSelectedBranchId(b.branchId)}
                              >
                                Select Branch
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                  </MapContainer>
                )}
              </div>

              {/* Sidebar Info Panel */}
              <div className="branch-sidebar-panel">
                {selectedBranch ? (
                  /* Detail view of selected branch */
                  <div className="selected-branch-details">
                    <div className="branch-details-header">
                      <h3>{selectedBranch.name}</h3>
                      <div className="branch-card-status">
                        <span style={{ color: '#10b981' }}>●</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          Open: {selectedBranch.openTime?.substring(0, 5) || '08:00'} - {selectedBranch.closeTime?.substring(0, 5) || '20:00'}
                        </span>
                      </div>
                    </div>
                    <div className="branch-details-body">
                      <div className="detail-info-item">
                        <span className="detail-info-icon">📍</span>
                        <div className="detail-info-text">
                          <strong>Address</strong>
                          {selectedBranch.address}, {selectedBranch.city}
                        </div>
                      </div>
                      <div className="detail-info-item">
                        <span className="detail-info-icon">📞</span>
                        <div className="detail-info-text">
                          <strong>Phone</strong>
                          <a href={`tel:${selectedBranch.phone}`} style={{ color: 'var(--color-primary, #3b82f6)', textDecoration: 'none', fontWeight: 600 }}>
                            {selectedBranch.phone}
                          </a>
                        </div>
                      </div>
                      {selectedBranch.email && (
                        <div className="detail-info-item">
                          <span className="detail-info-icon">✉️</span>
                          <div className="detail-info-text">
                            <strong>Email</strong>
                            {selectedBranch.email}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="branch-details-actions">
                      {selectedBranch.latitude && selectedBranch.longitude && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${selectedBranch.latitude},${selectedBranch.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-detail-secondary"
                        >
                          🗺️ View Directions
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn-detail-reset"
                        onClick={() => setSelectedBranchId('')}
                      >
                        Reset & Show All Branches
                      </button>
                    </div>
                  </div>
                ) : (
                  /* List of branches */
                  <>
                    <div className="branch-sidebar-header">
                      <span>Explore Branches ({branches.length})</span>
                    </div>
                    <div className="branch-sidebar-list">
                      {branches.map(b => (
                        <div
                          key={b.branchId}
                          className={`branch-item-card ${selectedBranchId === b.branchId ? 'active' : ''}`}
                          onClick={() => setSelectedBranchId(b.branchId)}
                        >
                          <div className="branch-card-title">{b.name}</div>
                          <div className="branch-card-address">{b.address}, {b.city}</div>
                          <div className="branch-card-status">
                            <span style={{ color: '#10b981' }}>●</span>
                            <span style={{ color: 'var(--color-text-muted, #94a3b8)', fontSize: '0.75rem' }}>
                              Open: {b.openTime?.substring(0, 5) || '08:00'} - {b.closeTime?.substring(0, 5) || '20:00'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="services-grid">
            {loadingServices ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                Loading services list...
              </div>
            ) : displayServices.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                Currently, no services are active at this branch.
              </div>
            ) : (
              displayServices.map((svc, idx) => {
                return (
                  <div
                    key={svc.id}
                    className="service-card card"
                    style={{
                      backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.9)), url(/service-bg-${(idx % 3) + 1}.jpg)`
                    }}
                  >
                    <div className="service-duration-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      <span>{svc.durationMinutes} min</span>
                    </div>
                    <h3 className="service-name">{svc.name}</h3>
                    <p className="service-desc">{svc.description || 'No detailed description available.'}</p>
                    <div className="service-price">
                      <span className="price-value">{new Intl.NumberFormat('en-US').format(svc.basePrice)}</span>
                      <span className="price-currency">VND</span>
                    </div>
                    <Link to={`/customer/bookings?serviceId=${svc.id}${selectedBranchId ? `&branchId=${selectedBranchId}` : ''}`}>
                      <AnimatedButton variant="primary" style={{ width: '100%' }}>
                        Book This Plan
                      </AnimatedButton>
                    </Link>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="process" className="section section-alt" style={{ background: '#000000', padding: '5rem 0' }}>
        <div className="container animate-fade-up">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="section-label">Process</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>Quy trình 5 bước chuẩn quốc tế</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', gap: '24px' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: '1', minWidth: '150px' }}>
                <div style={{ width: '48px', height: '48px', border: '1px solid #3c3c3c', background: '#1a1a1a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
                  {step.stepNum}
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{step.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Overview ── */}
      <section id="reviews" className="section" style={{ background: 'var(--color-bg-alt, #0b0f19)', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="section-label" style={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-primary, #3b82f6)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Overview</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              {selectedBranchId ? 'Branch ' : 'System-Wide '}
              <span className="gradient-text">Performance &amp; Reviews</span>
            </h2>
            <p style={{ color: 'var(--color-text-muted, #94a3b8)', marginTop: '0.5rem' }}>
              {selectedBranchId 
                ? 'Real-time stats about service quality and customer visits at this branch.' 
                : 'Overview of operations and service quality across the entire AutoWashPro network.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '960px', margin: '0 auto' }}>
            {/* Bookings Stat Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center', background: 'var(--color-bg-card, rgba(30, 41, 59, 0.5))', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', transition: 'transform 0.3s ease' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: '1', margin: '0.5rem 0' }} className="gradient-text">
                {systemStats.totalBookings.toLocaleString('en-US')}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white', marginTop: '0.5rem' }}>Appointments Booked</div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: '260px' }}>
                Total number of vehicles successfully washed and serviced.
              </p>
            </div>

            {/* Rating Stat Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center', background: 'var(--color-bg-card, rgba(30, 41, 59, 0.5))', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', transition: 'transform 0.3s ease' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: '1', margin: '0.5rem 0' }} className="gradient-text">
                {systemStats.averageRating} / 5
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white', marginTop: '0.5rem' }}>Service Rating</div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: '260px' }}>
                Average rating from verified customers who experienced our services.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-glow" />
            <div className="cta-content">
              <h2>Ready for a Spotless Ride?</h2>
              <p>Book your first wash and get 20% off. No commitment needed.</p>
              <Link to="/auth?tab=signup">
                <AnimatedButton variant="premium" size="lg">
                  Get 20% Off — Book Now
                </AnimatedButton>
              </Link>
            </div>
            <div className="cta-decoration">
              <svg width="200" height="150" viewBox="0 0 200 150" fill="none" opacity="0.12">
                <ellipse cx="100" cy="75" rx="90" ry="55" stroke="#1e90ff" strokeWidth="2" />
                <ellipse cx="100" cy="75" rx="70" ry="40" stroke="#00d4ff" strokeWidth="1.5" />
                <circle cx="100" cy="75" r="25" stroke="#1e90ff" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
