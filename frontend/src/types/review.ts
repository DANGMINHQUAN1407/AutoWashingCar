export interface ReviewItem {
  reviewId: string
  userId: string
  userFullName: string
  bookingId: string
  branchId?: string
  branchName?: string
  rating: number
  comment?: string
  isHidden: boolean
  createdAtUtc: string
  staffId?: string
  staffFullName?: string
  serviceCatalogItemId?: string
  serviceName?: string
  reviewType: number
}

export interface ReviewQuery {
  page?: number
  pageSize?: number
  rating?: number
  isHidden?: boolean
  search?: string
  userId?: string
  branchId?: string
  staffId?: string
  serviceCatalogItemId?: string
  reviewType?: number
}

export interface CreateReviewRequest {
  rating: number
  comment?: string
  bookingId: string
  reviewType: number
}

function pick<T>(raw: Record<string, unknown>, camel: string, pascal: string): T | undefined {
  return (raw[camel] ?? raw[pascal]) as T | undefined
}

export function normalizeReview(raw: Record<string, unknown>): ReviewItem {
  return {
    reviewId: String(pick(raw, 'reviewId', 'ReviewId') ?? ''),
    userId: String(pick(raw, 'userId', 'UserId') ?? ''),
    userFullName: String(pick(raw, 'userFullName', 'UserFullName') ?? ''),
    bookingId: String(pick(raw, 'bookingId', 'BookingId') ?? ''),
    branchId: pick(raw, 'branchId', 'BranchId') as string | undefined,
    branchName: pick(raw, 'branchName', 'BranchName') as string | undefined,
    rating: Number(pick(raw, 'rating', 'Rating') ?? 0),
    comment: pick(raw, 'comment', 'Comment') as string | undefined,
    isHidden: Boolean(pick(raw, 'isHidden', 'IsHidden') ?? false),
    createdAtUtc: String(pick(raw, 'createdAtUtc', 'CreatedAtUtc') ?? ''),
    staffId: pick(raw, 'staffId', 'StaffId') as string | undefined,
    staffFullName: pick(raw, 'staffFullName', 'StaffFullName') as string | undefined,
    serviceCatalogItemId: pick(raw, 'serviceCatalogItemId', 'ServiceCatalogItemId') as string | undefined,
    serviceName: pick(raw, 'serviceName', 'ServiceName') as string | undefined,
    reviewType: Number(pick(raw, 'reviewType', 'ReviewType') ?? 1),
  }
}
