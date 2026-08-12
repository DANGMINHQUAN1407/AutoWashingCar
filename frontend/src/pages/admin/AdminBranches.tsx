import { useEffect, useState } from 'react'
import api, { 
  type CreateBranchRequest, 
  type UpdateBranchRequest,
  type ServiceCatalogItem 
} from '../../services/api'
import type { Branch } from '../../types/branch'
import type { UserDto } from '../../services/api'
import { extractErrorMessage } from '../../utils/errorUtils'
import ConfirmModal from '../../components/ConfirmModal'
import './AdminBranches.css'
import './AdminUsers.css' // Re-use premium filter & modal layout classes
import '../Dashboard.css'

// @ts-ignore
import subVN from 'sub-vn'

// Map Imports (Leaflet & React-Leaflet)
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
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

// Helper Component to handle Map Events and Programmatic Pan/Zoom
function MapEventsHandler({ 
  onMapClick, 
  center 
}: { 
  onMapClick: (lat: number, lng: number) => void,
  center: [number, number]
}) {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    }
  })

  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])

  return null
}

type ModalMode = 'create' | 'edit' | 'services' | 'staff' | null

const CITY_COORDINATES: Record<string, { lat: string; lng: string }> = {
  "Hồ Chí Minh": { lat: "10.776", lng: "106.701" },
  "Hà Nội": { lat: "21.028", lng: "105.804" },
  "Đà Nẵng": { lat: "16.054", lng: "108.202" },
  "Hải Phòng": { lat: "20.844", lng: "106.688" },
  "Cần Thơ": { lat: "10.045", lng: "105.746" },
  "Bình Dương": { lat: "10.980", lng: "106.651" },
  "Đồng Nai": { lat: "10.957", lng: "106.842" },
  "Bà Rịa - Vũng Tàu": { lat: "10.411", lng: "107.136" },
  "Lâm Đồng": { lat: "11.940", lng: "108.458" },
  "Khánh Hòa": { lat: "12.238", lng: "109.196" },
}

const cleanProvinceName = (name: string): string => {
  return name.replace(/^(Thành phố|Tỉnh)\s+/i, '')
}

const provincesList = subVN.getProvinces().map((p: any) => ({
  code: p.code,
  rawName: p.name,
  name: cleanProvinceName(p.name)
})).sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi'))

export default function AdminBranches() {
  // Filter States
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('all') // 'all', 'active', 'inactive'

  // Pagination States
  const [page, setPage] = useState(1)
  const [pageSize] = useState(6)

  // Data States
  const [branches, setBranches] = useState<Branch[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Managers for dropdown
  const [managers, setManagers] = useState<UserDto[]>([])
  const [managersLoading, setManagersLoading] = useState(false)
  const [assignedManagerIds, setAssignedManagerIds] = useState<string[]>([])

  // Interactive Operations
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [branchToToggle, setBranchToToggle] = useState<Branch | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)



  // Branch Staff States
  const [branchStaff, setBranchStaff] = useState<UserDto[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [allStaffList, setAllStaffList] = useState<UserDto[]>([])
  const [allStaffLoading, setAllStaffLoading] = useState(false)
  const [assignStaffLoading, setAssignStaffLoading] = useState(false)
  const [removeStaffLoadingId, setRemoveStaffLoadingId] = useState<string | null>(null)


  // Modal States (Create/Edit/Services)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  
  // Branch Form state
  const [branchForm, setBranchForm] = useState({
    branchCode: '',
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    openTime: '08:00',
    closeTime: '20:00',
    managerId: '',
  })
  const [branchFormLoading, setBranchFormLoading] = useState(false)
  const [branchFormError, setBranchFormError] = useState<string | null>(null)

  // Address Autocomplete States
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchTimer, setSearchTimer] = useState<any>(null)

  // Clean up search timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimer) clearTimeout(searchTimer)
    }
  }, [searchTimer])

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setBranchForm(prev => ({ ...prev, address: val }))

    if (searchTimer) {
      clearTimeout(searchTimer)
    }

    if (val.trim().length < 3) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSuggestionsLoading(true)
    setShowSuggestions(true)

    const timer = setTimeout(async () => {
      try {
        const query = branchForm.city ? `${val.trim()}, ${branchForm.city}` : val.trim()
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=vn&accept-language=vi`
        
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'AutoWashingCar-AdminPanel-App'
          }
        })
        if (res.ok) {
          const data = await res.json()
          setAddressSuggestions(Array.isArray(data) ? data : [])
        } else {
          setAddressSuggestions([])
        }
      } catch (err) {
        console.error('Error fetching address suggestions:', err)
        setAddressSuggestions([])
      } finally {
        setSuggestionsLoading(false)
      }
    }, 500)

    setSearchTimer(timer)
  }

  const handleSelectSuggestion = (s: any) => {
    let cleanedAddress = s.display_name || ''
    cleanedAddress = cleanedAddress
      .replace(/,\s*\d+,\s*Việt Nam$/i, '')
      .replace(/,\s*Việt Nam$/i, '')
      .replace(/,\s*Vietnam$/i, '')

    setBranchForm(prev => ({
      ...prev,
      address: cleanedAddress,
      latitude: s.lat ? String(s.lat) : '',
      longitude: s.lon ? String(s.lon) : ''
    }))
    setAddressSuggestions([])
    setShowSuggestions(false)
  }

  const handleMapLocationChange = async (lat: number, lng: number) => {
    // 1. Update coordinates immediately
    setBranchForm(prev => ({
      ...prev,
      latitude: String(lat.toFixed(6)),
      longitude: String(lng.toFixed(6))
    }))

    // 2. Fetch address via reverse geocoding
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AutoWashingCar-AdminPanel-App'
        }
      })
      if (res.ok) {
        const data = await res.json()
        let cleanedAddress = data.display_name || ''
        cleanedAddress = cleanedAddress
          .replace(/,\s*\d+,\s*Việt Nam$/i, '')
          .replace(/,\s*Việt Nam$/i, '')
          .replace(/,\s*Vietnam$/i, '')
        
        setBranchForm(prev => ({
          ...prev,
          address: cleanedAddress
        }))
      }
    } catch (err) {
      console.error('Error reverse geocoding coordinates:', err)
    }
  }

  const triggerAutoGeocode = async () => {
    const val = branchForm.address.trim()
    if (val.length < 3) return

    try {
      const query = branchForm.city ? `${val}, ${branchForm.city}` : val
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=vn&accept-language=vi`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AutoWashingCar-AdminPanel-App'
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0]
          setBranchForm(prev => ({
            ...prev,
            latitude: first.lat ? String(parseFloat(first.lat).toFixed(6)) : prev.latitude,
            longitude: first.lon ? String(parseFloat(first.lon).toFixed(6)) : prev.longitude
          }))
        }
      }
    } catch (err) {
      console.error('Error auto-geocoding:', err)
    }
  }

  // Services Modal state
  const [catalogItems, setCatalogItems] = useState<ServiceCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [savingServices, setSavingServices] = useState(false)

  // Custom Toast Notifications State
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error'; message: string }>>([])

  // Helper: Trigger custom toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Fetch Branches
  const fetchBranches = async () => {
    setLoading(true)
    setError(null)
    try {
      const activeParam = isActiveFilter === 'active' 
        ? true 
        : isActiveFilter === 'inactive' 
          ? false 
          : undefined

      // Fetch active/inactive (non-deleted) branches
      const activeResult = await api.getBranches({
        page: 1,
        pageSize: 1000,
        city: cityFilter || undefined,
        isActive: activeParam,
      })

      // Combine lists
      let combined = [...activeResult.items]

      // Extract all assigned manager IDs
      const assignedIds = activeResult.items.map(b => b.managerId).filter(Boolean) as string[]
      setAssignedManagerIds(assignedIds)

      // Client-side search filtering (since backend doesn't support search directly in query)
      if (search.trim()) {
        const q = search.toLowerCase()
        combined = combined.filter(b => 
          b.name.toLowerCase().includes(q) || 
          b.branchCode.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q)
        )
      }

      // Sort by branchCode desc to keep the newest branches/indices first
      combined.sort((a, b) => b.branchCode.localeCompare(a.branchCode))

      // Pagination
      const totalCount = combined.length
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
      const paginatedItems = combined.slice((page - 1) * pageSize, page * pageSize)

      setBranches(paginatedItems)
      setTotalCount(totalCount)
      setTotalPages(totalPages)
    } catch (err: any) {
      console.error(err)
      const cleanErr = extractErrorMessage(err, 'Không thể tải danh sách chi nhánh.')
      setError(cleanErr)
      showToast(cleanErr, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch Managers for select options
  const fetchManagers = async () => {
    setManagersLoading(true)
    try {
      const result = await api.getUsers({
        role: 'Manager',
        isActive: true,
        pageSize: 100
      })
      setManagers(result.items)
    } catch (err) {
      console.error('Failed to load managers:', err)
    } finally {
      setManagersLoading(false)
    }
  }

  // Debounced API Fetch Effect
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchBranches()
    }, 350)

    return () => clearTimeout(delayDebounce)
  }, [search, cityFilter, isActiveFilter, page])

  // Load managers on mount
  useEffect(() => {
    fetchManagers()
  }, [])

  // Reset Filters helper
  const handleResetFilters = () => {
    setSearch('')
    setCityFilter('')
    setIsActiveFilter('all')
    setPage(1)
    showToast('Đã xóa toàn bộ bộ lọc', 'success')
  }



  // Open Edit Modal
  const openEditModal = (branch: Branch) => {
    setSelectedBranch(branch)
    setBranchForm({
      branchCode: branch.branchCode,
      name: branch.name,
      address: branch.address,
      city: branch.city,
      phone: branch.phone,
      email: branch.email || '',
      latitude: branch.latitude ? String(branch.latitude) : '',
      longitude: branch.longitude ? String(branch.longitude) : '',
      openTime: branch.openTime ? branch.openTime.substring(0, 5) : '08:00',
      closeTime: branch.closeTime ? branch.closeTime.substring(0, 5) : '20:00',
      managerId: branch.managerId || '',
    })
    setBranchFormError(null)
    setModalMode('edit')
  }

  // Open Create Modal
  const openCreateModal = async () => {
    setSelectedBranch(null)
    setBranchFormError(null)
    setModalMode('create')
    setBranchFormLoading(true)

    setBranchForm({
      branchCode: 'Loading...',
      name: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      latitude: '',
      longitude: '',
      openTime: '08:00',
      closeTime: '20:00',
      managerId: '',
    })

    try {
      const activeRes = await api.getBranches({ page: 1, pageSize: 1000 })
      const allCodes = activeRes.items.map(b => b.branchCode)

      let maxNum = 0
      allCodes.forEach(code => {
        const match = code.match(/^BR-(\d+)$/i)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) {
            maxNum = num
          }
        }
      })

      const nextNum = maxNum + 1
      const generatedCode = 'BR-' + String(nextNum).padStart(3, '0')

      setBranchForm(prev => ({
        ...prev,
        branchCode: generatedCode
      }))
    } catch (err: any) {
      console.error('Failed to generate next branch code:', err)
      const fallbackCode = 'BR-' + String(branches.length + 1).padStart(3, '0')
      setBranchForm(prev => ({
        ...prev,
        branchCode: fallbackCode
      }))
    } finally {
      setBranchFormLoading(false)
    }
  }

  // Open Manage Services Modal
  const openServicesModal = async (branch: Branch) => {
    setSelectedBranch(branch)
    setCatalogLoading(true)
    setModalMode('services')
    setSelectedServiceIds([])
    
    try {
      // Fetch full service catalog
      const catalogResult = await api.getServiceCatalog({ isActive: true, pageSize: 100 })
      setCatalogItems(catalogResult.items)

      // Fetch active services of this branch
      const activeServices = await api.getBranchServices(branch.branchId)
      const activeIds = activeServices.filter(s => s.isActive).map(s => s.serviceId)
      setSelectedServiceIds(activeIds)
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Không thể tải danh sách dịch vụ chi nhánh.'), 'error')
      setModalMode(null)
    } finally {
      setCatalogLoading(false)
    }
  }

  // Toggle service selection in modal
  const handleToggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    )
  }

  // Save services assignment
  const handleSaveServices = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBranch) return
    setSavingServices(true)
    try {
      await api.assignBranchServices(selectedBranch.branchId, selectedServiceIds)
      showToast(`Cập nhật danh sách dịch vụ cho ${selectedBranch.name} thành công.`, 'success')
      setModalMode(null)
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Cập nhật dịch vụ thất bại.'), 'error')
    } finally {
      setSavingServices(false)
    }
  }



  const openStaffModal = async (branch: Branch) => {
    setSelectedBranch(branch)
    setModalMode('staff')
    setStaffLoading(true)
    setBranchStaff([])
    try {
      const staff = await api.getBranchStaff(branch.branchId)
      setBranchStaff(staff)
      
      setAllStaffLoading(true)
      const allUsers = await api.getUsers({ role: 'Staff', isActive: true, pageSize: 100 })
      setAllStaffList(allUsers.items)
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Không thể tải thông tin nhân viên chi nhánh.'), 'error')
      setModalMode(null)
    } finally {
      setStaffLoading(false)
      setAllStaffLoading(false)
    }
  }

  const handleAssignStaff = async (userId: string) => {
    if (!selectedBranch || !userId) return
    setAssignStaffLoading(true)
    try {
      await api.assignBranchStaff(selectedBranch.branchId, [userId])
      showToast('Gán nhân viên vào chi nhánh thành công.', 'success')
      
      const staff = await api.getBranchStaff(selectedBranch.branchId)
      setBranchStaff(staff)
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Gán nhân viên thất bại.'), 'error')
    } finally {
      setAssignStaffLoading(false)
    }
  }

  const handleRemoveStaff = async (userId: string) => {
    if (!selectedBranch || !userId) return
    if (!window.confirm('Bạn có chắc muốn gỡ nhân viên này khỏi chi nhánh?')) return
    setRemoveStaffLoadingId(userId)
    try {
      await api.removeBranchStaff(selectedBranch.branchId, userId)
      showToast('Đã gỡ nhân viên khỏi chi nhánh.', 'success')
      
      const staff = await api.getBranchStaff(selectedBranch.branchId)
      setBranchStaff(staff)
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Gỡ nhân viên thất bại.'), 'error')
    } finally {
      setRemoveStaffLoadingId(null)
    }
  }

  const handleRemoveBranchService = async (serviceId: string) => {
    if (!selectedBranch) return
    if (!window.confirm('Bạn có chắc chắn muốn gỡ bỏ hoàn toàn dịch vụ này khỏi chi nhánh?')) return
    try {
      await api.removeBranchService(selectedBranch.branchId, serviceId)
      showToast('Đã gỡ bỏ dịch vụ khỏi chi nhánh.', 'success')
      
      setSelectedServiceIds(prev => prev.filter(id => id !== serviceId))
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Gỡ bỏ dịch vụ thất bại.'), 'error')
    }
  }

  // Handle Branch Form Submit (Create/Edit)
  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBranchFormLoading(true)
    setBranchFormError(null)

    try {
      const lat = branchForm.latitude ? parseFloat(branchForm.latitude) : undefined
      const lng = branchForm.longitude ? parseFloat(branchForm.longitude) : undefined

      // Validate Latitude and Longitude ranges
      if (lat !== undefined && !isNaN(lat) && (lat < -90 || lat > 90)) {
        throw new Error('Vĩ độ (Latitude) phải nằm trong khoảng từ -90 đến 90.')
      }
      if (lng !== undefined && !isNaN(lng) && (lng < -180 || lng > 180)) {
        throw new Error('Kinh độ (Longitude) phải nằm trong khoảng từ -180 đến 180.')
      }

      if (modalMode === 'create') {
        let currentCode = branchForm.branchCode.trim()
        let createdBranch = null
        let retryCount = 0
        const maxRetries = 10

        while (retryCount < maxRetries) {
          try {
            const payload: CreateBranchRequest = {
              BranchCode: currentCode,
              Name: branchForm.name.trim(),
              Address: branchForm.address.trim(),
              City: branchForm.city.trim(),
              Phone: branchForm.phone.trim(),
              Email: branchForm.email.trim() || undefined,
              Latitude: lat,
              Longitude: lng,
              OpenTime: `${branchForm.openTime}:00`,
              CloseTime: `${branchForm.closeTime}:00`,
              ManagerId: branchForm.managerId || undefined,
            }
            createdBranch = await api.createBranch(payload)
            break // Success!
          } catch (err: any) {
            const errorMsg = err?.message || ''
            // If it's a 500 error (which could be the unique constraint violation), try the next index
            if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
              retryCount++
              // Extract number from code, e.g. "BR-001" -> 1 -> 2 -> "BR-002"
              const match = currentCode.match(/^BR-(\d+)$/i)
              if (match) {
                const nextNum = parseInt(match[1], 10) + 1
                currentCode = 'BR-' + String(nextNum).padStart(3, '0')
                // Update form state so it displays the code that was actually used/tried
                setBranchForm(prev => ({ ...prev, branchCode: currentCode }))
              } else {
                throw err
              }
            } else {
              throw err
            }
          }
        }

        if (!createdBranch) {
          throw new Error('Không thể tự động tạo mã chi nhánh do bị trùng quá nhiều lần.')
        }
        
        let managerError = false
        if (branchForm.managerId && createdBranch?.branchId) {
          try {
            await api.assignManager(createdBranch.branchId, branchForm.managerId)
          } catch (mgrErr: any) {
            console.error('Failed to assign manager during creation:', mgrErr)
            showToast('Đã tạo chi nhánh nhưng không thể gán quản lý: ' + extractErrorMessage(mgrErr, ''), 'error')
            managerError = true
          }
        }
        
        if (!managerError) {
          showToast('Tạo chi nhánh mới thành công.', 'success')
        }
      } else if (modalMode === 'edit' && selectedBranch) {
        const payload: UpdateBranchRequest = {
          Name: branchForm.name.trim(),
          Address: branchForm.address.trim(),
          City: branchForm.city.trim(),
          Phone: branchForm.phone.trim(),
          Email: branchForm.email.trim() || undefined,
          Latitude: lat,
          Longitude: lng,
          OpenTime: `${branchForm.openTime}:00`,
          CloseTime: `${branchForm.closeTime}:00`,
          IsActive: selectedBranch.isActive,
        }
        await api.updateBranch(selectedBranch.branchId, payload)

        // Check if manager changed
        const oldManagerId = selectedBranch.managerId || ''
        const newManagerId = branchForm.managerId || ''
        let managerError = false
        if (newManagerId !== oldManagerId) {
          try {
            if (newManagerId) {
              await api.assignManager(selectedBranch.branchId, newManagerId)
            } else {
              await api.removeManager(selectedBranch.branchId)
            }
          } catch (mgrErr: any) {
            console.error('Failed to update manager:', mgrErr)
            showToast('Cập nhật chi nhánh thành công nhưng đổi quản lý thất bại: ' + extractErrorMessage(mgrErr, ''), 'error')
            managerError = true
          }
        }

        if (!managerError) {
          showToast('Cập nhật thông tin chi nhánh thành công.', 'success')
        }
      }

      setModalMode(null)
      fetchBranches() // Refresh list
    } catch (err: any) {
      console.error(err)
      let errorMsg = extractErrorMessage(err, 'Thao tác thất bại. Vui lòng thử lại.')
      if (errorMsg.toLowerCase().includes('500') || errorMsg.includes('Internal Server Error') || errorMsg.includes('code already exists')) {
        errorMsg = 'Lỗi hệ thống (500) hoặc mã chi nhánh đã tồn tại trong hệ thống (kể cả chi nhánh đã ẩn/xóa). Vui lòng đổi mã khác (ví dụ: BR-002).'
      }
      setBranchFormError(errorMsg)
    } finally {
      setBranchFormLoading(false)
    }
  }

  // Quick toggle active state
  const handleToggleActive = async (branch: Branch) => {
    if (branch.isActive) {
      setBranchToToggle(branch)
      return
    }
    // Directly open if inactive
    setActionLoadingId(branch.branchId)
    try {
      await api.updateBranch(branch.branchId, { IsActive: true })
      showToast(`Đã mở cửa chi nhánh ${branch.name}`, 'success')
      setBranches(prev => prev.map(b => b.branchId === branch.branchId ? { ...b, isActive: true } : b))
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Thao tác thất bại.'), 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleConfirmToggleActive = async () => {
    if (!branchToToggle) return
    setToggleLoading(true)
    try {
      await api.updateBranch(branchToToggle.branchId, { IsActive: false })
      showToast(`Đã đóng cửa chi nhánh ${branchToToggle.name}`, 'success')
      setBranches(prev => prev.map(b => b.branchId === branchToToggle.branchId ? { ...b, isActive: false } : b))
      setBranchToToggle(null)
    } catch (err: any) {
      console.error(err)
      showToast(extractErrorMessage(err, 'Thao tác thất bại.'), 'error')
    } finally {
      setToggleLoading(false)
    }
  }

  return (
    <div className="portal-page branches-page">
      {/* Page Header */}
      <div className="dash-header">
        <div>
          <h2>Branches Management</h2>
          <p>Create and edit location details, assign managers, and configure active wash services.</p>
        </div>
        <button 
          type="button" 
          className="btn btn-primary btn-premium-glow"
          onClick={openCreateModal}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Location
        </button>
      </div>

      {/* Glassmorphism Filters */}
      <div className="glass-filters">
        {/* Search */}
        <div className="filter-input-wrap">
          <label className="form-label" htmlFor="search-input">Search Branch</label>
          <input
            id="search-input"
            className="form-input form-input-icon"
            placeholder="Search by name, address, code..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <span className="filter-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
        </div>

        {/* City Filter */}
        <div className="filter-input-wrap">
          <label className="form-label" htmlFor="city-input">City</label>
          <input
            id="city-input"
            className="form-input form-input-icon"
            placeholder="e.g. Ho Chi Minh"
            value={cityFilter}
            onChange={e => { setCityFilter(e.target.value); setPage(1); }}
          />
          <span className="filter-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </span>
        </div>

        {/* Status select */}
        <div className="filter-input-wrap">
          <label className="form-label" htmlFor="status-select">Status</label>
          <select
            id="status-select"
            className="form-input form-select-custom"
            value={isActiveFilter}
            onChange={e => { setIsActiveFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Status</option>
            <option value="active">Active (Open)</option>
            <option value="inactive">Inactive (Closed)</option>
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="btn-reset"
          onClick={handleResetFilters}
          title="Reset filters"
          disabled={!search && !cityFilter && isActiveFilter === 'all'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Clear
        </button>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div className="branches-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-user-card skeleton-shimmer" style={{ height: '240px' }} />
          ))}
        </div>
      ) : error ? (
        <div className="empty-state-premium">
          <div className="empty-state-icon-premium">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={fetchBranches}>
            Try Again
          </button>
        </div>
      ) : branches.length === 0 ? (
        <div className="empty-state-premium animate-fade-in">
          <div className="empty-state-icon-premium">📍</div>
          <h3>No branches found</h3>
          <p>We couldn't find any branches matching your filters. Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="branches-grid">
          {branches.map((b, index) => (
            <div 
              key={b.branchId} 
              className={`branch-card-premium ${b.isActive ? 'active-branch' : 'inactive-branch'}`}
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className="branch-card-header">
                <div className="branch-title-area">
                  <h3>{b.name}</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="badge badge-primary branch-code-badge">{b.branchCode}</span>
                  </div>
                </div>
                
                {/* Status Switch */}
                <label className="switch-premium" title={b.isActive ? 'Close branch' : 'Open branch'}>
                  <input
                    type="checkbox"
                    checked={b.isActive}
                    disabled={actionLoadingId === b.branchId}
                    onChange={() => handleToggleActive(b)}
                  />
                  <span className="slider-premium" />
                </label>
              </div>

              <div className="branch-body">
                <div className="branch-detail-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{b.address}, {b.city}</span>
                </div>

                <div className="branch-detail-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81 7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span>{b.phone}</span>
                </div>

                {b.email && (
                  <div className="branch-detail-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>{b.email}</span>
                  </div>
                )}

                <div className="branch-detail-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{b.openTime?.substring(0, 5)} - {b.closeTime?.substring(0, 5)}</span>
                </div>

                <div className="branch-manager-info">
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Branch Manager</div>
                  <div style={{ fontSize: '0.88rem', color: b.managerName ? 'var(--color-heading)' : 'var(--color-text-muted)', fontWeight: 500, marginTop: '2px' }}>
                    {b.managerName || '⚠️ No Manager Assigned'}
                  </div>
                </div>
              </div>

              <div className="branch-actions">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Services Config Trigger */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}
                    onClick={() => openServicesModal(b)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    Services
                  </button>

                  {/* Staff Config Trigger */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}
                    onClick={() => openStaffModal(b)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Staff
                  </button>
                </div>

                <div className="branch-action-buttons">
                  {/* Edit Button */}
                  <button
                    type="button"
                    className="action-btn-circle"
                    title="Edit Location Info"
                    style={{ color: 'var(--color-primary)' }}
                    onClick={() => openEditModal(b)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && branches.length > 0 && (
        <div className="pagination-container-premium animate-fade-in">
          <div className="pagination-stats">
            Showing <strong>{((page - 1) * pageSize) + 1}</strong> to <strong>{Math.min(page * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> branches
          </div>
          <div className="pagination-buttons">
            <button
              type="button"
              className="btn-page-nav"
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="page-indicator-text">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn-page-nav"
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Location Modal ── */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="confirm-modal-overlay" onClick={() => !branchFormLoading && setModalMode(null)}>
          <div className="confirm-modal-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', textAlign: 'left', alignItems: 'stretch' }}>
            <div className="vehicle-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--color-heading)' }}>{modalMode === 'edit' ? 'Edit Branch Details' : 'Add New Branch Location'}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {modalMode === 'edit' ? 'Update name, address, contact, and hours.' : 'Create a new wash station location in the system.'}
                </p>
              </div>
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setModalMode(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleBranchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {branchFormError && (
                <div className="badge badge-danger" style={{ display: 'block', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  {branchFormError}
                </div>
              )}

              <div className="form-row-double">
                <div className="form-group">
                  <label className="form-label" htmlFor="branch-code">Branch Code *</label>
                  <input
                    id="branch-code"
                    className="form-input"
                    required
                    placeholder="Auto-generated"
                    value={branchForm.branchCode}
                    disabled
                    onChange={e => setBranchForm(prev => ({ ...prev, branchCode: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="branch-name">Branch Name *</label>
                  <input
                    id="branch-name"
                    className="form-input"
                    required
                    placeholder="e.g. WashPro Center D1"
                    value={branchForm.name}
                    disabled={branchFormLoading}
                    onChange={e => setBranchForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" htmlFor="branch-address">Address *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="branch-address"
                    className="form-input"
                    required
                    placeholder="e.g. 123 Nguyen Hue Street"
                    value={branchForm.address}
                    disabled={branchFormLoading}
                    onChange={handleAddressChange}
                    onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200)
                      triggerAutoGeocode()
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        triggerAutoGeocode()
                      }
                    }}
                  />
                  {suggestionsLoading && (
                    <div className="address-loader-spinner" />
                  )}
                </div>
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="address-suggestions-dropdown">
                    {addressSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        className="suggestion-item"
                        onClick={() => handleSelectSuggestion(s)}
                      >
                        <svg className="suggestion-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className="suggestion-text">{s.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-row-double">
                <div className="form-group">
                  <label className="form-label" htmlFor="branch-city">City *</label>
                  <select
                    id="branch-city"
                    className="form-input form-select-custom"
                    required
                    value={branchForm.city}
                    disabled={branchFormLoading}
                    onChange={e => {
                      const selectedCity = e.target.value;
                      setAddressSuggestions([]);
                      setShowSuggestions(false);
                      setBranchForm(prev => {
                        const coords = CITY_COORDINATES[selectedCity] || { lat: '', lng: '' };
                        return {
                          ...prev,
                          city: selectedCity,
                          latitude: coords.lat,
                          longitude: coords.lng
                        };
                      });
                    }}
                  >
                    <option value="">-- Select City --</option>
                    {provincesList.map((p: any) => (
                      <option key={p.code} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="branch-phone">Phone Number *</label>
                  <input
                    id="branch-phone"
                    className="form-input"
                    required
                    placeholder="e.g. 0281234567"
                    value={branchForm.phone}
                    disabled={branchFormLoading}
                    onChange={e => setBranchForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="branch-email">Email Address</label>
                <input
                  id="branch-email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. district1@autowash.com"
                  value={branchForm.email}
                  disabled={branchFormLoading}
                  onChange={e => setBranchForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="form-row-double">
                <div className="form-group">
                  <label className="form-label" htmlFor="branch-open">Opening Time *</label>
                  <input
                    id="branch-open"
                    type="time"
                    className="form-input"
                    required
                    value={branchForm.openTime}
                    disabled={branchFormLoading}
                    onChange={e => setBranchForm(prev => ({ ...prev, openTime: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="branch-close">Closing Time *</label>
                  <input
                    id="branch-close"
                    type="time"
                    className="form-input"
                    required
                    value={branchForm.closeTime}
                    disabled={branchFormLoading}
                    onChange={e => setBranchForm(prev => ({ ...prev, closeTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row-double">
                <div className="form-group">
                  <label className="form-label" htmlFor="branch-lat">Latitude (Disabled)</label>
                  <input
                    id="branch-lat"
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Auto-generated from map/address"
                    value={branchForm.latitude}
                    disabled={true}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="branch-lng">Longitude (Disabled)</label>
                  <input
                    id="branch-lng"
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Auto-generated from map/address"
                    value={branchForm.longitude}
                    disabled={true}
                  />
                </div>
              </div>

              {/* Interactive Map */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="form-label">Location Map (Click or Drag Marker to set coordinates)</label>
                <div style={{ height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border-dim)', zIndex: 10 }}>
                  <MapContainer 
                    center={(() => {
                      const lat = parseFloat(branchForm.latitude)
                      const lng = parseFloat(branchForm.longitude)
                      if (!isNaN(lat) && !isNaN(lng)) {
                        return [lat, lng] as [number, number]
                      }
                      if (branchForm.city && CITY_COORDINATES[branchForm.city]) {
                        const cityCoords = CITY_COORDINATES[branchForm.city]
                        return [parseFloat(cityCoords.lat), parseFloat(cityCoords.lng)] as [number, number]
                      }
                      return [10.776, 106.701] as [number, number] // Default HCMC
                    })()} 
                    zoom={14} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapEventsHandler 
                      center={(() => {
                        const lat = parseFloat(branchForm.latitude)
                        const lng = parseFloat(branchForm.longitude)
                        if (!isNaN(lat) && !isNaN(lng)) {
                          return [lat, lng] as [number, number]
                        }
                        if (branchForm.city && CITY_COORDINATES[branchForm.city]) {
                          const cityCoords = CITY_COORDINATES[branchForm.city]
                          return [parseFloat(cityCoords.lat), parseFloat(cityCoords.lng)] as [number, number]
                        }
                        return [10.776, 106.701] as [number, number]
                      })()} 
                      onMapClick={(lat, lng) => {
                        handleMapLocationChange(lat, lng)
                      }}
                    />
                    {(() => {
                      const lat = parseFloat(branchForm.latitude)
                      const lng = parseFloat(branchForm.longitude)
                      if (!isNaN(lat) && !isNaN(lng)) {
                        return (
                          <Marker 
                            position={[lat, lng]}
                            draggable={true}
                            eventHandlers={{
                              dragend: (e) => {
                                const marker = e.target
                                const position = marker.getLatLng()
                                handleMapLocationChange(position.lat, position.lng)
                              }
                            }}
                          />
                        )
                      }
                      return null
                    })()}
                  </MapContainer>
                </div>
              </div>

              {/* Manager Assignment Selection */}
              {(modalMode === 'create' || modalMode === 'edit') && (
                <div className="form-group">
                  <label className="form-label" htmlFor="branch-manager">Assign Manager</label>
                  <select
                    id="branch-manager"
                    className="form-input form-select-custom"
                    value={branchForm.managerId}
                    disabled={managersLoading || branchFormLoading}
                    onChange={e => setBranchForm(prev => ({ ...prev, managerId: e.target.value }))}
                  >
                    <option value="">-- Optional: Select Manager --</option>
                    {managers
                      .filter(m => {
                        const isAssignedToOther = assignedManagerIds.includes(m.userId) && m.userId !== selectedBranch?.managerId
                        return !isAssignedToOther
                      })
                      .map(m => (
                        <option key={m.userId} value={m.userId}>{m.fullName} ({m.email})</option>
                      ))
                    }
                  </select>
                </div>
              )}

              <div className="confirm-modal-actions" style={{ marginTop: '14px' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setModalMode(null)} 
                  disabled={branchFormLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={branchFormLoading}
                >
                  {branchFormLoading 
                    ? (modalMode === 'edit' ? 'Saving...' : 'Creating...') 
                    : (modalMode === 'edit' ? 'Save Changes' : 'Create Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Configure Services Modal ── */}
      {modalMode === 'services' && selectedBranch && (
        <div className="confirm-modal-overlay" onClick={() => !savingServices && setModalMode(null)}>
          <div className="confirm-modal-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', textAlign: 'left', alignItems: 'stretch' }}>
            <div className="vehicle-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--color-heading)' }}>Active Wash Services</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Enable or disable wash services offered at <strong style={{ color: 'var(--color-primary)' }}>{selectedBranch.name}</strong>.
                </p>
              </div>
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setModalMode(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveServices}>
              {catalogLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                  Loading catalog items...
                </div>
              ) : catalogItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-muted)' }}>
                  No active items found in the service catalog. Create catalog items first.
                </div>
              ) : (
                <div className="services-catalog-grid">
                  {catalogItems.map(item => {
                    const isSelected = selectedServiceIds.includes(item.serviceCatalogItemId)
                    return (
                      <div 
                        key={item.serviceCatalogItemId} 
                        className={`service-selection-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleServiceSelection(item.serviceCatalogItemId)}
                        style={{ position: 'relative' }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          readOnly
                        />
                        <div className="service-selection-info">
                          <h4>{item.name}</h4>
                          <p>{item.durationMinutes} mins</p>
                          <div className="price-tag">{item.basePrice.toLocaleString('vi-VN')} đ</div>
                        </div>
                        {isSelected && (
                          <button
                            type="button"
                            title="Gỡ bỏ hoàn toàn khỏi chi nhánh"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBranchService(item.serviceCatalogItemId);
                            }}
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-danger, #FF4B4B)',
                              cursor: 'pointer',
                              padding: '4px',
                              zIndex: 2,
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="confirm-modal-actions" style={{ marginTop: '20px', borderTop: '1px solid var(--color-border-dim)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setModalMode(null)} 
                  disabled={savingServices}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={savingServices || catalogLoading}
                >
                  {savingServices ? 'Saving Changes...' : 'Save Service Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Manage Branch Staff Modal */}
      {modalMode === 'staff' && selectedBranch && (
        <div className="confirm-modal-overlay" onClick={() => setModalMode(null)}>
          <div className="confirm-modal-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', textAlign: 'left', alignItems: 'stretch' }}>
            <div className="vehicle-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--color-heading)' }}>Branch Staff Directory</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Manage personnel assigned to <strong style={{ color: 'var(--color-primary)' }}>{selectedBranch.name}</strong>.
                </p>
              </div>
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setModalMode(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Assign Staff Section */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--color-bg-dim, rgba(255,255,255,0.02))', borderRadius: '8px', border: '1px solid var(--color-border-dim)' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '8px', color: 'var(--color-heading)' }}>Assign New Staff to Branch</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  className="form-input form-select-custom"
                  style={{ flex: 1 }}
                  defaultValue=""
                  onChange={e => {
                    const val = e.target.value;
                    if (val) {
                      handleAssignStaff(val);
                      e.target.value = ""; // Reset dropdown
                    }
                  }}
                  disabled={allStaffLoading || assignStaffLoading}
                >
                  <option value="">{allStaffLoading ? 'Loading staff...' : '-- Select a Staff member to assign --'}</option>
                  {allStaffList
                    .filter(s => !s.branchId && !branchStaff.some(bs => bs.userId === s.userId)) // filter out staff already assigned to any branch
                    .map(s => (
                      <option key={s.userId} value={s.userId}>
                        {s.fullName} ({s.phoneNumber || s.email})
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* Staff Directory List */}
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--color-heading)' }}>Currently Assigned Staff</h4>
              {staffLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
                  Loading staff list...
                </div>
              ) : branchStaff.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  No staff members are currently assigned to this location.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {branchStaff.map(s => (
                    <div 
                      key={s.userId} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 14px', 
                        background: 'rgba(255,255,255,0.03)', 
                        borderRadius: '6px',
                        border: '1px solid var(--color-border-dim)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-heading)' }}>{s.fullName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.email || s.phoneNumber || 'No email/phone'}</div>
                      </div>
                      <button
                        type="button"
                        title="Remove from branch"
                        disabled={removeStaffLoadingId === s.userId}
                        onClick={() => handleRemoveStaff(s.userId)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-danger, #FF4B4B)',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        {removeStaffLoadingId === s.userId ? (
                          <div className="address-loader-spinner" style={{ width: '14px', height: '14px', position: 'static', margin: 0 }} />
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="confirm-modal-actions" style={{ marginTop: '20px', borderTop: '1px solid var(--color-border-dim)', paddingTop: '16px' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => setModalMode(null)}
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Custom Toast Notifications Stack */}
      <div className="toast-container-custom">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast-custom ${toast.type === 'success' ? 'toast-custom-success' : 'toast-custom-error'}`}
          >
            {toast.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 16 14"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
            <span style={{ fontSize: '0.92rem', color: 'var(--color-heading)', fontWeight: 500 }}>
              {toast.message}
            </span>
          </div>
        ))}
      </div>
      <ConfirmModal
        isOpen={!!branchToToggle}
        title="Đóng cửa chi nhánh"
        variant="warning"
        isLoading={toggleLoading}
        onCancel={() => setBranchToToggle(null)}
        onConfirm={handleConfirmToggleActive}
        confirmText="Đóng cửa"
        cancelText="Hủy bỏ"
        message={
          <p>
            Bạn có chắc chắn muốn đóng cửa chi nhánh <strong style={{ color: 'var(--color-heading)' }}>{branchToToggle?.name}</strong>?
          </p>
        }
      />
    </div>
  )
}
