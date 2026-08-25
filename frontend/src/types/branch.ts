export interface Branch {
  branchId: string
  branchCode: string
  name: string
  address: string
  city: string
  phone: string
  email?: string
  latitude?: number
  longitude?: number
  openTime?: string
  closeTime?: string
  managerId?: string
  managerName?: string
  isActive: boolean
}

export interface BranchService {
  branchServiceId: string
  branchId: string
  serviceId: string
  serviceName: string
  description: string
  basePrice: number
  durationMinutes: number
  vehicleType?: number
  vehicleTypeName?: string
  servicePackageType?: number
  servicePackageTypeName?: string
  isActive: boolean
}

function pick<T>(raw: Record<string, unknown>, camel: string, pascal: string): T | undefined {
  return (raw[camel] ?? raw[pascal]) as T | undefined
}

export function normalizeBranch(raw: Record<string, unknown>): Branch {
  return {
    branchId: String(pick(raw, 'branchId', 'BranchId') ?? ''),
    branchCode: String(pick(raw, 'branchCode', 'BranchCode') ?? ''),
    name: String(pick(raw, 'name', 'Name') ?? ''),
    address: String(pick(raw, 'address', 'Address') ?? ''),
    city: String(pick(raw, 'city', 'City') ?? ''),
    phone: String(pick(raw, 'phone', 'Phone') ?? ''),
    email: pick(raw, 'email', 'Email') as string | undefined,
    latitude: pick(raw, 'latitude', 'Latitude') as number | undefined,
    longitude: pick(raw, 'longitude', 'Longitude') as number | undefined,
    openTime: pick(raw, 'openTime', 'OpenTime') as string | undefined,
    closeTime: pick(raw, 'closeTime', 'CloseTime') as string | undefined,
    managerId: pick(raw, 'managerId', 'ManagerId') as string | undefined,
    managerName: pick(raw, 'managerName', 'ManagerName') as string | undefined,
    isActive: Boolean(pick(raw, 'isActive', 'IsActive') ?? true),
  }
}

export function normalizeBranchService(raw: Record<string, unknown>): BranchService {
  const serviceCatalogItemId = pick(raw, 'serviceCatalogItemId', 'ServiceCatalogItemId') as string | undefined
  const packageTypeRaw = pick(raw, 'servicePackageType', 'ServicePackageType')
  const packageTypeNameRaw = pick(raw, 'servicePackageTypeName', 'ServicePackageTypeName')
  const vehicleTypeRaw = pick(raw, 'vehicleType', 'VehicleType')
  const vehicleTypeNameRaw = pick(raw, 'vehicleTypeName', 'VehicleTypeName')
  return {
    branchServiceId: String(pick(raw, 'branchServiceId', 'BranchServiceId') ?? serviceCatalogItemId ?? ''),
    branchId: String(pick(raw, 'branchId', 'BranchId') ?? ''),
    serviceId: String(pick(raw, 'serviceId', 'ServiceId') ?? serviceCatalogItemId ?? ''),
    serviceName: String(pick(raw, 'serviceName', 'ServiceName') ?? ''),
    description: String(pick(raw, 'description', 'Description') ?? ''),
    basePrice: Number(pick(raw, 'basePrice', 'BasePrice') ?? 0),
    durationMinutes: Number(pick(raw, 'durationMinutes', 'DurationMinutes') ?? 0),
    vehicleType: vehicleTypeRaw !== undefined && vehicleTypeRaw !== null ? Number(vehicleTypeRaw) : undefined,
    vehicleTypeName: vehicleTypeNameRaw ? String(vehicleTypeNameRaw) : undefined,
    servicePackageType: packageTypeRaw !== undefined && packageTypeRaw !== null ? Number(packageTypeRaw) : undefined,
    servicePackageTypeName: packageTypeNameRaw ? String(packageTypeNameRaw) : undefined,
    isActive: Boolean(pick(raw, 'isActive', 'IsActive') ?? true),
  }
}
