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
  { stepNum: 1, title: 'Rửa xịt áp lực cao' },
  { stepNum: 2, title: 'Phun bọt tuyết hoạt tính' },
  { stepNum: 3, title: 'Chổi quét mềm vi sợi' },
  { stepNum: 4, title: 'Phủ sáp bóng bảo vệ' },
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
  const [loadingVouchers, setLoadingVouchers] = useState<boolean>(true)
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
    api.getVouchers({ approvalStatus: 2, pageSize: 10, isActive: true })
      .then(res => {
        if (res && res.items && res.items.length > 0) {
          const activeOnly = res.items.filter((v: any) => v.isActive)
          setPromoVouchers(activeOnly)
        } else {
          setPromoVouchers([])
        }
      })
      .catch((err) => {
        console.error('Failed to load vouchers', err)
        setPromoVouchers([])
      })
      .finally(() => {
        setLoadingVouchers(false)
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
        description: apiServices.find(s => s.serviceCatalogItemId === bs.serviceId)?.description ?? 'Dịch vụ rửa xe tự động chuyên nghiệp.',
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

        <div className={`container hero-inner ${(loadingVouchers || promoVouchers.length > 0) ? "" : "no-vouchers"}`}>
          <div className="hero-content animate-fade-up">
            <div className="section-label">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ marginRight: '6px' }}><circle cx="5" cy="5" r="5" /></svg>
              CÔNG NGHỆ HIỆN ĐẠI TẠI THÀNH PHỐ CỦA BẠN
            </div>

            <h1 className="hero-title">
              Rửa Xe Tự Động<br />
              <span className="gradient-text">Công Nghệ 4.0</span>
            </h1>

            <p className="hero-subtitle">
              Trải nghiệm dịch vụ rửa xe tự động thế hệ mới cực nhanh, an toàn và sạch bóng vượt trội.
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

          {(loadingVouchers || promoVouchers.length > 0) && (
            <div className="hero-visual animate-fade-up delay-2">
              <div className="hero-voucher-showcase">
                <div className="showcase-header">
                  <span className="sparkle-icon">✨</span>
                  <h4>ƯU ĐÃI NỔI BẬT</h4>
                  <span className="live-pulse"></span>
                </div>

                {loadingVouchers ? (
                  <div className="showcase-loading">
                    <div className="spinner-mini"></div>
                    <span>Đang tải ưu đãi...</span>
                  </div>
                ) : (
                  (() => {
                    const item = promoVouchers[activeVoucherIndex]
                    if (!item) return null
                    const code = item.voucherCode || item.VoucherCode
                    const discountVal = item.discountValue ?? item.DiscountValue ?? 0
                    const type = item.discountType ?? item.DiscountType ?? 1
                    const minOrder = item.minOrderAmount ?? item.MinOrderAmount
                    const desc = item.description || (type === 1 ? `Giảm ${discountVal}% cho dịch vụ` : `Giảm ${discountVal.toLocaleString('vi-VN')} đ cho đơn đặt lịch`)

                    return (
                      <div className="hero-ticket-wrapper">
                        <div className="hero-ticket">
                          <div className="hero-ticket-notch notch-l"></div>
                          <div className="hero-ticket-notch notch-r"></div>

                          <div className="hero-ticket-top">
                            <div className="hero-ticket-discount">
                              {type === 1 ? `${discountVal}%` : `${(discountVal / 1000).toLocaleString('vi-VN')}K`}
                            </div>
                            <div className="hero-ticket-off">GIẢM GIÁ</div>
                          </div>

                          <div className="hero-ticket-divider"></div>

                          <div className="hero-ticket-bottom">
                            <div className="hero-ticket-desc">{desc}</div>
                            <div className="hero-ticket-cond">
                              {minOrder ? `Đơn tối thiểu: ${(minOrder / 1000).toLocaleString('vi-VN')}K` : 'Không yêu cầu tối thiểu'}
                            </div>
                            <div className="hero-ticket-code-row">
                              <code className="hero-ticket-code">{code}</code>
                              <button
                                type="button"
                                className="hero-copy-btn"
                                onClick={() => handleCopyCode(code)}
                              >
                                {copiedCode === code ? 'Đã chép!' : 'Sao chép'}
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
                                aria-label={`Xem ưu đãi ${idx + 1}`}
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
                <span>✨</span> Ưu Đãi Hot!
              </div>
              <Link to="/customer/bookings?startBooking=true" className="float-badge float-badge-2" style={{ textDecoration: 'none' }}>
                <span>🔥</span> Đặt Lịch Ngay!
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="m-stripe-divider" />

      {/* ── Why Choose Us (Clean Bright Section) ── */}
      <section className="section" style={{ background: '#f8fafc', padding: '5rem 0' }}>
        <div className="container animate-fade-up">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="section-label" style={{ color: '#2563eb', fontWeight: 700, letterSpacing: '1px' }}>TẠI SAO CHỌN AUTOWASH PRO</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>Tại sao nên chọn AutoWashPro?</h2>
            <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '1.1rem' }}>Hiệu năng vượt trội, bảo vệ xe tối đa.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#ffffff', padding: '32px 28px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>⚡</div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px' }}>Tốc độ cực nhanh</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>Chỉ 5 phút cho một chu trình rửa tự động toàn diện, tiết kiệm tối đa thời gian quý báu của bạn.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '32px 28px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>💧</div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px' }}>Tiết kiệm nước &amp; Thân thiện</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>Hệ thống tuần hoàn nước thông minh tiết kiệm đến 80% lượng nước so với phương pháp rửa thủ công.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '32px 28px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>🛡️</div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px' }}>100% Không trầy xước</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>Chổi bọt vi sợi siêu mềm kết hợp bọt tuyết chuyên dụng giúp bảo vệ hoàn hảo bề mặt sơn xe.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="m-stripe-divider" />

      {/* ── Services ── */}
      <section id="services" className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Dịch Vụ Của Chúng Tôi</div>
            <h2>Lựa Chọn Gói Rửa Xe <span className="gradient-text">Hoàn Hảo</span></h2>
            <p>Từ gói rửa nhanh ngoại thất đến chăm sóc chi tiết toàn diện — chúng tôi có giải pháp cho mọi loại xe và ngân sách.</p>
          </div>

          <div className="branch-map-wrapper">
            <div className="branch-map-layout">
              {/* Map View */}
              <div className="branch-map-view">
                {loadingBranches ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                    Đang tải bản đồ chi nhánh...
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
                                Chọn chi nhánh
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
                          Mở cửa: {selectedBranch.openTime?.substring(0, 5) || '08:00'} - {selectedBranch.closeTime?.substring(0, 5) || '20:00'}
                        </span>
                      </div>
                    </div>
                    <div className="branch-details-body">
                      <div className="detail-info-item">
                        <span className="detail-info-icon">📍</span>
                        <div className="detail-info-text">
                          <strong>Địa chỉ</strong>
                          {selectedBranch.address}, {selectedBranch.city}
                        </div>
                      </div>
                      <div className="detail-info-item">
                        <span className="detail-info-icon">📞</span>
                        <div className="detail-info-text">
                          <strong>Số điện thoại</strong>
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
                          🗺️ Xem chỉ đường
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn-detail-reset"
                        onClick={() => setSelectedBranchId('')}
                      >
                        Đặt lại &amp; Xem tất cả chi nhánh
                      </button>
                    </div>
                  </div>
                ) : (
                  /* List of branches */
                  <>
                    <div className="branch-sidebar-header">
                      <span>Khám phá các chi nhánh ({branches.length})</span>
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
                              Mở cửa: {b.openTime?.substring(0, 5) || '08:00'} - {b.closeTime?.substring(0, 5) || '20:00'}
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
                Đang tải danh sách dịch vụ...
              </div>
            ) : displayServices.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                Hiện tại chưa có dịch vụ nào tại chi nhánh này.
              </div>
            ) : (
              displayServices.map((svc) => {
                return (
                  <div
                    key={svc.id}
                    className="service-card card"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
                      padding: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative'
                    }}
                  >
                    <div className="service-duration-badge" style={{
                      position: 'absolute',
                      top: '24px',
                      right: '24px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #dbeafe',
                      borderRadius: '9999px',
                      padding: '4px 12px',
                      fontWeight: 700,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      <span>{svc.durationMinutes} phút</span>
                    </div>
                    <h3 className="service-name" style={{ color: '#0f172a', fontWeight: 800, fontSize: '20px', marginBottom: '8px', paddingRight: '80px' }}>{svc.name}</h3>
                    <p className="service-desc" style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5', minHeight: '44px', marginBottom: '16px', flex: 1 }}>{svc.description || 'Dịch vụ rửa xe tự động chuyên nghiệp.'}</p>
                    <div className="service-price" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '20px' }}>
                      <span className="price-value" style={{ color: '#0f172a', fontSize: '28px', fontWeight: 800 }}>{new Intl.NumberFormat('vi-VN').format(svc.basePrice)}</span>
                      <span className="price-currency" style={{ color: '#64748b', fontWeight: 600, fontSize: '14px' }}>đ</span>
                    </div>
                    <Link to={`/customer/bookings?serviceId=${svc.id}${selectedBranchId ? `&branchId=${selectedBranchId}` : ''}`} style={{ textDecoration: 'none' }}>
                      <AnimatedButton variant="primary" style={{ width: '100%', height: '44px' }}>
                        Đặt gói dịch vụ này
                      </AnimatedButton>
                    </Link>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* ── How It Works (Clean Bright Process Section) ── */}
      <section id="process" className="section section-alt" style={{ background: '#f8fafc', padding: '5rem 0' }}>
        <div className="container animate-fade-up">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="section-label" style={{ color: '#2563eb', fontWeight: 700, letterSpacing: '1px' }}>Quy Trình</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>Quy Trình 5 Bước Chuẩn Quốc Tế</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', gap: '24px' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: '1', minWidth: '150px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, marginBottom: '14px', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)' }}>
                  {step.stepNum}
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{step.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Overview (Clean Bright Reviews/Stats) ── */}
      <section id="reviews" className="section" style={{ background: '#ffffff', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="section-label" style={{ textTransform: 'uppercase', letterSpacing: '2px', color: '#2563eb', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Tổng Quan</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>
              {selectedBranchId ? 'Chi Nhánh ' : 'Toàn Hệ Thống '}
              <span className="gradient-text" style={{ color: '#2563eb' }}>Hiệu Suất &amp; Đánh Giá</span>
            </h2>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
              {selectedBranchId 
                ? 'Thông tin thực tế về chất lượng phục vụ và lượt khách tại chi nhánh này.' 
                : 'Tổng quan vận hành và chất lượng dịch vụ trên toàn hệ thống mạng lưới AutoWashPro.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '960px', margin: '0 auto' }}>
            {/* Bookings Stat Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)', transition: 'transform 0.3s ease' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a', lineHeight: '1', margin: '0.5rem 0' }}>
                {systemStats.totalBookings.toLocaleString('vi-VN')}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>Lượt Đặt Lịch Phục Vụ</div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: '260px' }}>
                Tổng số lượt phương tiện đã được chăm sóc và phục vụ thành công.
              </p>
            </div>

            {/* Rating Stat Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)', transition: 'transform 0.3s ease' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a', lineHeight: '1', margin: '0.5rem 0' }}>
                {systemStats.averageRating} / 5
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>Đánh Giá Dịch Vụ</div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: '260px' }}>
                Điểm đánh giá trung bình từ khách hàng đã trải nghiệm dịch vụ thực tế.
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
              <h2>Sẵn Sàng Cho Một Chiếc Xe Sạch Bóng?</h2>
              <p>Đặt lịch rửa xe ngay hôm nay để nhận ưu đãi giảm 20%. Nhanh chóng, tiện lợi và tiết kiệm.</p>
              <Link to="/auth?tab=signup">
                <AnimatedButton variant="premium" size="lg">
                  Nhận Ưu Đãi 20% — Đặt Lịch Ngay
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
