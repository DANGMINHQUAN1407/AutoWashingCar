export interface Slot {
  slotInventoryId: string
  branchId: string
  slotDate: string // YYYY-MM-DD
  slotStartTime: string // HH:mm:ss or HH:mm
  slotEndTime: string // HH:mm:ss or HH:mm
  capacity: number
  onlineReservedCount: number
  walkInReservedCount: number
  availableCount: number
  createdAtUtc: string
}

export interface SlotQuery {
  fromDate?: string // YYYY-MM-DD
  toDate?: string // YYYY-MM-DD
  branchId?: string
  page?: number
  pageSize?: number
}

export interface CreateSlotRequest {
  slotDate: string // YYYY-MM-DD
  slotStartTime: string // HH:mm
  slotEndTime: string // HH:mm
  capacity: number
}

export interface GenerateSlotsRequest {
  fromDate: string // YYYY-MM-DD
  toDate: string // YYYY-MM-DD
  openTime: string // HH:mm
  closeTime: string // HH:mm
  slotDurationMinutes: number
  capacity: number
}

export interface UpdateSlotRequest {
  capacity: number
}

function pick<T>(raw: Record<string, unknown>, camel: string, pascal: string): T | undefined {
  return (raw[camel] ?? raw[pascal]) as T | undefined
}

export function normalizeSlot(raw: Record<string, unknown>): Slot {
  return {
    slotInventoryId: String(pick(raw, 'slotInventoryId', 'SlotInventoryId') ?? ''),
    branchId: String(pick(raw, 'branchId', 'BranchId') ?? ''),
    slotDate: String(pick(raw, 'slotDate', 'SlotDate') ?? ''),
    slotStartTime: String(pick(raw, 'slotStartTime', 'SlotStartTime') ?? ''),
    slotEndTime: String(pick(raw, 'slotEndTime', 'SlotEndTime') ?? ''),
    capacity: Number(pick(raw, 'capacity', 'Capacity') ?? 0),
    onlineReservedCount: Number(pick(raw, 'onlineReservedCount', 'OnlineReservedCount') ?? 0),
    walkInReservedCount: Number(pick(raw, 'walkInReservedCount', 'WalkInReservedCount') ?? 0),
    availableCount: Number(pick(raw, 'availableCount', 'AvailableCount') ?? 0),
    createdAtUtc: String(pick(raw, 'createdAtUtc', 'CreatedAtUtc') ?? ''),
  }
}
