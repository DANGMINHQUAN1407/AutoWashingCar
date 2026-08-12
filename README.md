# 🚗 AutoWashPro — Hệ Thống Đặt Lịch & Quản Lý Rửa Xe Tự Động

**AutoWashPro** (AutoWashingCar) là một ứng dụng web hiện đại giúp khách hàng dễ dàng đặt lịch chăm sóc xe trực tuyến, đồng thời cung cấp giải pháp quản trị toàn diện cho các chi nhánh rửa xe tự động, bao gồm quản lý nhân sự, dịch vụ, doanh thu và chương trình khách hàng thân thiết.

---

## 🌟 Tính Năng Nổi Bật

### 👤 Khách Hàng (Customer Portal)
* **Đặt lịch nhanh chóng (Booking Flow):** Chọn chi nhánh, dịch vụ (Rửa xe cơ bản, cao cấp, vệ sinh nội thất...), chọn xe và khung giờ phù hợp.
* **Quản lý phương tiện:** Lưu trữ thông tin biển số xe, loại xe để đặt lịch nhanh hơn trong các lần sau.
* **Khách hàng thân thiết (Loyalty Program):** Tích điểm sau mỗi lần rửa xe, thăng hạng thành viên (Đồng, Bạc, Vàng) để nhận ưu đãi giảm giá và đặc quyền đặt lịch trước.
* **Quản lý Voucher:** Đổi điểm tích lũy lấy mã giảm giá và áp dụng trực tiếp khi đặt lịch.
* **Đánh giá dịch vụ:** Phản hồi, đánh giá chất lượng dịch vụ và nhân viên sau khi hoàn thành đơn đặt lịch.

### 👥 Nhân Viên (Staff Portal)
* **Tiếp nhận xe (Check-in):** Xác nhận thông tin xe và dịch vụ khi khách hàng đến chi nhánh.
* **Theo dõi công việc:** Cập nhật trạng thái rửa xe theo thời gian thực (Đang rửa, Đã hoàn thành).
* **Quản lý thanh toán:** Tiếp nhận thanh toán tiền mặt hoặc quét mã QR.

### 🏢 Quản Lý Chi Nhánh (Manager Portal)
* **Quản lý lịch hẹn:** Theo dõi danh sách đặt lịch của chi nhánh mình quản lý theo ngày/tuần.
* **Quản lý nhân viên:** Phân công công việc cho nhân viên tại chi nhánh.
* **Quản lý dịch vụ & slot:** Bật/Tắt dịch vụ áp dụng cho chi nhánh, cấu hình số lượng xe tối đa phục vụ trên mỗi khung giờ.
* **Báo cáo doanh thu:** Xem thống kê doanh số, số lượng xe đã rửa theo chu kỳ.

### 👑 Quản Trị Hệ Thống (Admin Portal)
* **Quản lý chi nhánh:** Thêm/sửa/xóa thông tin chi nhánh trên toàn hệ thống.
* **Quản lý danh mục dịch vụ:** Cấu hình giá cơ bản, thời gian thi công cho từng loại dịch vụ.
* **Quản lý người dùng:** Quản trị toàn bộ tài khoản Khách hàng, Nhân viên, Quản lý chi nhánh.
* **Quản lý hạng thành viên (Tiers):** Điều chỉnh mức điểm thăng hạng và đặc quyền của từng hạng.

---

## 🏗️ Cấu Trúc Dự Án (Project Structure)

Dự án được thiết kế theo mô hình phân lớp rõ ràng (Clean Architecture / Domain-Driven Design) ở Backend và mô hình SPA hiện đại ở Frontend:

```text
AutoWashingCar/
├── backend/                       # BACKEND: ASP.NET Core 8 Web API
│   └── WashingCar/
│       ├── WashingCar_API/        # Tầng API: Controllers, Middlewares, Background Services
│       ├── WashingCar_BLL/        # Tầng Nghiệp vụ (Business Logic): Services, Mappers, Interfaces
│       ├── WashingCar_DAL/        # Tầng Dữ liệu (Data Access): Entities, DbContext, Repositories, Migrations
│       ├── WashingCar_Domain/     # Tầng Domain: DTOs (Request/Response)
│       └── WashingCar_Common/     # Tầng Tiện ích chung: Enums, Constants, Exceptions
│
├── frontend/                      # FRONTEND: React.js SPA (Vite + TypeScript)
│   ├── public/                    # Tài nguyên tĩnh (SVG icons, Images)
│   └── src/
│       ├── components/            # Các component dùng chung (Header, Footer, Modals...)
│       ├── context/               # Quản lý State toàn cục (Authentication, Theme)
│       ├── layouts/               # Bố cục giao diện (Customer Portal, Admin/Manager Portal)
│       ├── pages/                 # Các trang chức năng chính phân theo Role
│       ├── services/              # Kết nối API (Axios client, API endpoints)
│       ├── types/                 # Định nghĩa TypeScript Types & Interfaces
│       └── utils/                 # Các hàm trợ giúp tiện ích (Role check, Format tiền...)
│
├── database/                      # CƠ SỞ DỮ LIỆU SQL Server
│   └── WashingCar.sql             # Script khởi tạo Database Schema & Seed Data đầy đủ
│
└── docs/                          # TÀI LIỆU DỰ ÁN
    └── Diagrams & User Stories    # Sơ đồ luồng, sơ đồ cơ sở dữ liệu (Draw.io, PDF)
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Yêu Cầu Hệ Thống (Prerequisites)
* [.NET SDK 8.0](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
* [Node.js (v18+) & npm](https://nodejs.org/)
* [SQL Server 2019+](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) hoặc SQL Server Express

### 2. Thiết Lập Cơ Sở Dữ Liệu
1. Mở SQL Server Management Studio (SSMS).
2. Mở file [database/WashingCar.sql](database/WashingCar.sql) trong SSMS.
3. Nhấn **Execute (F5)** để khởi tạo Database `WashingCar` cùng đầy đủ các bảng dữ liệu mẫu (Chi nhánh, Hạng thành viên, Dịch vụ, Ca rửa xe trống...).

### 3. Chạy Backend (Web API)
1. Mở Terminal và di chuyển vào thư mục dự án API:
   ```bash
   cd backend/WashingCar/WashingCar_API
   ```
2. Cấu hình chuỗi kết nối cơ sở dữ liệu (ConnectionString) trong file `appsettings.json` cho khớp với SQL Server của bạn.
3. Chạy lệnh để khởi động server:
   ```bash
   dotnet run
   ```
   *Mặc định API sẽ chạy tại: `https://localhost:7232` hoặc `http://localhost:5242`.*

### 4. Chạy Frontend (React App)
1. Mở một Terminal khác và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi động ứng dụng React ở môi trường phát triển:
   ```bash
   npm run dev
   ```
   *Mở trình duyệt truy cập: `http://localhost:5173` để trải nghiệm ứng dụng.*

---

## 🔒 Tài Khoản Đăng Nhập Thử Nghiệm

Hệ thống đã được seed sẵn các tài khoản mẫu để bạn kiểm tra các vai trò (Roles) khác nhau:

| Vai trò (Role) | Email đăng nhập | Mật khẩu mặc định | Chức năng kiểm thử |
| :--- | :--- | :--- | :--- |
| **Admin (Quản trị)** | `admin@washingcar.com` | *Xem trong appsettings.json* | Quản lý chi nhánh, dịch vụ toàn hệ thống |
| **Manager (Quản lý)** | `minhquan2004kk@gmail.com` | `123456Aa@` | Xem báo cáo, phê duyệt voucher, phân công nhân viên |
| **Staff (Nhân viên)** | `quandmse184724@fpt.edu.vn` | `123456Aa@` | Tiếp nhận xe (Check-in), hoàn thành ca rửa |
| **Customer (Khách hàng)**| `dangminhquantdgnl1407@gmail.com`| *(Tự đăng ký)* | Đặt lịch, tích điểm, đổi voucher, viết đánh giá |

---

*Chúc các bạn có trải nghiệm tuyệt vời với AutoWashPro!* 🚗💨