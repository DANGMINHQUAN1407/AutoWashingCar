import { normalizeBranch, normalizeBranchService, type Branch, type BranchService } from '../types/branch'
import {
  normalizeBooking,
  normalizeBookingLine,
  type Booking,
  type BookingQuoteRequest,
  type BookingQuoteDto,
  type CreateBookingRequest,
  type BookingQuery
} from '../types/booking'
import { normalizeSlot, type Slot, type CreateSlotRequest, type GenerateSlotsRequest, type UpdateSlotRequest } from '../types/slot'
import { normalizeTier, normalizeTierBenefit } from '../types/tier'
import {
  type ReviewItem,
  type ReviewQuery,
  type CreateReviewRequest,
  normalizeReview
} from '../types/review'
import { unwrapData, unwrapPagedItems } from '../utils/apiHelpers'

export type HealthResponse = { status?: string }
export type VehicleType = 1 | 2 | 3

export type VehicleImageDto = {
  imageId: string
  vehicleId: string
  imageUrl: string
  isPrimary: boolean
  uploadedAtUtc: string
}

export type Vehicle = {
  vehicleId?: string
  VehicleId?: string
  licensePlate?: string
  LicensePlate?: string
  vehicleType?: VehicleType
  VehicleType?: VehicleType
  brand?: string | null
  Brand?: string | null
  brandCatalogId?: string | null
  BrandCatalogId?: string | null
  brandCatalogName?: string | null
  BrandCatalogName?: string | null
  isLuxuryBrand?: boolean | null
  IsLuxuryBrand?: boolean | null
  model?: string | null
  Model?: string | null
  manufactureYear?: number | null
  ManufactureYear?: number | null
  engineType?: number | null
  EngineType?: number | null
  bodyStyle?: number | null
  BodyStyle?: number | null
  engineCatalogId?: string | null
  EngineCatalogId?: string | null
  bodyStyleCatalogId?: string | null
  BodyStyleCatalogId?: string | null
  engineCatalogName?: string | null
  EngineCatalogName?: string | null
  bodyStyleCatalogName?: string | null
  BodyStyleCatalogName?: string | null
  vehicleImages?: VehicleImageDto[] | null
  VehicleImages?: VehicleImageDto[] | null
  primaryImageUrl?: string | null
  PrimaryImageUrl?: string | null
  vehicleCondition?: string | null
  VehicleCondition?: string | null
}

export type CreateVehicleRequest = {
  LicensePlate: string
  VehicleType: VehicleType
  Brand?: string
  BrandCatalogId?: string
  Model?: string
  ManufactureYear?: number
  EngineType?: number
  BodyStyle?: number
  EngineCatalogId?: string
  BodyStyleCatalogId?: string
}

export type VehicleCatalogItem = {
  id: string
  code: string
  name: string
  isActive: boolean
  isLuxury?: boolean
  legacyEnumValue?: number | null
  vehicleType?: number | null
}

export type CreateVehicleCatalogRequest = {
  Code: string
  Name: string
  IsLuxury?: boolean
  VehicleType?: number
}

export type UpdateVehicleCatalogRequest = {
  Name: string
  IsActive: boolean
  IsLuxury?: boolean
}

const metaEnv = import.meta.env as Record<string, string | boolean | undefined>
const envApi = (metaEnv.VITE_API_URL as string) || undefined
const apiBase = envApi && envApi.length > 0 ? envApi.replace(/\/$/, '') : ''

const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null
let currentToken: string | null = storedToken;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

function getAuthToken() {
  return currentToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null)
}

function buildUrl(path: string) {
  if (apiBase) return `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`
  // when no explicit API URL, use dev proxy (relative paths)
  return path.startsWith('/') ? path : `/${path}`
}

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const url = buildUrl(path);
  const headers = new Headers(options.headers);

  const authToken = getAuthToken();
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let errorMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.message) errorMsg = parsed.message;
      else if (parsed && parsed.Message) errorMsg = parsed.Message;
      else if (parsed && parsed.error) errorMsg = parsed.error;
      else if (parsed && parsed.Error) errorMsg = parsed.Error;
      else if (parsed && parsed.title) errorMsg = parsed.title;
    } catch {
      if (text) errorMsg += ` ${text}`;
    }
    throw new Error(errorMsg);
  }
  
  // Return empty object if no body
  if (res.status === 204) return {};
  
  return res.json().catch(() => ({}));
}

export async function getHealth(): Promise<HealthResponse> {
  return fetchWithAuth('/api/health', { method: 'GET' });
}

export async function login(data: any) {
  const url = buildUrl('/api/auth/login');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Login failed');
  }
  
  return res.json();
}

export async function register(data: any) {
  const url = buildUrl('/api/auth/register');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Registration failed');
  }
  
  return res.json();
}

export async function claimGuestAccount(data: { PhoneNumber: string; Email: string; Password: string }) {
  const url = buildUrl('/api/auth/claim');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Claim account failed');
  }
  
  return res.json();
}

export async function googleLogin(idToken: string) {
  const url = buildUrl('/api/auth/google');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IdToken: idToken }),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Google login failed');
  }
  
  return res.json();
}

export async function logout(refreshToken?: string | null) {
  return fetchWithAuth('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ RefreshToken: refreshToken || '' })
  });
}

export async function getMe() {
  const res = await fetchWithAuth('/api/auth/me', { method: 'GET' });
  // Normalize common wrapper shapes: { data: {...} } or { Data: {...} } or { user: {...} }
  const inner = res?.data ?? res?.Data ?? res?.user ?? res?.User ?? res;
  if (inner && typeof inner === 'object') {
    const role = inner.Role ?? inner.role
    const normalized: any = {
      id: inner.id ?? inner.userId ?? inner.UserId ?? inner.Id,
      email: inner.Email ?? inner.email ?? inner.userEmail,
      fullName: inner.FullName ?? inner.fullName ?? inner.name ?? inner.Name,
      FullName: inner.FullName ?? inner.fullName ?? inner.name ?? inner.Name,
      name: inner.name ?? inner.fullName ?? inner.FullName ?? inner.Name,
      phone: inner.phoneNumber ?? inner.PhoneNumber ?? inner.phone ?? inner.Phone,
      PhoneNumber: inner.phoneNumber ?? inner.PhoneNumber ?? inner.phone ?? inner.Phone,
      role,
      Role: role,
      ...inner,
    }
    return normalized;
  }

  return inner;
}

export async function getMyVehicles(): Promise<Vehicle[]> {
  const res = await fetchWithAuth('/api/vehicles?PageSize=100', { method: 'GET' });
  return unwrapPagedItems<Vehicle>(res);
}

export async function createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
  const payload = await fetchWithAuth('/api/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return payload?.data ?? payload?.Data ?? payload?.vehicle ?? payload?.Vehicle ?? payload;
}

export async function updateVehicle(vehicleId: string, data: CreateVehicleRequest): Promise<Vehicle> {
  const payload = await fetchWithAuth(`/api/vehicles/${vehicleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return payload?.data ?? payload?.Data ?? payload?.vehicle ?? payload?.Vehicle ?? payload;
}

export async function deleteVehicle(vehicleId: string) {
  return fetchWithAuth(`/api/vehicles/${vehicleId}`, { method: 'DELETE' });
}

export async function uploadVehicleImage(vehicleId: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  return fetchWithAuth(`/api/vehicles/${vehicleId}/images`, {
    method: 'POST',
    body: formData,
  });
}

export async function setPrimaryVehicleImage(vehicleId: string, imageId: string): Promise<any> {
  return fetchWithAuth(`/api/vehicles/${vehicleId}/images/${imageId}/set-primary`, { method: 'PUT' });
}

export async function deleteVehicleImage(vehicleId: string, imageId: string): Promise<any> {
  return fetchWithAuth(`/api/vehicles/${vehicleId}/images/${imageId}`, { method: 'DELETE' });
}

export async function getVehicleImages(vehicleId: string): Promise<VehicleImageDto[]> {
  const res = await fetchWithAuth(`/api/vehicles/${vehicleId}/images`, { method: 'GET' });
  return Array.isArray(res) ? res : (res?.data ?? res?.Data ?? []);
}

export async function forgotPassword(data: { Email: string }) {
  const url = buildUrl('/api/auth/forgot-password');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to send reset instructions');
  }
  
  return res.status === 204 ? {} : res.json().catch(() => ({}));
}

export type BranchesPageResult = {
  items: Branch[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export async function getBranches(params?: {
  page?: number
  pageSize?: number
  city?: string
  isActive?: boolean
}): Promise<BranchesPageResult> {
  const search = new URLSearchParams()
  if (params?.page) search.set('Page', String(params.page))
  if (params?.pageSize) search.set('PageSize', String(params.pageSize))
  if (params?.city) search.set('City', params.city)
  if (params?.isActive !== undefined) search.set('IsActive', String(params.isActive))
  const qs = search.toString()
  const res = await fetchWithAuth(`/api/branches${qs ? `?${qs}` : ''}`)
  const data = unwrapData<{
    items?: Record<string, unknown>[]
    Items?: Record<string, unknown>[]
    totalCount?: number
    TotalCount?: number
    pageNumber?: number
    PageNumber?: number
    pageSize?: number
    PageSize?: number
    totalPages?: number
    TotalPages?: number
  }>(res)
  const rawItems = data?.items ?? data?.Items ?? unwrapPagedItems<Record<string, unknown>>(res)
  const items = rawItems.map(normalizeBranch)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? params?.pageSize ?? 10
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? params?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function getBranchById(branchId: string): Promise<Branch> {
  const res = await fetchWithAuth(`/api/branches/${branchId}`)
  return normalizeBranch(unwrapData<Record<string, unknown>>(res))
}

export async function getMyBranch(): Promise<Branch> {
  const res = await fetchWithAuth('/api/branches/my')
  return normalizeBranch(unwrapData<Record<string, unknown>>(res))
}


export async function getBranchServices(branchId: string): Promise<BranchService[]> {
  const res = await fetchWithAuth(`/api/branches/${branchId}/services`)
  const items = unwrapPagedItems<Record<string, unknown>>(res)
  return (Array.isArray(items) ? items : []).map(normalizeBranchService)
}

export async function resetPassword(data: { Token: string, NewPassword: string }) {
  const url = buildUrl('/api/auth/reset-password');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to reset password');
  }
  
  return res.status === 204 ? {} : res.json().catch(() => ({}));
}

export type UserDto = {
  userId: string
  fullName: string
  email?: string
  phoneNumber?: string
  role: string
  isActive: boolean
  createdAtUtc: string
  branchId?: string
}

export type UsersPageResult = {
  items: UserDto[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export async function getUsers(params?: {
  page?: number
  pageSize?: number
  role?: string
  isActive?: boolean
  search?: string
  phoneNumber?: string
}): Promise<UsersPageResult> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  if (params?.role) searchParams.set('Role', params.role)
  if (params?.isActive !== undefined) searchParams.set('IsActive', String(params.isActive))
  if (params?.search) searchParams.set('Search', params.search)
  if (params?.phoneNumber) searchParams.set('PhoneNumber', params.phoneNumber)
  
  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/admin/users${qs ? `?${qs}` : ''}`)
  const data = unwrapData<{
    items?: Record<string, unknown>[]
    Items?: Record<string, unknown>[]
    totalCount?: number
    TotalCount?: number
    pageNumber?: number
    PageNumber?: number
    pageSize?: number
    PageSize?: number
    totalPages?: number
    TotalPages?: number
  }>(res)
  
  const rawItems = data?.items ?? data?.Items ?? unwrapPagedItems<Record<string, unknown>>(res)
  const items = rawItems.map((u: any) => ({
    userId: u.userId ?? u.UserId ?? u.id ?? u.Id,
    fullName: u.fullName ?? u.FullName ?? u.name ?? u.Name,
    email: u.email ?? u.Email,
    phoneNumber: u.phoneNumber ?? u.PhoneNumber ?? u.phone ?? u.Phone,
    role: u.role ?? u.Role,
    isActive: u.isActive ?? u.IsActive ?? false,
    createdAtUtc: u.createdAtUtc ?? u.CreatedAtUtc,
    branchId: u.branchId ?? u.BranchId ?? undefined,
  }))
  
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? params?.pageSize ?? 10
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? params?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function activateUser(id: string) {
  return fetchWithAuth(`/api/admin/users/${id}/activate`, { method: 'POST' })
}

export async function deactivateUser(id: string) {
  return fetchWithAuth(`/api/admin/users/${id}/deactivate`, { method: 'POST' })
}

export async function deleteUser(id: string) {
  return fetchWithAuth(`/api/admin/users/${id}`, { method: 'DELETE' })
}

export async function createStaff(data: { FullName: string, Email?: string, PhoneNumber?: string, Role: string }) {
  const payload = await fetchWithAuth('/api/admin/create-staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return payload?.data ?? payload?.Data ?? payload
}

export async function updateUser(userId: string, data: { FullName: string, Email?: string, PhoneNumber?: string, Role: string }) {
  const payload = await fetchWithAuth(`/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return payload?.data ?? payload?.Data ?? payload
}

export type CreateBranchRequest = {
  BranchCode: string
  Name: string
  Address: string
  City: string
  Phone: string
  Email?: string
  Latitude?: number
  Longitude?: number
  OpenTime: string // "HH:mm" or "HH:mm:ss"
  CloseTime: string // "HH:mm" or "HH:mm:ss"
  ManagerId?: string
}

export type UpdateBranchRequest = {
  Name?: string
  Address?: string
  City?: string
  Phone?: string
  Email?: string
  Latitude?: number
  Longitude?: number
  OpenTime?: string // "HH:mm" or "HH:mm:ss"
  CloseTime?: string // "HH:mm" or "HH:mm:ss"
  IsActive?: boolean
}

export type ServiceCatalogItem = {
  serviceCatalogItemId: string
  name: string
  description?: string
  basePrice: number
  durationMinutes: number
  isActive: boolean
}

export type ServiceCatalogPageResult = {
  items: ServiceCatalogItem[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export async function createBranch(data: CreateBranchRequest): Promise<Branch> {
  const payload = await fetchWithAuth('/api/branches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return normalizeBranch(unwrapData<Record<string, unknown>>(payload))
}

export async function updateBranch(id: string, data: UpdateBranchRequest): Promise<Branch> {
  const payload = await fetchWithAuth(`/api/branches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return normalizeBranch(unwrapData<Record<string, unknown>>(payload))
}


export async function assignBranchServices(id: string, serviceCatalogItemIds: string[]): Promise<any> {
  return fetchWithAuth(`/api/branches/${id}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ServiceCatalogItemIds: serviceCatalogItemIds }),
  })
}

export async function assignManager(id: string, userId: string): Promise<any> {
  return fetchWithAuth(`/api/branches/${id}/manager`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ UserId: userId }),
  })
}

export async function removeManager(id: string): Promise<any> {
  return fetchWithAuth(`/api/branches/${id}/manager`, {
    method: 'DELETE',
  })
}

export async function deleteBranch(id: string): Promise<any> {
  return fetchWithAuth(`/api/branches/${id}`, {
    method: 'DELETE',
  })
}

export async function getBranchStaff(branchId: string): Promise<UserDto[]> {
  const res = await fetchWithAuth(`/api/branches/${branchId}/staff?PageSize=100`)
  const items = unwrapPagedItems<any>(res)
  return items.map((u: any) => ({
    userId: u.userId ?? u.UserId ?? u.id ?? u.Id,
    fullName: u.fullName ?? u.FullName ?? u.name ?? u.Name,
    email: u.email ?? u.Email,
    phoneNumber: u.phoneNumber ?? u.PhoneNumber ?? u.phone ?? u.Phone,
    role: u.role ?? u.Role,
    isActive: u.isActive ?? u.IsActive ?? false,
    createdAtUtc: u.createdAtUtc ?? u.CreatedAtUtc,
  }))
}

export async function assignBranchStaff(branchId: string, userIds: string[]): Promise<any> {
  return fetchWithAuth(`/api/branches/${branchId}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ UserIds: userIds }),
  })
}

export async function removeBranchStaff(branchId: string, userId: string): Promise<any> {
  return fetchWithAuth(`/api/branches/${branchId}/staff/${userId}`, {
    method: 'DELETE',
  })
}

export async function toggleBranchService(branchId: string, serviceId: string, isActive: boolean): Promise<any> {
  return fetchWithAuth(`/api/branches/${branchId}/services/${serviceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IsActive: isActive }),
  })
}

export async function removeBranchService(branchId: string, serviceId: string): Promise<any> {
  return fetchWithAuth(`/api/branches/${branchId}/services/${serviceId}`, {
    method: 'DELETE',
  })
}


export function normalizeServiceCatalogItem(s: any): ServiceCatalogItem {
  return {
    serviceCatalogItemId: s?.serviceCatalogItemId ?? s?.ServiceCatalogItemId ?? s?.id ?? s?.Id ?? '',
    name: s?.name ?? s?.Name ?? s?.serviceName ?? s?.ServiceName ?? '',
    description: s?.description ?? s?.Description ?? '',
    basePrice: s?.basePrice ?? s?.BasePrice ?? 0,
    durationMinutes: s?.durationMinutes ?? s?.DurationMinutes ?? 0,
    isActive: s?.isActive ?? s?.IsActive ?? false,
  }
}

export async function getServiceCatalog(params?: {
  page?: number
  pageSize?: number
  isActive?: boolean
  search?: string
}): Promise<ServiceCatalogPageResult> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  if (params?.isActive !== undefined) searchParams.set('IsActive', String(params.isActive))
  if (params?.search) searchParams.set('Search', params.search)
  
  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/service-catalog${qs ? `?${qs}` : ''}`)
  const data = unwrapData<{
    items?: Record<string, unknown>[]
    Items?: Record<string, unknown>[]
    totalCount?: number
    TotalCount?: number
    pageNumber?: number
    PageNumber?: number
    pageSize?: number
    PageSize?: number
    totalPages?: number
    TotalPages?: number
  }>(res)
  
  const rawItems = data?.items ?? data?.Items ?? unwrapPagedItems<Record<string, unknown>>(res)
  const items = rawItems.map(normalizeServiceCatalogItem)
  
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? params?.pageSize ?? 10
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? params?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function createServiceCatalog(data: {
  ServiceName: string
  Description?: string
  BasePrice: number
  DurationMinutes: number
}): Promise<ServiceCatalogItem> {
  const payload = await fetchWithAuth('/api/service-catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = payload?.data ?? payload?.Data ?? payload
  return normalizeServiceCatalogItem(raw)
}

export async function updateServiceCatalog(id: string, data: {
  ServiceName: string
  Description?: string
  BasePrice: number
  DurationMinutes: number
}): Promise<ServiceCatalogItem> {
  const payload = await fetchWithAuth(`/api/service-catalog/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = payload?.data ?? payload?.Data ?? payload
  return normalizeServiceCatalogItem(raw)
}

export async function activateServiceCatalog(id: string): Promise<any> {
  return fetchWithAuth(`/api/service-catalog/${id}/activate`, { method: 'POST' })
}

export async function deactivateServiceCatalog(id: string): Promise<any> {
  return fetchWithAuth(`/api/service-catalog/${id}/deactivate`, { method: 'POST' })
}

export type SlotsPageResult = {
  items: Slot[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export async function getSlots(params?: {
  fromDate?: string
  toDate?: string
  branchId?: string
  page?: number
  pageSize?: number
}): Promise<SlotsPageResult> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  if (params?.fromDate) searchParams.set('FromDate', params.fromDate)
  if (params?.toDate) searchParams.set('ToDate', params.toDate)
  if (params?.branchId) searchParams.set('BranchId', params.branchId)
  
  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/slots${qs ? `?${qs}` : ''}`)
  const data = unwrapData<{
    items?: Record<string, unknown>[]
    Items?: Record<string, unknown>[]
    totalCount?: number
    TotalCount?: number
    pageNumber?: number
    PageNumber?: number
    pageSize?: number
    PageSize?: number
    totalPages?: number
    TotalPages?: number
  }>(res)
  
  const rawItems = data?.items ?? data?.Items ?? unwrapPagedItems<Record<string, unknown>>(res)
  const items = rawItems.map(normalizeSlot)
  
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? params?.pageSize ?? 50
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? params?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function getSlotById(id: string): Promise<Slot> {
  const res = await fetchWithAuth(`/api/slots/${id}`)
  return normalizeSlot(unwrapData<Record<string, unknown>>(res))
}

export async function createSlot(data: CreateSlotRequest): Promise<Slot> {
  const payload = await fetchWithAuth('/api/slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = payload?.data ?? payload?.Data ?? payload
  return normalizeSlot(raw)
}

export async function generateSlots(data: GenerateSlotsRequest): Promise<{ generated: number }> {
  const payload = await fetchWithAuth('/api/slots/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = payload?.data ?? payload?.Data ?? payload
  return {
    generated: raw?.generated ?? raw?.Generated ?? 0
  }
}

export async function updateSlot(id: string, data: UpdateSlotRequest): Promise<Slot> {
  const payload = await fetchWithAuth(`/api/slots/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = payload?.data ?? payload?.Data ?? payload
  return normalizeSlot(raw)
}

export async function deleteSlot(id: string): Promise<any> {
  return fetchWithAuth(`/api/slots/${id}`, {
    method: 'DELETE',
  })
}

export async function getAvailableSlots(branchId: string, date: string): Promise<Slot[]> {
  const res = await fetchWithAuth(`/api/slots/available?branchId=${branchId}&date=${date}`)
  const items = unwrapPagedItems<Record<string, unknown>>(res)
  return (Array.isArray(items) ? items : []).map(normalizeSlot)
}

export async function getMyLoyalty(): Promise<any> {
  const res = await fetchWithAuth('/api/loyalty/me', { method: 'GET' })
  return unwrapData(res)
}

export async function getMyLoyaltyHistory(params?: { page?: number; pageSize?: number }): Promise<any> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/loyalty/me/history${qs ? `?${qs}` : ''}`, { method: 'GET' })
  const rawItems = res?.items ?? res?.Items ?? unwrapPagedItems<any>(res) ?? []
  const totalCount = res?.totalCount ?? res?.TotalCount ?? rawItems.length
  return {
    items: rawItems,
    totalCount: totalCount,
  }
}

export async function getUserLoyalty(userId: string): Promise<any> {
  const res = await fetchWithAuth(`/api/loyalty/users/${userId}`, { method: 'GET' })
  return unwrapData(res)
}

export async function getUserLoyaltyHistory(userId: string, params?: { page?: number; pageSize?: number }): Promise<any> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/loyalty/users/${userId}/history${qs ? `?${qs}` : ''}`, { method: 'GET' })
  const rawItems = res?.items ?? res?.Items ?? unwrapPagedItems<any>(res) ?? []
  const totalCount = res?.totalCount ?? res?.TotalCount ?? rawItems.length
  return {
    items: rawItems,
    totalCount: totalCount,
  }
}

export async function adjustPoints(data: { UserId: string; Points: number; Description?: string }): Promise<any> {
  const res = await fetchWithAuth('/api/loyalty/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      UserId: data.UserId,
      Points: data.Points,
      Description: data.Description,
    }),
  })
  return unwrapData(res)
}

export async function getActiveTiers(): Promise<any[]> {
  const res = await fetchWithAuth('/api/tiers/active', { method: 'GET' })
  return unwrapPagedItems<any>(res)
}

export async function lookupCustomerByPhone(phone: string): Promise<any> {
  const res = await fetchWithAuth(`/api/bookings/customers/lookup?phone=${encodeURIComponent(phone)}`, { method: 'GET' })
  return unwrapData(res)
}

export async function getBookingQuote(data: BookingQuoteRequest): Promise<BookingQuoteDto> {
  const res = await fetchWithAuth('/api/bookings/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const unwrapped = unwrapData<any>(res)
  const rawLines = unwrapped?.lines ?? unwrapped?.Lines ?? []
  return {
    lines: Array.isArray(rawLines) ? rawLines.map(normalizeBookingLine) : [],
    subtotal: Number(unwrapped?.subtotal ?? unwrapped?.Subtotal ?? 0),
    discountAmount: Number(unwrapped?.discountAmount ?? unwrapped?.DiscountAmount ?? 0),
    finalAmount: Number(unwrapped?.finalAmount ?? unwrapped?.FinalAmount ?? 0),
    totalDurationMinutes: Number(unwrapped?.totalDurationMinutes ?? unwrapped?.TotalDurationMinutes ?? 0),
  }
}

export async function createBooking(data: CreateBookingRequest): Promise<Booking> {
  const key = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
  const res = await fetchWithAuth('/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(data),
  })
  return normalizeBooking(unwrapData<any>(res))
}

export type BookingsPageResult = {
  items: Booking[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export async function getMyBookings(params?: BookingQuery): Promise<BookingsPageResult> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  if (params?.status) searchParams.set('Status', String(params.status))
  if (params?.branchId) searchParams.set('BranchId', params.branchId)
  if (params?.fromDate) searchParams.set('FromDate', params.fromDate)
  if (params?.toDate) searchParams.set('ToDate', params.toDate)

  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/bookings/mine${qs ? `?${qs}` : ''}`, { method: 'GET' })
  const data = unwrapData<any>(res)
  const rawItems = data?.items ?? data?.Items ?? unwrapPagedItems<any>(res)
  const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeBooking)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? params?.pageSize ?? 10
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? params?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))

  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function getBookingById(id: string): Promise<Booking> {
  const res = await fetchWithAuth(`/api/bookings/${id}`, { method: 'GET' })
  return normalizeBooking(unwrapData<any>(res))
}

export async function cancelBooking(id: string, reason?: string): Promise<Booking> {
  const res = await fetchWithAuth(`/api/bookings/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Reason: reason || 'Khách hàng tự hủy' }),
  })
  return normalizeBooking(unwrapData<any>(res))
}

export async function createPaymentDeposit(data: { BookingId: string; PayFull: boolean; FrontendUrl?: string }): Promise<{ paymentId: string; transactionCode: string; paymentUrl: string }> {
  const key = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
  const payload = {
    ...data,
    FrontendUrl: data.FrontendUrl || (typeof window !== 'undefined' ? window.location.origin : undefined)
  }
  const res = await fetchWithAuth('/api/payments/deposit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(payload),
  })
  const unwrapped = unwrapData<any>(res)
  return {
    paymentId: String(unwrapped?.paymentId ?? unwrapped?.PaymentId ?? ''),
    transactionCode: String(unwrapped?.transactionCode ?? unwrapped?.TransactionCode ?? ''),
    paymentUrl: String(unwrapped?.paymentUrl ?? unwrapped?.PaymentUrl ?? ''),
  }
}

export async function updateProfile(data: { FullName: string; Email?: string; PhoneNumber?: string }): Promise<any> {
  const res = await fetchWithAuth('/api/auth/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return unwrapData(res)
}

export async function changePassword(data: { OldPassword: string; NewPassword: string }): Promise<any> {
  const res = await fetchWithAuth('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return unwrapData(res)
}

export async function getTiers(params?: {
  page?: number
  pageSize?: number
  isActive?: boolean
}): Promise<{ items: any[]; totalCount: number; pageNumber: number; pageSize: number; totalPages: number }> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  if (params?.isActive !== undefined) searchParams.set('IsActive', String(params.isActive))

  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/tiers${qs ? `?${qs}` : ''}`)
  const data = unwrapData<{
    items?: Record<string, unknown>[]
    Items?: Record<string, unknown>[]
    totalCount?: number
    TotalCount?: number
    pageNumber?: number
    PageNumber?: number
    pageSize?: number
    PageSize?: number
    totalPages?: number
    TotalPages?: number
  }>(res)

  const rawItems = data?.items ?? data?.Items ?? unwrapPagedItems<Record<string, unknown>>(res)
  const items = rawItems.map(normalizeTier)

  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? params?.pageSize ?? 10
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? params?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))

  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function createTier(data: {
  TierName: string
  MinPoints: number
  EarnRate: number
  Benefits?: string
}): Promise<any> {
  const payload = await fetchWithAuth('/api/tiers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = payload?.data ?? payload?.Data ?? payload
  return normalizeTier(raw)
}

export async function updateTier(id: string, data: {
  TierName: string
  MinPoints: number
  EarnRate: number
  Benefits?: string
}): Promise<any> {
  const payload = await fetchWithAuth(`/api/tiers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = payload?.data ?? payload?.Data ?? payload
  return normalizeTier(raw)
}

export async function activateTier(id: string): Promise<any> {
  return fetchWithAuth(`/api/tiers/${id}/activate`, { method: 'POST' })
}

export async function deactivateTier(id: string): Promise<any> {
  return fetchWithAuth(`/api/tiers/${id}/deactivate`, { method: 'POST' })
}

export async function getTierBenefits(tierId: string): Promise<any[]> {
  const res = await fetchWithAuth(`/api/tiers/${tierId}/benefits`, { method: 'GET' })
  const items = unwrapPagedItems<Record<string, unknown>>(res)
  return (Array.isArray(items) ? items : []).map(normalizeTierBenefit)
}

export async function createTierBenefit(tierId: string, data: {
  BenefitType: number
  BenefitValue: string
  Description?: string
}): Promise<any> {
  const payload = await fetchWithAuth(`/api/tiers/${tierId}/benefits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = payload?.data ?? payload?.Data ?? payload
  return normalizeTierBenefit(raw)
}

export async function updateTierBenefit(benefitId: string, data: {
  BenefitType: number
  BenefitValue: string
  Description?: string
}): Promise<any> {
  const payload = await fetchWithAuth(`/api/tiers/benefits/${benefitId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const raw = payload?.data ?? payload?.Data ?? payload
  return normalizeTierBenefit(raw)
}

export async function deleteTierBenefit(benefitId: string): Promise<any> {
  return fetchWithAuth(`/api/tiers/benefits/${benefitId}`, { method: 'DELETE' })
}

export async function activateTierBenefit(benefitId: string): Promise<any> {
  return fetchWithAuth(`/api/tiers/benefits/${benefitId}/activate`, { method: 'POST' })
}

export async function deactivateTierBenefit(benefitId: string): Promise<any> {
  return fetchWithAuth(`/api/tiers/benefits/${benefitId}/deactivate`, { method: 'POST' })
}

export async function getBookingQueue(params?: BookingQuery): Promise<BookingsPageResult> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  if (params?.status !== undefined) searchParams.set('Status', String(params.status))
  if (params?.fromDate) searchParams.set('FromDate', params.fromDate)
  if (params?.toDate) searchParams.set('ToDate', params.toDate)
  if (params?.search) searchParams.set('Search', params.search)
  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/bookings/queue${qs ? `?${qs}` : ''}`)
  const data = unwrapData<any>(res)
  const rawItems = data?.items ?? data?.Items ?? unwrapPagedItems<any>(res)
  const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeBooking)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? params?.pageSize ?? 50
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? params?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function registerWalkInCustomer(data: { FullName: string; PhoneNumber?: string; Email?: string }): Promise<any> {
  const res = await fetchWithAuth('/api/bookings/customers/walk-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return unwrapData(res)
}

export async function createWalkInBooking(data: {
  CustomerId: string
  SlotInventoryId: string
  Services: Array<{ ServiceCatalogItemId: string; Quantity: number }>
  ExistingVehicleId?: string
  NewVehicle?: { LicensePlate: string; VehicleType: number; Brand?: string; BrandCatalogId?: string }
  UserVoucherId?: string
  VoucherCode?: string
}): Promise<Booking> {
  const key = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
  const res = await fetchWithAuth('/api/bookings/walk-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(data),
  })
  return normalizeBooking(unwrapData<any>(res))
}

export async function updateBookingStatus(id: string, status: number): Promise<Booking> {
  const res = await fetchWithAuth(`/api/bookings/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Status: status }),
  })
  return normalizeBooking(unwrapData<any>(res))
}

export async function completeBooking(id: string): Promise<Booking> {
  const res = await fetchWithAuth(`/api/bookings/${id}/complete`, { method: 'POST' })
  return normalizeBooking(unwrapData<any>(res))
}

export async function closeBooking(id: string): Promise<Booking> {
  const res = await fetchWithAuth(`/api/bookings/${id}/close`, { method: 'POST' })
  return normalizeBooking(unwrapData<any>(res))
}

export async function createFinalPayment(data: {
  BookingId: string
  Tenders: Array<{ TenderType: number; Amount: number }>
}): Promise<void> {
  const key = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
  await fetchWithAuth('/api/payments/final', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(data),
  })
}

// Staff tạo QR VNPay tại quầy cho phần còn lại → khách quét thanh toán
export async function createCounterQr(bookingId: string): Promise<{ paymentId: string; transactionCode: string; paymentUrl: string }> {
  const key = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
  const res = await fetchWithAuth('/api/payments/counter-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ BookingId: bookingId }),
  })
  const unwrapped = unwrapData<any>(res)
  return {
    paymentId: String(unwrapped?.paymentId ?? unwrapped?.PaymentId ?? ''),
    transactionCode: String(unwrapped?.transactionCode ?? unwrapped?.TransactionCode ?? ''),
    paymentUrl: String(unwrapped?.paymentUrl ?? unwrapped?.PaymentUrl ?? ''),
  }
}

// Tra trạng thái 1 giao dịch (1=Pending 2=Completed 3=Failed 4=Cancelled)
export async function getPaymentStatus(paymentId: string): Promise<{ paymentStatus: number; amount: number; paymentType: number }> {
  const res = await fetchWithAuth(`/api/payments/${paymentId}`)
  const unwrapped = unwrapData<any>(res)
  return {
    paymentStatus: Number(unwrapped?.paymentStatus ?? unwrapped?.PaymentStatus ?? 0),
    amount: Number(unwrapped?.amount ?? unwrapped?.Amount ?? 0),
    paymentType: Number(unwrapped?.paymentType ?? unwrapped?.PaymentType ?? 0),
  }
}

export async function checkInBookingByCode(data: { CheckInQrCode?: string; BookingCode?: string }): Promise<Booking> {
  const res = await fetchWithAuth('/api/bookings/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return normalizeBooking(unwrapData<any>(res))
}

export async function lookupBookingByQr(token: string): Promise<Booking> {
  const res = await fetchWithAuth(`/api/bookings/by-qr/${encodeURIComponent(token)}`)
  return normalizeBooking(unwrapData<any>(res))
}

export async function getCustomerBookings(customerId: string, params?: BookingQuery): Promise<BookingsPageResult> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  if (params?.status !== undefined) searchParams.set('Status', String(params.status))
  if (params?.fromDate) searchParams.set('FromDate', params.fromDate)
  if (params?.toDate) searchParams.set('ToDate', params.toDate)
  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/bookings/customers/${customerId}/bookings${qs ? `?${qs}` : ''}`)
  const data = unwrapData<any>(res)
  const rawItems = data?.items ?? data?.Items ?? unwrapPagedItems<any>(res)
  const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeBooking)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? params?.pageSize ?? 5
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? params?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function addServiceLine(bookingId: string, data: { ServiceCatalogItemId: string; Quantity: number }): Promise<Booking> {
  const res = await fetchWithAuth(`/api/bookings/${bookingId}/lines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return normalizeBooking(unwrapData<any>(res))
}

export async function updateServiceLine(bookingId: string, lineId: string, data: { Quantity: number }): Promise<Booking> {
  const res = await fetchWithAuth(`/api/bookings/${bookingId}/lines/${lineId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return normalizeBooking(unwrapData<any>(res))
}

export async function removeServiceLine(bookingId: string, lineId: string): Promise<Booking> {
  const res = await fetchWithAuth(`/api/bookings/${bookingId}/lines/${lineId}`, { method: 'DELETE' })
  return normalizeBooking(unwrapData<any>(res))
}

// ─── Bookings ─────────────────────────────────────────────────────────────────


// ── Voucher ──────────────────────────────────────────────────────

export type VoucherItem = {
  voucherId: string
  voucherCode: string
  voucherType: number       // 1=System, 2=Branch, 3=Tier
  voucherTypeName: string
  discountType: number      // 1=Percentage, 2=FixedAmount
  discountTypeName: string
  discountValue: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  quantity: number
  usedCount: number
  startUtc: string
  endUtc: string
  isActive: boolean
  approvalStatus: number    // 1=Pending, 2=Approved, 3=Rejected
  branchId?: string
  branchName?: string
  createdByUserId: string
  createdByUserName: string
  approvedByUserId?: string
  approvedByUserName?: string
  approvedAtUtc?: string
  createdAtUtc: string
  requiredPoints: number
}

function normalizeVoucher(raw: any): VoucherItem {
  return {
    voucherId:          String(raw?.voucherId          ?? raw?.VoucherId          ?? ''),
    voucherCode:        String(raw?.voucherCode        ?? raw?.VoucherCode        ?? ''),
    voucherType:        Number(raw?.voucherType        ?? raw?.VoucherType        ?? 1),
    voucherTypeName:    String(raw?.voucherTypeName    ?? raw?.VoucherTypeName    ?? ''),
    discountType:       Number(raw?.discountType       ?? raw?.DiscountType       ?? 1),
    discountTypeName:   String(raw?.discountTypeName   ?? raw?.DiscountTypeName   ?? ''),
    discountValue:      Number(raw?.discountValue      ?? raw?.DiscountValue      ?? 0),
    minOrderAmount:     raw?.minOrderAmount    != null ? Number(raw.minOrderAmount)    : raw?.MinOrderAmount    != null ? Number(raw.MinOrderAmount)    : undefined,
    maxDiscountAmount:  raw?.maxDiscountAmount != null ? Number(raw.maxDiscountAmount) : raw?.MaxDiscountAmount != null ? Number(raw.MaxDiscountAmount) : undefined,
    quantity:           Number(raw?.quantity           ?? raw?.Quantity           ?? 0),
    usedCount:          Number(raw?.usedCount          ?? raw?.UsedCount          ?? 0),
    startUtc:           String(raw?.startUtc           ?? raw?.StartUtc           ?? ''),
    endUtc:             String(raw?.endUtc             ?? raw?.EndUtc             ?? ''),
    isActive:           Boolean(raw?.isActive          ?? raw?.IsActive           ?? false),
    approvalStatus:     Number(raw?.approvalStatus     ?? raw?.ApprovalStatus     ?? 1),
    branchId:           raw?.branchId      ?? raw?.BranchId      ?? undefined,
    branchName:         raw?.branchName    ?? raw?.BranchName    ?? undefined,
    createdByUserId:    String(raw?.createdByUserId    ?? raw?.CreatedByUserId    ?? ''),
    createdByUserName:  String(raw?.createdByUserName  ?? raw?.CreatedByUserName  ?? ''),
    approvedByUserId:   raw?.approvedByUserId   ?? raw?.ApprovedByUserId   ?? undefined,
    approvedByUserName: raw?.approvedByUserName ?? raw?.ApprovedByUserName ?? undefined,
    approvedAtUtc:      raw?.approvedAtUtc      ?? raw?.ApprovedAtUtc      ?? undefined,
    createdAtUtc:       String(raw?.createdAtUtc       ?? raw?.CreatedAtUtc       ?? ''),
    requiredPoints:     Number(raw?.requiredPoints     ?? raw?.RequiredPoints     ?? 0),
  }
}

export type CreateDraftVoucherRequest = {
  VoucherCode: string
  VoucherType: 1 | 2 | 3
  DiscountType: 1 | 2
  DiscountValue: number
  MinOrderAmount?: number
  MaxDiscountAmount?: number
  Quantity: number
  StartUtc: string
  EndUtc: string
  RequiredPoints?: number
}

export async function createDraftVoucher(data: CreateDraftVoucherRequest): Promise<VoucherItem> {
  const res = await fetchWithAuth('/api/vouchers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return normalizeVoucher(unwrapData<any>(res))
}

export interface UserVoucherQuery {
  page?: number
  pageSize?: number
  voucherStatus?: number
  branchId?: string
  userId?: string
}

export interface UserVoucherDto {
  userVoucherId: string
  userId: string
  voucherId: string
  voucherStatus: number
  redeemedAtUtc: string
  usedAtUtc?: string
  expiredAtUtc?: string
  voucherCode: string
  voucherType: number
  voucherTypeName: string
  discountType: number
  discountTypeName: string
  discountValue: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  title: string
  description?: string
}

export async function getMyVouchers(query?: UserVoucherQuery): Promise<{ items: UserVoucherItem[]; totalCount: number; pageNumber: number; pageSize: number; totalPages: number }> {
  const params = new URLSearchParams()
  if (query?.page) params.set('Page', String(query.page))
  if (query?.pageSize) params.set('PageSize', String(query.pageSize))
  if (query?.voucherStatus !== undefined) params.set('VoucherStatus', String(query.voucherStatus))
  if (query?.branchId) params.set('BranchId', query.branchId)
  if (query?.userId) params.set('UserId', query.userId)
  
  const qs = params.toString()
  const res = await fetchWithAuth(`/api/vouchers/my-vouchers${qs ? `?${qs}` : ''}`)
  const data = unwrapData<any>(res)
  const rawItems = data?.items ?? data?.Items ?? []
  const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeUserVoucher)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? query?.pageSize ?? 10
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? query?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function getAvailableVouchers(branchId?: string, userId?: string): Promise<any[]> {
  const params = new URLSearchParams()
  if (branchId) params.set('branchId', branchId)
  if (userId) params.set('userId', userId)
  const qs = params.toString()
  const res = await fetchWithAuth(`/api/vouchers/available${qs ? `?${qs}` : ''}`)
  const data = unwrapData<any[]>(res)
  return (Array.isArray(data) ? data : []).map(item => ({
    voucherId: item.voucherId ?? item.VoucherId,
    voucherCode: item.voucherCode ?? item.VoucherCode,
    voucherType: item.voucherType ?? item.VoucherType,
    voucherTypeName: item.voucherTypeName ?? item.VoucherTypeName,
    discountType: item.discountType ?? item.DiscountType,
    discountTypeName: item.discountTypeName ?? item.DiscountTypeName,
    discountValue: item.discountValue ?? item.DiscountValue,
    minOrderAmount: item.minOrderAmount ?? item.MinOrderAmount,
    maxDiscountAmount: item.maxDiscountAmount ?? item.MaxDiscountAmount,
    title: item.title ?? item.Title ?? item.voucherCode ?? item.VoucherCode,
    requiredPoints: item.requiredPoints ?? item.RequiredPoints ?? 0,
    branchId: item.branchId ?? item.BranchId,
    branchName: item.branchName ?? item.BranchName
  }))
}

export async function getVouchers(params?: {
  page?: number
  pageSize?: number
  approvalStatus?: number
  search?: string
  isActive?: boolean
}): Promise<{ items: VoucherItem[]; totalCount: number; pageNumber: number; pageSize: number; totalPages: number }> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('Page', String(params.page))
  if (params?.pageSize) searchParams.set('PageSize', String(params.pageSize))
  if (params?.approvalStatus !== undefined) searchParams.set('ApprovalStatus', String(params.approvalStatus))
  if (params?.search) searchParams.set('VoucherCode', params.search)
  if (params?.isActive !== undefined) searchParams.set('IsActive', String(params.isActive))
  const qs = searchParams.toString()
  const res = await fetchWithAuth(`/api/vouchers${qs ? `?${qs}` : ''}`)
  const data = unwrapData<any>(res)
  const rawItems = data?.items ?? data?.Items ?? []
  const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeVoucher)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? params?.pageSize ?? 20
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? params?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function createAdminVoucher(data: CreateDraftVoucherRequest): Promise<VoucherItem> {
  const res = await fetchWithAuth('/api/vouchers/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return normalizeVoucher(unwrapData<any>(res))
}

export async function approveVoucher(id: string): Promise<VoucherItem> {
  const res = await fetchWithAuth(`/api/vouchers/${id}/approve`, {
    method: 'POST',
  })
  return normalizeVoucher(unwrapData<any>(res))
}

export async function rejectVoucher(id: string): Promise<VoucherItem> {
  const res = await fetchWithAuth(`/api/vouchers/${id}/reject`, {
    method: 'POST',
  })
  return normalizeVoucher(unwrapData<any>(res))
}

export async function setActiveVoucher(id: string, isActive: boolean): Promise<VoucherItem> {
  const res = await fetchWithAuth(`/api/vouchers/${id}/active?isActive=${isActive}`, {
    method: 'PATCH',
  })
  return normalizeVoucher(unwrapData<any>(res))
}

export async function deleteVoucher(id: string): Promise<any> {
  return fetchWithAuth(`/api/vouchers/${id}`, {
    method: 'DELETE',
  })
}

export async function assignTierVoucher(data: { TierId: string, VoucherId: string, RequiredPoints: number }): Promise<any> {
  const res = await fetchWithAuth('/api/vouchers/tier-assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return unwrapData<any>(res)
}

export type UserVoucherItem = {
  userVoucherId: string
  userId: string
  voucherId: string
  voucherCode: string
  voucherType: number
  voucherTypeName: string
  discountType: number
  discountTypeName: string
  discountValue: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  voucherStatus: number
  voucherStatusName: string
  redeemedPoints: number
  redeemedAtUtc: string
  expiredAtUtc?: string
  usedAtUtc?: string
}

function normalizeUserVoucher(raw: any): UserVoucherItem {
  return {
    userVoucherId:     String(raw?.userVoucherId     ?? raw?.UserVoucherId     ?? ''),
    userId:            String(raw?.userId            ?? raw?.UserId            ?? ''),
    voucherId:         String(raw?.voucherId         ?? raw?.VoucherId         ?? ''),
    voucherCode:       String(raw?.voucherCode       ?? raw?.VoucherCode       ?? ''),
    voucherType:       Number(raw?.voucherType       ?? raw?.VoucherType       ?? 1),
    voucherTypeName:   String(raw?.voucherTypeName   ?? raw?.VoucherTypeName   ?? ''),
    discountType:      Number(raw?.discountType      ?? raw?.DiscountType      ?? 1),
    discountTypeName:  String(raw?.discountTypeName  ?? raw?.DiscountTypeName  ?? ''),
    discountValue:     Number(raw?.discountValue     ?? raw?.DiscountValue     ?? 0),
    minOrderAmount:    raw?.minOrderAmount    != null ? Number(raw.minOrderAmount)    : raw?.MinOrderAmount    != null ? Number(raw.MinOrderAmount)    : undefined,
    maxDiscountAmount: raw?.maxDiscountAmount != null ? Number(raw.maxDiscountAmount) : raw?.MaxDiscountAmount != null ? Number(raw.MaxDiscountAmount) : undefined,
    voucherStatus:     Number(raw?.voucherStatus     ?? raw?.VoucherStatus     ?? 1),
    voucherStatusName: String(raw?.voucherStatusName ?? raw?.VoucherStatusName ?? ''),
    redeemedPoints:    Number(raw?.redeemedPoints    ?? raw?.RedeemedPoints    ?? 0),
    redeemedAtUtc:     String(raw?.redeemedAtUtc     ?? raw?.RedeemedAtUtc     ?? ''),
    expiredAtUtc:      raw?.expiredAtUtc ?? raw?.ExpiredAtUtc ?? undefined,
    usedAtUtc:         raw?.usedAtUtc    ?? raw?.UsedAtUtc    ?? undefined,
  }
}

export type AvailableVoucherItem = {
  voucherId: string
  voucherCode: string
  voucherType: number
  voucherTypeName: string
  discountType: number
  discountTypeName: string
  discountValue: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  quantity: number
  usedCount: number
  startUtc: string
  endUtc: string
  branchId?: string
  branchName?: string
  requiredPoints: number
}

function normalizeAvailableVoucher(raw: any): AvailableVoucherItem {
  return {
    voucherId:         String(raw?.voucherId         ?? raw?.VoucherId         ?? ''),
    voucherCode:       String(raw?.voucherCode       ?? raw?.VoucherCode       ?? ''),
    voucherType:       Number(raw?.voucherType       ?? raw?.VoucherType       ?? 1),
    voucherTypeName:   String(raw?.voucherTypeName   ?? raw?.VoucherTypeName   ?? ''),
    discountType:      Number(raw?.discountType      ?? raw?.DiscountType      ?? 1),
    discountTypeName:  String(raw?.discountTypeName  ?? raw?.DiscountTypeName  ?? ''),
    discountValue:     Number(raw?.discountValue     ?? raw?.DiscountValue     ?? 0),
    minOrderAmount:    raw?.minOrderAmount    != null ? Number(raw.minOrderAmount)    : raw?.MinOrderAmount    != null ? Number(raw.MinOrderAmount)    : undefined,
    maxDiscountAmount: raw?.maxDiscountAmount != null ? Number(raw.maxDiscountAmount) : raw?.MaxDiscountAmount != null ? Number(raw.MaxDiscountAmount) : undefined,
    quantity:          Number(raw?.quantity          ?? raw?.Quantity          ?? 0),
    usedCount:         Number(raw?.usedCount          ?? raw?.UsedCount          ?? 0),
    startUtc:          String(raw?.startUtc          ?? raw?.StartUtc          ?? ''),
    endUtc:            String(raw?.endUtc            ?? raw?.EndUtc            ?? ''),
    branchId:          raw?.branchId      ?? raw?.BranchId      ?? undefined,
    branchName:        raw?.branchName    ?? raw?.BranchName    ?? undefined,
    requiredPoints:    Number(raw?.requiredPoints    ?? raw?.RequiredPoints    ?? 0),
  }
}

export async function getCustomerAvailableVouchers(branchId?: string): Promise<AvailableVoucherItem[]> {
  const query = branchId ? `?branchId=${branchId}` : ''
  const res = await fetchWithAuth(`/api/vouchers/available${query}`)
  const data = unwrapData<any>(res) ?? []
  return (Array.isArray(data) ? data : []).map(normalizeAvailableVoucher)
}

export async function redeemVoucher(voucherId: string): Promise<any> {
  const res = await fetchWithAuth('/api/vouchers/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ VoucherId: voucherId })
  })
  return unwrapData(res)
}

// ── Reports ──────────────────────────────────────────────────────
export async function getAdminDashboardStats() {
  const res = await fetchWithAuth('/api/reports/dashboard', { method: 'GET' })
  return unwrapData<any>(res)
}

export async function getManagerDashboardStats() {
  const res = await fetchWithAuth('/api/reports/branch-dashboard', { method: 'GET' })
  return unwrapData<any>(res)
}

export type ReviewPageResult = {
  items: ReviewItem[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export async function getReviews(query?: ReviewQuery): Promise<ReviewPageResult> {
  const params = new URLSearchParams()
  if (query?.page) params.set('Page', String(query.page))
  if (query?.pageSize) params.set('PageSize', String(query.pageSize))
  if (query?.rating !== undefined) params.set('Rating', String(query.rating))
  if (query?.isHidden !== undefined) params.set('IsHidden', String(query.isHidden))
  if (query?.search) params.set('Search', query.search)
  if (query?.userId) params.set('UserId', query.userId)
  if (query?.branchId) params.set('BranchId', query.branchId)
  if (query?.staffId) params.set('StaffId', query.staffId)
  if (query?.serviceCatalogItemId) params.set('ServiceCatalogItemId', query.serviceCatalogItemId)
  if (query?.reviewType !== undefined) params.set('ReviewType', String(query.reviewType))
  
  const qs = params.toString()
  const res = await fetchWithAuth(`/api/reviews${qs ? `?${qs}` : ''}`)
  const data = unwrapData<any>(res)
  const rawItems = data?.items ?? data?.Items ?? []
  const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeReview)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? query?.pageSize ?? 10
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? query?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function getReviewsForModeration(query?: ReviewQuery): Promise<ReviewPageResult> {
  const params = new URLSearchParams()
  if (query?.page) params.set('Page', String(query.page))
  if (query?.pageSize) params.set('PageSize', String(query.pageSize))
  if (query?.rating !== undefined) params.set('Rating', String(query.rating))
  if (query?.isHidden !== undefined) params.set('IsHidden', String(query.isHidden))
  if (query?.search) params.set('Search', query.search)
  if (query?.userId) params.set('UserId', query.userId)
  if (query?.branchId) params.set('BranchId', query.branchId)
  if (query?.staffId) params.set('StaffId', query.staffId)
  if (query?.serviceCatalogItemId) params.set('ServiceCatalogItemId', query.serviceCatalogItemId)
  if (query?.reviewType !== undefined) params.set('ReviewType', String(query.reviewType))
  
  const qs = params.toString()
  const res = await fetchWithAuth(`/api/reviews/moderation${qs ? `?${qs}` : ''}`)
  const data = unwrapData<any>(res)
  const rawItems = data?.items ?? data?.Items ?? []
  const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeReview)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? query?.pageSize ?? 10
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? query?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function getMyReviews(query?: ReviewQuery): Promise<ReviewPageResult> {
  const params = new URLSearchParams()
  if (query?.page) params.set('Page', String(query.page))
  if (query?.pageSize) params.set('PageSize', String(query.pageSize))
  if (query?.rating !== undefined) params.set('Rating', String(query.rating))
  if (query?.search) params.set('Search', query.search)
  if (query?.branchId) params.set('BranchId', query.branchId)
  if (query?.reviewType !== undefined) params.set('ReviewType', String(query.reviewType))
  
  const qs = params.toString()
  const res = await fetchWithAuth(`/api/reviews/my${qs ? `?${qs}` : ''}`)
  const data = unwrapData<any>(res)
  const rawItems = data?.items ?? data?.Items ?? []
  const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeReview)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  const pageSize = data?.pageSize ?? data?.PageSize ?? query?.pageSize ?? 10
  const pageNumber = data?.pageNumber ?? data?.PageNumber ?? query?.page ?? 1
  const totalPages = data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  return { items, totalCount, pageNumber, pageSize, totalPages }
}

export async function createReview(request: CreateReviewRequest): Promise<ReviewItem> {
  const res = await fetchWithAuth('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  const data = await unwrapData<any>(res)
  return normalizeReview(data)
}

export async function deleteReview(id: string): Promise<void> {
  const res = await fetchWithAuth(`/api/reviews/${id}`, {
    method: 'DELETE'
  })
  await unwrapData<any>(res)
}

export async function toggleHideReview(id: string, isHidden: boolean): Promise<ReviewItem> {
  const res = await fetchWithAuth(`/api/reviews/${id}/toggle-hide`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IsHidden: isHidden })
  })
  const data = await unwrapData<any>(res)
  return normalizeReview(data)
}

export async function getSystemStats(branchId?: string): Promise<{ averageRating: number, totalBookings: number }> {
  const query = branchId ? `?branchId=${branchId}` : ''
  const res = await fetchWithAuth(`/api/reviews/stats${query}`, { method: 'GET' })
  const data = unwrapData<any>(res)
  return {
    averageRating: Number(data?.averageRating ?? data?.AverageRating ?? 0),
    totalBookings: Number(data?.totalBookings ?? data?.TotalBookings ?? 0),
  }
}

export type BookingStatsQuery = {
  fromDate?: string
  toDate?: string
  groupBy: 1 | 2 | 3 // 1: Day, 2: Week, 3: Month
  branchId?: string
}

export type BookingStatsByPeriodDto = {
  periodStart: string
  periodLabel: string
  onlineCount: number
  onlineAmount: number
  walkInCount: number
  walkInAmount: number
  totalCount: number
  totalAmount: number
}

function normalizeBookingStats(raw: any): BookingStatsByPeriodDto {
  return {
    periodStart: raw?.periodStart ?? raw?.PeriodStart ?? '',
    periodLabel: raw?.periodLabel ?? raw?.PeriodLabel ?? '',
    onlineCount: Number(raw?.onlineCount ?? raw?.OnlineCount ?? 0),
    onlineAmount: Number(raw?.onlineAmount ?? raw?.OnlineAmount ?? 0),
    walkInCount: Number(raw?.walkInCount ?? raw?.WalkInCount ?? 0),
    walkInAmount: Number(raw?.walkInAmount ?? raw?.WalkInAmount ?? 0),
    totalCount: Number(raw?.totalCount ?? raw?.TotalCount ?? 0),
    totalAmount: Number(raw?.totalAmount ?? raw?.TotalAmount ?? 0),
  }
}

export async function getAdminBookingStats(query: BookingStatsQuery): Promise<BookingStatsByPeriodDto[]> {
  const params = new URLSearchParams()
  if (query.fromDate) params.set('FromDate', query.fromDate)
  if (query.toDate) params.set('ToDate', query.toDate)
  params.set('GroupBy', String(query.groupBy))
  if (query.branchId) params.set('BranchId', query.branchId)
  
  const qs = params.toString()
  const res = await fetchWithAuth(`/api/reports/booking-stats?${qs}`)
  const data = unwrapData<any>(res) ?? []
  return (Array.isArray(data) ? data : []).map(normalizeBookingStats)
}

export async function getManagerBookingStats(query: BookingStatsQuery): Promise<BookingStatsByPeriodDto[]> {
  const params = new URLSearchParams()
  if (query.fromDate) params.set('FromDate', query.fromDate)
  if (query.toDate) params.set('ToDate', query.toDate)
  params.set('GroupBy', String(query.groupBy))
  
  const qs = params.toString()
  const res = await fetchWithAuth(`/api/reports/branch-booking-stats?${qs}`)
  const data = unwrapData<any>(res) ?? []
  return (Array.isArray(data) ? data : []).map(normalizeBookingStats)
}

export async function getEngineTypes(params?: { page?: number, pageSize?: number, search?: string, isActive?: boolean }): Promise<{ items: VehicleCatalogItem[], totalCount: number }> {
  const search = new URLSearchParams()
  if (params?.page) search.set('Page', String(params.page))
  if (params?.pageSize) search.set('PageSize', String(params.pageSize))
  if (params?.search) search.set('Search', params.search)
  if (params?.isActive !== undefined) search.set('IsActive', String(params.isActive))
  const qs = search.toString()
  const res = await fetchWithAuth(`/api/vehicle-catalogs/engine-types${qs ? `?${qs}` : ''}`)
  const data = unwrapData<{ items?: any[], Items?: any[], totalCount?: number, TotalCount?: number }>(res)
  const items = data?.items ?? data?.Items ?? unwrapPagedItems(res)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  return { items, totalCount }
}

export async function createEngineType(data: CreateVehicleCatalogRequest): Promise<VehicleCatalogItem> {
  const payload = await fetchWithAuth('/api/vehicle-catalogs/engine-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return payload?.data ?? payload?.Data ?? payload
}

export async function updateEngineType(id: string, data: UpdateVehicleCatalogRequest): Promise<VehicleCatalogItem> {
  const payload = await fetchWithAuth(`/api/vehicle-catalogs/engine-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return payload?.data ?? payload?.Data ?? payload
}

export async function activateEngineType(id: string): Promise<any> {
  return fetchWithAuth(`/api/vehicle-catalogs/engine-types/${id}/activate`, { method: 'POST' })
}

export async function deactivateEngineType(id: string): Promise<any> {
  return fetchWithAuth(`/api/vehicle-catalogs/engine-types/${id}/deactivate`, { method: 'POST' })
}

export async function getBodyStyles(params?: { page?: number, pageSize?: number, search?: string, isActive?: boolean, vehicleType?: number }): Promise<{ items: VehicleCatalogItem[], totalCount: number }> {
  const search = new URLSearchParams()
  if (params?.page) search.set('Page', String(params.page))
  if (params?.pageSize) search.set('PageSize', String(params.pageSize))
  if (params?.search) search.set('Search', params.search)
  if (params?.isActive !== undefined) search.set('IsActive', String(params.isActive))
  if (params?.vehicleType !== undefined) search.set('VehicleType', String(params.vehicleType))
  const qs = search.toString()
  const res = await fetchWithAuth(`/api/vehicle-catalogs/body-styles${qs ? `?${qs}` : ''}`)
  const data = unwrapData<{ items?: any[], Items?: any[], totalCount?: number, TotalCount?: number }>(res)
  const items = data?.items ?? data?.Items ?? unwrapPagedItems(res)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  return { items, totalCount }
}

export async function createBodyStyle(data: CreateVehicleCatalogRequest): Promise<VehicleCatalogItem> {
  const payload = await fetchWithAuth('/api/vehicle-catalogs/body-styles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return payload?.data ?? payload?.Data ?? payload
}

export async function updateBodyStyle(id: string, data: UpdateVehicleCatalogRequest): Promise<VehicleCatalogItem> {
  const payload = await fetchWithAuth(`/api/vehicle-catalogs/body-styles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return payload?.data ?? payload?.Data ?? payload
}

export async function activateBodyStyle(id: string): Promise<any> {
  return fetchWithAuth(`/api/vehicle-catalogs/body-styles/${id}/activate`, { method: 'POST' })
}

export async function deactivateBodyStyle(id: string): Promise<any> {
  return fetchWithAuth(`/api/vehicle-catalogs/body-styles/${id}/deactivate`, { method: 'POST' })
}

export async function getVehicleBrands(params?: { page?: number, pageSize?: number, search?: string, isActive?: boolean, vehicleType?: number }): Promise<{ items: VehicleCatalogItem[], totalCount: number }> {
  const search = new URLSearchParams()
  if (params?.page) search.set('Page', String(params.page))
  if (params?.pageSize) search.set('PageSize', String(params.pageSize))
  if (params?.search) search.set('Search', params.search)
  if (params?.isActive !== undefined) search.set('IsActive', String(params.isActive))
  if (params?.vehicleType !== undefined) search.set('VehicleType', String(params.vehicleType))
  const qs = search.toString()
  const res = await fetchWithAuth(`/api/vehicle-catalogs/brands${qs ? `?${qs}` : ''}`)
  const data = unwrapData<{ items?: any[], Items?: any[], totalCount?: number, TotalCount?: number }>(res)
  const items = data?.items ?? data?.Items ?? unwrapPagedItems(res)
  const totalCount = data?.totalCount ?? data?.TotalCount ?? items.length
  return { items, totalCount }
}

export async function createVehicleBrand(data: CreateVehicleCatalogRequest): Promise<VehicleCatalogItem> {
  const payload = await fetchWithAuth('/api/vehicle-catalogs/brands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return payload?.data ?? payload?.Data ?? payload
}

export async function updateVehicleBrand(id: string, data: UpdateVehicleCatalogRequest): Promise<VehicleCatalogItem> {
  const payload = await fetchWithAuth(`/api/vehicle-catalogs/brands/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return payload?.data ?? payload?.Data ?? payload
}

export async function activateVehicleBrand(id: string): Promise<any> {
  return fetchWithAuth(`/api/vehicle-catalogs/brands/${id}/activate`, { method: 'POST' })
}

export async function deactivateVehicleBrand(id: string): Promise<any> {
  return fetchWithAuth(`/api/vehicle-catalogs/brands/${id}/deactivate`, { method: 'POST' })
}

export default {
  getHealth, login, register, googleLogin, logout, getMe, setAuthToken,
  forgotPassword, resetPassword, claimGuestAccount,
  getMyVehicles, createVehicle, updateVehicle, deleteVehicle,
  uploadVehicleImage, setPrimaryVehicleImage, deleteVehicleImage, getVehicleImages,
  getBranches, getBranchById, getMyBranch, getBranchServices,
  getUsers, activateUser, deactivateUser, deleteUser, createStaff, updateUser,
  createBranch, updateBranch, assignBranchServices, assignManager, removeManager,
  getServiceCatalog, createServiceCatalog, updateServiceCatalog, activateServiceCatalog, deactivateServiceCatalog,
  deleteBranch, getBranchStaff, assignBranchStaff, removeBranchStaff, toggleBranchService, removeBranchService,
  getSlots, getSlotById, createSlot, generateSlots, updateSlot, deleteSlot, getAvailableSlots,
  getMyLoyalty, getMyLoyaltyHistory, getUserLoyalty, getUserLoyaltyHistory, adjustPoints, getActiveTiers, lookupCustomerByPhone,
  updateProfile, changePassword,
  getBookingQuote, createBooking, getMyBookings, getBookingById, cancelBooking, createPaymentDeposit,
  getBookingQueue, registerWalkInCustomer, createWalkInBooking, updateBookingStatus, completeBooking, closeBooking, createFinalPayment, createCounterQr, getPaymentStatus, checkInBookingByCode, lookupBookingByQr,
  getCustomerBookings, addServiceLine, updateServiceLine, removeServiceLine,
  getTiers, createTier, updateTier, activateTier, deactivateTier,
  getTierBenefits, createTierBenefit, updateTierBenefit, deleteTierBenefit, activateTierBenefit, deactivateTierBenefit,
  createDraftVoucher, getVouchers, createAdminVoucher, approveVoucher, rejectVoucher, setActiveVoucher, assignTierVoucher,
  getCustomerAvailableVouchers, redeemVoucher, getMyVouchers, getAvailableVouchers,
  getAdminDashboardStats, getManagerDashboardStats, getAdminBookingStats, getManagerBookingStats,
  getReviews, getReviewsForModeration, getMyReviews, createReview, deleteReview, toggleHideReview, getSystemStats,
  getEngineTypes, createEngineType, updateEngineType, activateEngineType, deactivateEngineType,
  getBodyStyles, createBodyStyle, updateBodyStyle, activateBodyStyle, deactivateBodyStyle,
  getVehicleBrands, createVehicleBrand, updateVehicleBrand, activateVehicleBrand, deactivateVehicleBrand,
}


