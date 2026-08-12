# Contribution Summary

| Field | Details |
|---|---|
| **Project Name** | WashingCar — Car Wash Booking & Management System |
| **Course** | SWP391 — Software Development Project, Summer 2026 |
| **Institution** | FPT University |
| **Group** | Nhóm 7 |
| **Report Date** | July 2026 |
| **Repository** | WashingCar (branch: `dev`) |

## 1. Team Members

| # | Full Name | Student ID | Role | Primary Responsibility |
|---|---|---|---|---|
| 1 | Huỳnh Quang Trí | SE184859 | Team Lead & Backend Lead | Auth (JWT, Google login), Admin/Branch/Vehicle/ServiceCatalog/Slot/Loyalty/Tier/Voucher backend modules, DB schema & migrations, PR merges & release management |
| 2 | Nguyễn Đăng Khoa | SE184762 | Frontend Lead & UI/UX | Landing page animation, design system, auth pages, admin/manager/customer portal UI, booking wizard, voucher/loyalty/tier/branch management frontend |
| 3 | Nguyễn Chi Nghi | SE184780 | Voucher & Review/Feedback Feature Lead | Branch-scoped voucher rules, Excel import for vouchers, Rating & Feedback feature, role-based permissions |
| 4 | Trần Tuấn Anh | SE184743 | Payment & Staff Operations Lead | VNPay payment integration, Idempotency-Key, booking QR flow, staff dashboard & operations UI, email notification |
| 5 | Nguyễn Thanh Tùng | SE180273 | Customer Features Lead | Frontend scaffold init, customer voucher redemption (BE + FE), My Vehicles CRUD, customer booking UI, profile & homepage |

## 2. Contribution Summary

The following table summarizes each member's contribution based on Git commit history (`git log main..HEAD --no-merges`), counting only substantive (non-merge) commits on the `dev` branch. Total: **138 commits**.

| Member | Commits | Share (%) | Main Areas |
|---|---|---|---|
| Huỳnh Quang Trí | 38 | 28% | Auth system (JWT/Google/reset password), Admin user management, Loyalty/Tier/Voucher/Booking backend, Branch/Vehicle/ServiceCatalog/Slot management, CORS, DB schema & EF migrations, error-message centralization, code-review bug fixes, PR integration lead |
| Nguyễn Đăng Khoa | 37 | 27% | Landing page (cinematic Canvas water-splash intro, glassmorphic design system), auth pages (login/signup/Google OAuth/reset password), admin user management UI, branch management UI with interactive map & geocoding, manager slot config UI, membership tier management, customer booking wizard, voucher management (full-stack UI), customer loyalty program UI, admin dashboard & reporting, frontend API service layer, Header/Footer layout |
| Nguyễn Chi Nghi | 28 | 20% | Voucher management (branch-based filtering, tier-based rules, discount value/split handling, Excel bulk import, admin activate/deactivate), Rating & Feedback feature (with branch identification and role-based review permissions), staff voucher list & staff profile, booking/voucher data model sync with database |
| Trần Tuấn Anh | 18 | 13% | VNPay sandbox payment integration & payment bug fixes, Idempotency-Key middleware, booking QR scan (html5-qrcode), walk-in slot booking UI sync, Staff Dashboard & Staff Operations UI, email notification on booking, earn-point rate config, Customer Controller cleanup, service deletion flow |
| Nguyễn Thanh Tùng | 17 | 12% | Frontend scaffold initialization, loyalty voucher management service & repository (BE, tiered redemption logic), branch-scoped voucher distribution (BE), customer voucher redemption & status filtering (FE + BE), My Vehicles feature (CRUD), customer booking UI & slot linkage, session URL handling (BE), profile page, homepage, service catalog browsing, register-form validation |
| **Total** | **138** | **100%** | *(Merge/PR-integration commits excluded from count)* |

## 3. Individual Contribution Detail

### 3.1 Huỳnh Quang Trí (SE184859) — 28% | 38 commits

**Code & Feature Development**
- Implemented the authentication system: JWT issuance, repositories, services, middleware, `EmailService`
- Added Google Login for all roles and link-based password reset flow
- Added `GetProfile` and `UpdateProfile` endpoints in `AuthController`
- Implemented Admin user management: soft delete, activate/deactivate, list/filter users
- Built Loyalty, Tier, TierBenefit and Voucher backend modules, including point redemption (1 point = 1 VND, mode 0/1/2) and auto-created loyalty accounts on register/Google login
- Added `BranchId` to Voucher entity, `VoucherType` and `VoucherApprovalStatus` enums
- Implemented Branch management: CRUD, manager/staff assignment, branch-service allocation, auto-generated `BranchCode` (BR-00x), removed `IsDeleted` field with migration
- Implemented Vehicle management (CRUD + vehicle-type listing)
- Implemented Service Catalog management (CRUD + pagination, opened public GET, added Admin role to management)
- Implemented Slot management for managers to configure booking slots, plus integration tests for both Slot and Branch modules
- Made `PhoneNumber` optional with migration
- Added CORS policy with configurable allowed origins
- Added `claim guest account` endpoint for walk-in customers
- Fixed `TenderAllocation` for VNPay online payments
- Fixed `User.BranchId` when assigning/removing manager
- Fixed 8 bugs found during a full-project code review
- Centralized BLL error messages and added DTO validation; refactored `[.. ]` spread syntax to `.ToList()`
- Fixed `DROP INDEX` vs `DROP CONSTRAINT` migration issue for `UQ_SlotInventory_DateTime`

**Documentation & Repository Management**
- Authored API guide docs for Loyalty/Tier/TierBenefit/Voucher
- Maintained `WashingCar.sql` schema exports across EF migrations (multiple updates)
- Added XML doc comments to Branch endpoints
- Owned pull-request merges into `dev`/`main` (57 merge commits), acting as release/integration lead

---

### 3.2 Nguyễn Đăng Khoa (SE184762) — 27% | 37 commits

**Code & Feature Development**
- Initialized login/logout/homepage/register pages and manager dashboard
- Implemented the public landing page: cinematic car-wash intro (Canvas 60fps water-splash particle system, motion-blur jets, glass raindrops, mist trails, foam waves, spotlights, dirty-car wipe, supercar reveal with spinning wheels/headlights/sparkles, intro.mp4 integration with frozen last frame)
- Refactored global design tokens/theme (Indigo/Sky color scheme, glassmorphism, responsive light-mode overrides)
- Implemented premium user management UI (glassmorphic filters, skeletons, full API integration)
- Built authentication pages: login, signup, password recovery, Google OAuth
- Built admin branch management page with interactive map and geocoding features
- Built branch management UI (branches list, branch deleted UI, deactivate branch)
- Built reset password UI
- Built manager branch and service management pages
- Implemented manager slot configuration UI (`xong slot manager`)
- Built membership tier management system (admin pages + API services)
- Implemented customer booking management system with multi-step wizard and voucher integration
- Built full-stack voucher management system: creation, approval, import, loyalty-tier assignments, discount types, required loyalty points
- Implemented customer loyalty program UI (tier tracking, history ledger, comprehensive management)
- Added customer bookings page and booking data type definitions
- Built admin dashboard and backend reporting services for system-wide performance monitoring
- Implemented frontend API service layer and core dashboard pages for customer and manager portals
- Implemented Header and Footer base layout components
- Fixed backend bug in branch/service management, fixed `WaterSplashIntro` canvas and `ManagerDashboard` undefined branches
- Fixed video-to-homepage transition (z-index, slow wrapper translation, spotlight fade-out)

---

### 3.3 Nguyễn Chi Nghi (SE184780) — 20% | 28 commits

**Code & Feature Development**
- Implemented the voucher feature: branch-scoped filtering, tier-based rules, discount value/split file handling, voucher–booking connection
- Built Excel import for staff to bulk-create vouchers
- Implemented admin activate/deactivate vouchers across all branches
- Updated voucher management role permissions (editing permissions per role)
- Improved filtering by branch and voucher by tier
- Updated voucher to sync with Loyalty tier
- Added the Rating & Feedback feature, including branch identification and role-based review permissions
- Iterated Rating & Feedback feature across multiple updates (UI, permission handling, homepage update)
- Implemented staff voucher list and staff profile updates
- Updated booking data to match database schema changes

---

### 3.4 Trần Tuấn Anh (SE184743) — 13% | 18 commits

**Code & Feature Development**
- Updated the payment module (VNPay integration)
- Fixed payment processing errors (HTTP 400 fix, VNPay sandbox)
- Implemented Idempotency-Key handling to prevent duplicate booking/payment submissions
- Added booking QR flow (QR scan via html5-qrcode)
- Added booking info to email notification on booking creation
- Added configurable earn-point rate and mail notification system
- Built Staff Dashboard and Staff Operations screens; general staff UI improvements (multiple iterations)
- Synced walk-in slot booking UI
- Removed the redundant Customer Controller
- Added service deletion and improved service info display
- Updated the Booking feature (QR, flow, UI)

---

### 3.5 Nguyễn Thanh Tùng (SE180273) — 12% | 17 commits

**Code & Feature Development**
- Initialized the frontend scaffold for the project
- Implemented the loyalty voucher management service and repository (backend, tiered redemption logic)
- Implemented branch-scoped voucher distribution (backend)
- Built the customer voucher system: redemption, viewing, and status filtering (frontend + backend repository)
- Implemented My Vehicles feature (CRUD) and vehicle update flow
- Built the guest/walk-in customer update flow (backend)
- Built customer-facing screens: homepage, profile, service catalog browsing
- Built customer booking UI: slot linkage, dashboard button integration, UI localization (English), session URL saving in backend
- Added register-form validation

---

## 4. Methodology & Notes

### 4.1 How Contribution Was Measured
The contribution split was derived from the following sources, in order of weight:
- **Git log** — non-merge commit count per author on the `dev` branch (`git log main..HEAD --no-merges`), verified per author email to consolidate multiple git identities
- **Feature ownership** — which member created and owned each functional module (backend service, controller, or frontend page)
- **Documentation output** — API guides, SQL schema exports authored

### 4.2 What Was Excluded
The following were excluded from the substantive commit count:
- Merge commits (PR merges into `dev`/`main`)
- "Merge branch dev into feature-branch" sync commits within personal feature branches

> Note: Huỳnh Quang Trí additionally authored 57 of the repository's merge commits (integrating teammates' feature branches into `dev`/`main`), reflecting the Team Lead/release-management responsibility on top of the 38 feature commits counted above.
