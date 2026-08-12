# API Guide: Loyalty, Tier & TierBenefit

> Base URL: `http://localhost:5259/api`
> Auth: Bearer token trong header `Authorization: Bearer <token>`

---

## Mục lục

1. [Tier — Quản lý hạng thành viên](#1-tier--quản-lý-hạng-thành-viên)
2. [TierBenefit — Quyền lợi theo hạng](#2-tierbenefit--quyền-lợi-theo-hạng)
3. [Loyalty — Điểm tích lũy & hạng của customer](#3-loyalty--điểm-tích-lũy--hạng-của-customer)
4. [Voucher — Đổi điểm lấy voucher](#4-voucher--đổi-điểm-lấy-voucher)
5. [Luồng test đầy đủ](#5-luồng-test-đầy-đủ-từ-đầu-đến-cuối)

---

## 1. Tier — Quản lý hạng thành viên

### Ai dùng: Admin tạo/sửa, Customer xem

### 1.1 Tạo hạng (Admin)

```
POST /api/tiers
Authorization: Bearer <admin_token>

Body:
{
  "tierName": "Member",
  "minPoints": 0,
  "earnRate": 1.0,
  "benefits": "Hạng cơ bản"
}
```

Response `201`:
```json
{
  "success": true,
  "data": {
    "tierId": "xxx",
    "tierName": "Member",
    "minPoints": 0,
    "earnRate": 1.0,
    "benefits": "Hạng cơ bản",
    "isActive": true,
    "createdAtUtc": "2026-06-19T..."
  }
}
```

**Tạo đủ bộ hạng theo thứ tự:**
```
Member   → minPoints: 0,     earnRate: 1.0
Silver   → minPoints: 1000,  earnRate: 1.5
Gold     → minPoints: 5000,  earnRate: 2.0
Platinum → minPoints: 15000, earnRate: 3.0
```

### 1.2 Xem danh sách hạng active (Public — không cần token)

```
GET /api/tiers/active
```

Response `200`: mảng tier sắp xếp theo minPoints tăng dần.

### 1.3 Xem danh sách hạng phân trang (Admin)

```
GET /api/tiers?page=1&pageSize=10&isActive=true
Authorization: Bearer <admin_token>
```

### 1.4 Cập nhật hạng (Admin)

```
PUT /api/tiers/{tierId}
Authorization: Bearer <admin_token>

Body:
{
  "tierName": "Silver",
  "minPoints": 1000,
  "earnRate": 1.5,
  "benefits": "Giảm 5% + đặt trước 7 ngày"
}
```

### 1.5 Bật/Tắt hạng (Admin)

```
POST /api/tiers/{tierId}/deactivate
POST /api/tiers/{tierId}/activate
Authorization: Bearer <admin_token>
```

> ⚠ Không thể tắt hạng đang có thành viên → trả 409

---

## 2. TierBenefit — Quyền lợi theo hạng

### Ai dùng: Admin config, Customer xem

### BenefitType enum:
| Value | Tên | BenefitValue ví dụ |
|-------|-----|---------------------|
| 1 | Giảm giá % | `"10"` → giảm 10% |
| 2 | Đặt trước (ngày) | `"7"` → đặt trước 7 ngày |
| 3 | Dịch vụ miễn phí | `"Hút bụi"` |
| 4 | Hỗ trợ ưu tiên | `"true"` |
| 5 | Thưởng điểm thêm % | `"20"` → thêm 20% điểm |

### 2.1 Thêm quyền lợi cho hạng (Admin)

```
POST /api/tiers/{tierId}/benefits
Authorization: Bearer <admin_token>

Body:
{
  "benefitType": 1,
  "benefitValue": "10",
  "description": "Giảm 10% tổng hóa đơn"
}
```

Response `200`:
```json
{
  "success": true,
  "data": {
    "tierBenefitId": "xxx",
    "tierId": "xxx",
    "benefitType": 1,
    "benefitTypeName": "Giảm giá %",
    "benefitValue": "10",
    "description": "Giảm 10% tổng hóa đơn",
    "isActive": true,
    "createdAtUtc": "..."
  }
}
```

> ⚠ Mỗi hạng chỉ có 1 benefit mỗi loại. Tạo trùng type → 409

**Config ví dụ cho từng hạng:**

```
Member:
  - AdvanceBookingDays = "3"     (đặt trước 3 ngày)

Silver:
  - DiscountPercent = "5"        (giảm 5%)
  - AdvanceBookingDays = "7"     (đặt trước 7 ngày)
  - BonusPointPercent = "10"     (thêm 10% điểm)

Gold:
  - DiscountPercent = "10"       (giảm 10%)
  - AdvanceBookingDays = "14"    (đặt trước 14 ngày)
  - FreeService = "Hút bụi"     (hút bụi miễn phí)
  - BonusPointPercent = "20"     (thêm 20% điểm)
  - PrioritySupport = "true"    (hỗ trợ ưu tiên)
```

### 2.2 Xem quyền lợi của 1 hạng (Public)

```
GET /api/tiers/{tierId}/benefits
```

Response `200`: mảng benefits sắp theo benefitType.

### 2.3 Sửa quyền lợi (Admin)

```
PUT /api/tiers/benefits/{benefitId}
Authorization: Bearer <admin_token>

Body:
{
  "benefitType": 1,
  "benefitValue": "15",
  "description": "Nâng lên 15%"
}
```

### 2.4 Tắt/Bật quyền lợi (Admin)

```
POST /api/tiers/benefits/{benefitId}/deactivate
POST /api/tiers/benefits/{benefitId}/activate
Authorization: Bearer <admin_token>
```

### 2.5 Xóa quyền lợi (Admin)

```
DELETE /api/tiers/benefits/{benefitId}
Authorization: Bearer <admin_token>
```

---

## 3. Loyalty — Điểm tích lũy & hạng của customer

### 3.1 Customer xem hạng + điểm của mình

```
GET /api/loyalty/me
Authorization: Bearer <customer_token>
```

Response `200`:
```json
{
  "success": true,
  "data": {
    "loyaltyAccountId": "xxx",
    "userId": "xxx",
    "currentPoints": 2300,
    "lifetimePoints": 6000,
    "tier": {
      "tierId": "xxx",
      "tierName": "Gold",
      "minPoints": 5000,
      "earnRate": 2.0,
      "benefits": "Giảm 10%, đặt trước 14 ngày"
    },
    "nextTier": {
      "tierId": "xxx",
      "tierName": "Platinum",
      "minPoints": 15000,
      "earnRate": 3.0,
      "benefits": null
    },
    "pointsToNextTier": 9000,
    "updatedAtUtc": "..."
  }
}
```

> Lần đầu gọi → tự tạo account với hạng Member (0 điểm).
> `pointsToNextTier = nextTier.minPoints - lifetimePoints`
> Nếu đã ở hạng cao nhất → `nextTier = null`, `pointsToNextTier = null`

### 3.2 Customer xem lịch sử điểm

```
GET /api/loyalty/me/history?page=1&pageSize=10&entryType=4
Authorization: Bearer <customer_token>
```

`entryType` filter (optional): 1=Tích điểm, 2=Đổi điểm, 3=Hết hạn, 4=Điều chỉnh

Response `200`:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "loyaltyLedgerEntryId": "xxx",
        "entryType": 4,
        "entryTypeName": "Điều chỉnh",
        "points": 500,
        "balanceAfter": 2300,
        "description": "Bù lỗi dịch vụ chậm",
        "bookingId": null,
        "createdAtUtc": "..."
      }
    ],
    "totalCount": 1,
    "pageNumber": 1,
    "pageSize": 10
  }
}
```

### 3.3 Admin/Manager xem loyalty của 1 user

```
GET /api/loyalty/users/{userId}
Authorization: Bearer <admin_or_manager_token>
```

### 3.4 Admin/Manager xem lịch sử điểm của user

```
GET /api/loyalty/users/{userId}/history?page=1&pageSize=10
Authorization: Bearer <admin_or_manager_token>
```

### 3.5 Manager điều chỉnh điểm (cộng thưởng / trừ phạt)

```
POST /api/loyalty/adjust
Authorization: Bearer <manager_token>

Body:
{
  "userId": "customer-id-here",
  "points": 500,
  "description": "Bù lỗi dịch vụ chậm"
}
```

> ⚠ Manager chỉ adjust được customer có booking tại chi nhánh mình
> `points > 0` → cộng CurrentPoints + LifetimePoints (thưởng)
> `points < 0` → chỉ trừ CurrentPoints, LifetimePoints không giảm (không tụt hạng)
> `points = 0` → lỗi 400

---

## 4. Voucher — Đổi điểm lấy voucher

### 4.1 Admin tạo voucher

```
POST /api/vouchers
Authorization: Bearer <admin_token>

Body:
{
  "voucherCode": "GIAM50K",
  "voucherType": 2,
  "discountValue": 50000,
  "minOrderAmount": 200000,
  "maxDiscountAmount": null,
  "quantity": 100,
  "startUtc": "2026-06-01T00:00:00Z",
  "endUtc": "2026-12-31T23:59:59Z",
  "branchId": null
}
```

`voucherType`: 1=Giảm theo %, 2=Giảm cố định
`branchId`: null=toàn hệ thống, có giá trị=chỉ áp dụng tại chi nhánh đó

### 4.2 Admin duyệt voucher

```
PATCH /api/vouchers/{voucherId}/approve
Authorization: Bearer <admin_token>

Body:
{
  "approvalStatus": 2
}
```

`approvalStatus`: 2=Duyệt, 3=Từ chối

### 4.3 Admin gán voucher cho tier

```
POST /api/vouchers/tier-assignments
Authorization: Bearer <admin_token>

Body:
{
  "tierId": "gold-tier-id",
  "voucherId": "voucher-id",
  "requiredPoints": 500
}
```

> Hạng Gold cần 500 điểm để đổi voucher này.
> Có thể gán cùng voucher cho nhiều tier với requiredPoints khác nhau:
> - Silver: 1000 điểm
> - Gold: 500 điểm (hạng cao trả ít hơn)

### 4.4 Customer xem voucher có thể đổi

```
GET /api/vouchers/available
Authorization: Bearer <customer_token>
```

> Trả về voucher phù hợp với hạng hiện tại, còn hạn, còn số lượng, đã duyệt.

### 4.5 Customer đổi điểm lấy voucher

```
POST /api/vouchers/redeem
Authorization: Bearer <customer_token>

Body:
{
  "voucherId": "voucher-id"
}
```

Response `200`:
```json
{
  "success": true,
  "data": {
    "userVoucherId": "xxx",
    "voucherCode": "GIAM50K",
    "voucherType": 2,
    "voucherTypeName": "Giảm cố định",
    "discountValue": 50000,
    "voucherStatus": 1,
    "voucherStatusName": "Đã đổi",
    "redeemedPoints": 500,
    "redeemedAtUtc": "..."
  }
}
```

> Trừ CurrentPoints, KHÔNG trừ LifetimePoints → không tụt hạng
> Lỗi nếu: không đủ điểm (400), đã đổi rồi (409), voucher hết (400), sai tier (403)

### 4.6 Customer xem voucher đã đổi

```
GET /api/vouchers/my-vouchers?page=1&pageSize=10&voucherStatus=1
Authorization: Bearer <customer_token>
```

`voucherStatus` filter: 1=Đã đổi, 2=Đã dùng, 3=Hết hạn, 4=Đã thu hồi

---

## 5. Luồng test đầy đủ từ đầu đến cuối

### Bước 1: Admin tạo 4 hạng

```
POST /api/tiers  → { "tierName": "Member",   "minPoints": 0,     "earnRate": 1.0 }
POST /api/tiers  → { "tierName": "Silver",   "minPoints": 1000,  "earnRate": 1.5 }
POST /api/tiers  → { "tierName": "Gold",     "minPoints": 5000,  "earnRate": 2.0 }
POST /api/tiers  → { "tierName": "Platinum", "minPoints": 15000, "earnRate": 3.0 }
```

> Lưu lại tierId của từng hạng

### Bước 2: Admin config quyền lợi cho từng hạng

```
POST /api/tiers/{memberId}/benefits   → { "benefitType": 2, "benefitValue": "3" }
POST /api/tiers/{silverId}/benefits   → { "benefitType": 1, "benefitValue": "5" }
POST /api/tiers/{silverId}/benefits   → { "benefitType": 2, "benefitValue": "7" }
POST /api/tiers/{goldId}/benefits     → { "benefitType": 1, "benefitValue": "10" }
POST /api/tiers/{goldId}/benefits     → { "benefitType": 2, "benefitValue": "14" }
POST /api/tiers/{goldId}/benefits     → { "benefitType": 5, "benefitValue": "20" }
```

### Bước 3: Kiểm tra bảng hạng (Public)

```
GET /api/tiers/active
→ Kỳ vọng: 4 hạng, sắp theo minPoints

GET /api/tiers/{goldId}/benefits
→ Kỳ vọng: 3 benefits (DiscountPercent, AdvanceBookingDays, BonusPointPercent)
```

### Bước 4: Customer xem loyalty lần đầu

```
GET /api/loyalty/me
→ Kỳ vọng: tự tạo account, tier="Member", currentPoints=0, nextTier="Silver", pointsToNextTier=1000
```

### Bước 5: Manager cộng điểm cho customer

```
POST /api/loyalty/adjust
→ { "userId": "<customerId>", "points": 500, "description": "Thưởng khách mới" }

→ Kỳ vọng: currentPoints=500, lifetimePoints=500, tier vẫn "Member"
```

### Bước 6: Customer kiểm tra lại

```
GET /api/loyalty/me
→ currentPoints=500, lifetimePoints=500, tier="Member", pointsToNextTier=500

GET /api/loyalty/me/history
→ 1 entry: entryType=4 (Điều chỉnh), points=500
```

### Bước 7: Manager cộng thêm để lên Silver

```
POST /api/loyalty/adjust
→ { "userId": "<customerId>", "points": 600 }

GET /api/loyalty/me
→ currentPoints=1100, lifetimePoints=1100, tier="Silver", nextTier="Gold", pointsToNextTier=3900
```

### Bước 8: Admin tạo voucher + duyệt + gán tier

```
POST /api/vouchers → tạo voucher "GIAM30K" (fixedAmount=30000, quantity=50)
PATCH /api/vouchers/{voucherId}/approve → { "approvalStatus": 2 }
POST /api/vouchers/tier-assignments → { "tierId": silverId, "voucherId": vId, "requiredPoints": 300 }
```

### Bước 9: Customer đổi điểm lấy voucher

```
GET /api/vouchers/available
→ Kỳ vọng: thấy voucher "GIAM30K" vì đang Silver

POST /api/vouchers/redeem → { "voucherId": "<voucherId>" }
→ Kỳ vọng: currentPoints giảm 300 (1100→800), tạo UserVoucher

GET /api/loyalty/me
→ currentPoints=800, lifetimePoints=1100 (KHÔNG giảm), tier vẫn "Silver"

GET /api/loyalty/me/history
→ 3 entries: Điều chỉnh +500, Điều chỉnh +600, Đổi điểm -300

GET /api/vouchers/my-vouchers
→ 1 voucher: status="Đã đổi", redeemedPoints=300
```

### Bước 10: Test lỗi

```
POST /api/vouchers/redeem → cùng voucherId
→ Kỳ vọng: 409 "Bạn đã đổi voucher này rồi"

POST /api/loyalty/adjust → { "points": -900 }
→ Kỳ vọng: 400 "Không đủ điểm để trừ" (chỉ có 800)

POST /api/loyalty/adjust → { "points": 0 }
→ Kỳ vọng: 400 "Số điểm điều chỉnh không được bằng 0"

POST /api/tiers/{memberId}/benefits → { "benefitType": 2, "benefitValue": "5" }
→ Kỳ vọng: 409 nếu Member đã có benefit type 2
```

---

## Error codes tham khảo

| HTTP | Ý nghĩa |
|------|---------|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 400 | Dữ liệu không hợp lệ (thiếu field, sai logic) |
| 401 | Chưa đăng nhập (thiếu/sai token) |
| 403 | Không có quyền (sai role hoặc không thuộc branch) |
| 404 | Không tìm thấy resource |
| 409 | Conflict (trùng tên, trùng mốc điểm, đã đổi voucher) |

Response lỗi format:
```json
{
  "success": false,
  "error": "Mô tả lỗi bằng tiếng Việt"
}
```
