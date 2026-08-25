export interface BookingLine {
  bookingLineId: string;
  serviceCatalogItemId: string;
  serviceName: string;
  unitPrice: number;
  durationMinutes: number;
  quantity: number;
  lineTotal: number;
}

export interface Booking {
  bookingId: string;
  bookingCode: string;
  checkInQrCode: string;
  bookingType: number;
  bookingStatus: number;
  userId: string;
  vehicleId: string;
  branchId: string;
  slotInventoryId: string;
  customerName?: string;
  customerPhone?: string;
  licensePlate?: string;
  vehicleType?: number;
  vehicleBrand?: string;
  slotDate?: string; // YYYY-MM-DD
  slotStartTime?: string; // HH:mm:ss or HH:mm
  slotEndTime?: string; // HH:mm:ss or HH:mm
  bookingSubtotal: number;
  bookingDiscountAmount: number;
  bookingFinalAmount: number;
  depositAmount?: number;
  earnedPoints: number;
  redeemedPoints: number;
  checkInAtUtc?: string;
  checkedInByUserId?: string;
  completedAtUtc?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  createdAtUtc: string;
  lines: BookingLine[];
  serviceSummary?: string; // từ BookingListItemDto (queue/list endpoint)
  serviceSubtotal?: number;
  vehicleSurchargeAmount?: number;
  vehicleConditionAtBooking?: string;
}

export interface BookingQuoteRequest {
  SlotInventoryId: string;
  VehicleId?: string;
  vehicleId?: string;
  UserVoucherId?: string;
  VoucherCode?: string;
  RedeemMode?: number;
  RedeemPoints?: number;
  Services: Array<{
    ServiceCatalogItemId: string;
    Quantity: number;
  }>;
}

export interface BookingQuoteDto {
  lines: BookingLine[];
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  totalDurationMinutes: number;
}

export interface CreateBookingRequest {
  VehicleId: string;
  SlotInventoryId: string;
  UserVoucherId?: string;
  VoucherCode?: string;
  RedeemMode?: number;
  RedeemPoints?: number;
  Services: Array<{
    ServiceCatalogItemId: string;
    Quantity: number;
  }>;
}

export interface BookingQuery {
  page?: number;
  pageSize?: number;
  status?: number;
  branchId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

function pick<T>(raw: Record<string, unknown>, camel: string, pascal: string): T | undefined {
  return (raw[camel] ?? raw[pascal]) as T | undefined;
}

export function normalizeBookingLine(raw: any): BookingLine {
  if (!raw) return {} as BookingLine;
  return {
    bookingLineId: String(pick(raw, 'bookingLineId', 'BookingLineId') ?? ''),
    serviceCatalogItemId: String(pick(raw, 'serviceCatalogItemId', 'ServiceCatalogItemId') ?? ''),
    serviceName: String(pick(raw, 'serviceName', 'ServiceName') ?? ''),
    unitPrice: Number(pick(raw, 'unitPrice', 'UnitPrice') ?? 0),
    durationMinutes: Number(pick(raw, 'durationMinutes', 'DurationMinutes') ?? 0),
    quantity: Number(pick(raw, 'quantity', 'Quantity') ?? 0),
    lineTotal: Number(pick(raw, 'lineTotal', 'LineTotal') ?? 0),
  };
}

export function normalizeBooking(raw: any): Booking {
  if (!raw) return {} as Booking;
  const rawLines = pick<any[]>(raw, 'lines', 'Lines') ?? [];
  return {
    bookingId: String(pick(raw, 'bookingId', 'BookingId') ?? ''),
    bookingCode: String(pick(raw, 'bookingCode', 'BookingCode') ?? ''),
    checkInQrCode: String(pick(raw, 'checkInQrCode', 'CheckInQrCode') ?? ''),
    bookingType: Number(pick(raw, 'bookingType', 'BookingType') ?? 1),
    bookingStatus: Number(pick(raw, 'bookingStatus', 'BookingStatus') ?? 1),
    userId: String(pick(raw, 'userId', 'UserId') ?? ''),
    vehicleId: String(pick(raw, 'vehicleId', 'VehicleId') ?? ''),
    branchId: String(pick(raw, 'branchId', 'BranchId') ?? ''),
    slotInventoryId: String(pick(raw, 'slotInventoryId', 'SlotInventoryId') ?? ''),
    customerName: pick(raw, 'customerName', 'CustomerName') as string | undefined,
    customerPhone: pick(raw, 'customerPhone', 'CustomerPhone') as string | undefined,
    licensePlate: pick(raw, 'licensePlate', 'LicensePlate') as string | undefined,
    vehicleType: pick(raw, 'vehicleType', 'VehicleType') as number | undefined,
    vehicleBrand: pick(raw, 'vehicleBrand', 'VehicleBrand') as string | undefined,
    slotDate: pick(raw, 'slotDate', 'SlotDate') as string | undefined,
    slotStartTime: pick(raw, 'slotStartTime', 'SlotStartTime') as string | undefined,
    slotEndTime: pick(raw, 'slotEndTime', 'SlotEndTime') as string | undefined,
    bookingSubtotal: Number(pick(raw, 'bookingSubtotal', 'BookingSubtotal') ?? 0),
    bookingDiscountAmount: Number(pick(raw, 'bookingDiscountAmount', 'BookingDiscountAmount') ?? 0),
    bookingFinalAmount: Number(pick(raw, 'bookingFinalAmount', 'BookingFinalAmount') ?? 0),
    depositAmount: pick(raw, 'depositAmount', 'DepositAmount') as number | undefined,
    earnedPoints: Number(pick(raw, 'earnedPoints', 'EarnedPoints') ?? 0),
    redeemedPoints: Number(pick(raw, 'redeemedPoints', 'RedeemedPoints') ?? 0),
    checkInAtUtc: pick(raw, 'checkInAtUtc', 'CheckInAtUtc') as string | undefined,
    checkedInByUserId: pick(raw, 'checkedInByUserId', 'CheckedInByUserId') as string | undefined,
    completedAtUtc: pick(raw, 'completedAtUtc', 'CompletedAtUtc') as string | undefined,
    assignedStaffId: pick(raw, 'assignedStaffId', 'AssignedStaffId') as string | undefined,
    assignedStaffName: pick(raw, 'assignedStaffName', 'AssignedStaffName') as string | undefined,
    createdAtUtc: String(pick(raw, 'createdAtUtc', 'CreatedAtUtc') ?? ''),
    lines: Array.isArray(rawLines) ? rawLines.map(normalizeBookingLine) : [],
    serviceSummary: pick(raw, 'serviceSummary', 'ServiceSummary') as string | undefined,
    serviceSubtotal: pick(raw, 'serviceSubtotal', 'ServiceSubtotal') as number | undefined,
    vehicleSurchargeAmount: pick(raw, 'vehicleSurchargeAmount', 'VehicleSurchargeAmount') as number | undefined,
    vehicleConditionAtBooking: pick(raw, 'vehicleConditionAtBooking', 'VehicleConditionAtBooking') as string | undefined,
  };
}
