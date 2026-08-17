# BÁO CÁO PHÂN TÍCH KHOẢNG CÁCH (GAP ANALYSIS) & NGHIỆP VỤ HỆ THỐNG

Tài liệu này tổng hợp kết quả phân tích mã nguồn hiện tại của dự án **AutoWashingCar** đối chiếu với các yêu cầu nghiệp vụ của bạn. Dưới đây là chi tiết các chức năng đã làm, chưa làm (khoảng cách) và đề xuất các quy tắc nghiệp vụ (Business Rules).

---

## 1. Giới thiệu
Báo cáo này được thực hiện nhằm rà soát và đánh giá sự hoàn thiện của hệ thống đặt lịch rửa xe tự động, phân tích các điểm chưa tương thích (khoảng cách) giữa Backend và Frontend, và xác nhận trạng thái các lỗi đã được khắc phục.

---

## 2. Tổng quan Gap Analysis

Dưới đây là bảng tổng quan đánh giá nhanh trạng thái triển khai của các hạng mục nghiệp vụ chính trên hệ thống:

| Hạng mục | Trạng thái | Phạm vi | Phân tích |
| :--- | :--- | :--- | :--- |
| **Năm sản xuất & phụ thu** | **Đã hoàn thành** | Backend + Frontend | Đã có `ManufactureYear` và `VehicleConditionPolicy`; 0-3 tuổi +10%, 4-7 tuổi 0%, >=8 tuổi +15%. |
| **Quản lý động cơ & kiểu xe** | **Cấu hình tĩnh** | Enum tĩnh | Có `EngineType`/`BodyStyle` và dropdown; chưa có CRUD danh mục động trong DB. |
| **Upload ảnh xe** | **Đã hoàn thành** | Backend + Frontend | Đã sửa lỗi crash `activeVehicle` trên FE. Hiện modal hiển thị danh sách ảnh, upload ảnh mới, xóa và đặt ảnh chính hoạt động tốt. |
| **Brand xe** | **Thiếu ràng buộc** | Backend + Frontend | Brand đang là text tự do nhập tay, chưa có bảng danh mục hoặc logic phụ thu theo thương hiệu. |
| **Biển số trùng** | **Đã sửa lỗi** | Backend + BLL | Đã chuyển từ check trùng theo UserId sang check trùng trên toàn hệ thống (system-wide), trả về lỗi 409 thay vì crash SQL 500. |
| **Slot quá khứ** | **Đã hoàn thành** | Backend + Frontend | Frontend làm mờ/khóa slot quá khứ; Backend chặn lỗi `SlotTimePast`. |
| **Đơn bị ẩn khi chuyển tab** | **Đã sửa lỗi** | Frontend | Đã sửa lỗi không reload danh sách khi chuyển tab. Giữ đơn quá giờ hiển thị ở tab Upcoming kèm cảnh báo đỏ `⚠️ Quá giờ check-in`. |
| **Voucher** | **Đã hoàn thành** | Backend + Frontend | Đã validate loại giảm, mức giảm, `MinOrderAmount`, `MaxDiscountAmount`. |
| **Báo cáo doanh thu** | **Đã hoàn thành** | Admin + Manager | Có `BookingStatsReport`; Manager theo chi nhánh, Admin toàn hệ thống; Staff không hiển thị báo cáo tài chính để bảo mật. |

---

## 3. Phân tích chi tiết từng khoảng cách

Dưới đây là chi tiết kỹ thuật của từng hạng mục đối chiếu với mã nguồn hiện tại và các đề xuất/giải pháp thực hiện:

| Yêu cầu của bạn | Trạng thái hiện tại trong Code | Chi tiết kỹ thuật & Đề xuất |
| :--- | :--- | :--- |
| **Năm sản xuất xe & phụ thu** | **Đã hoàn thành** (Backend + Frontend) | - Thuộc tính `ManufactureYear` đã được lưu trữ.<br>- Surcharge tính theo công thức: `Tuổi xe = Năm hiện tại - Năm sản xuất`. Quy định tại `VehicleConditionPolicy.cs`:<br>&nbsp;&nbsp;• *Xe mới (0-3 tuổi):* Phụ thu **+10%** giá gốc.<br>&nbsp;&nbsp;• *Tiêu chuẩn (4-7 tuổi):* Phụ thu **+0%**.<br>&nbsp;&nbsp;• *Xe cũ (>=8 tuổi):* Phụ thu **+15%**.<br>- Giao diện đặt lịch đã hiển thị đúng dòng phụ thu tương ứng. |
| **Quản lý Động cơ, Kiểu xe** | **Cấu hình tĩnh** (Chỉ có Enum tĩnh) | - Database và API đã có các trường `EngineType` (Xăng, Dầu, Điện, Hybrid) và `BodyStyle` (Sedan, SUV, Hatchback, Van,...). Giao diện đã cho phép chọn các dropdown này khi đăng ký xe.<br>- **Khoảng cách:** Hiện tại các danh mục này đang được định nghĩa dưới dạng Enum tĩnh (Hardcoded). Nếu muốn Admin/Manager có màn hình CRUD (thêm/xóa/sửa kiểu dáng xe động), hệ thống cần bổ sung các bảng danh mục riêng trong Database và viết màn hình quản lý. |
| **Upload ảnh xe** | **Đã hoàn thành** (Sửa lỗi Frontend) | - Backend: Đã có Entity `VehicleImage`, lưu trữ vật lý `LocalVehicleImageStorage.cs` và endpoint `POST /api/vehicles/{id}/images` để upload ảnh.<br>- **Sửa lỗi:** Đã sửa lỗi ReferenceError crash React do thiếu khai báo biến `activeVehicle` trong file `CustomerVehicles.tsx`. Tính năng hiện tại đã chạy tốt và hiển thị modal quản lý ảnh xe, upload ảnh mới, xóa ảnh, đặt làm ảnh chính (Primary). |
| **Xem lại nghiệp vụ Brand xe** | **Thiếu logic ràng buộc** | - Hiện tại `Brand` (Hãng xe) chỉ là một trường text tự do nhập từ bàn phím (ví dụ: Toyota, Honda,...), chưa có bảng danh mục và không tham gia vào bất kỳ logic tính tiền hay phụ thu nào.<br>- **Kiến nghị:** Nếu cần, có thể xây dựng bảng Brand tĩnh để khách chọn thay vì gõ text tự do, hoặc phụ thu theo thương hiệu xe sang (Luxury Brands). |
| **Biển số trùng & xử lý** | **Đã sửa lỗi** (Toàn hệ thống) | - Database có UNIQUE index `UX_Vehicle_LicensePlate` chặn trùng biển số (trên các xe chưa xóa `IsDeleted = 0`).<br>- **Sửa lỗi:** Đã sửa hàm kiểm tra trùng `ExistsLicensePlateAsync` ở BLL thành **system-wide (toàn hệ thống)** thay vì chỉ check theo từng user. Hệ thống trả về lỗi Conflict `409` rõ ràng: *"Biển số này đã được đăng ký bởi một tài khoản khác."* |
| **Nghiệp vụ Slot (Quá khứ / Làm mờ)** | **Đã hoàn thành** (Backend + Frontend) | - Các slot giờ trong quá khứ được xác định qua hàm `isSlotInPast` ở Frontend. Được làm mờ (opacity: 0.45), hiển thị trạng thái "Past", gạch ngang giờ và không cho click chọn.<br>- Backend cũng validate chặn đặt slot quá khứ (`SlotTimePast`). |
| **Mất đơn khi chuyển tab** | **Đã sửa lỗi** | - Hệ thống đã dùng `sessionStorage` để lưu trạng thái Wizard đặt lịch của khách hàng.<br>- **Sửa lỗi:** Đã cập nhật tự động gọi lại `fetchMyBookings()` khi người dùng chuyển đổi qua lại giữa tab **Upcoming** và **History** để hiển thị dữ liệu mới nhất. Không ẩn các đơn quá giờ ở Upcoming mà hiển thị nhãn cảnh báo đỏ: `⚠️ Quá giờ check-in`. |
| **Ràng buộc Voucher (Phần trăm, Mức giảm tối thiểu)** | **Đã hoàn thành** (Backend + Frontend) | - Thực hiện đúng logic: Kiểm tra loại giảm giá (Percentage/FixedAmount), số tiền giảm, min order (`MinOrderAmount`), max discount (`MaxDiscountAmount`) và được check validate đầy đủ ở API. |
| **Báo cáo doanh thu Admin/Manager/Staff** | **Đã hoàn thành** (Admin & Manager) | - Admin và Manager đã có component `BookingStatsReport` hiển thị biểu đồ/báo cáo doanh thu & đơn hàng (Manager chỉ xem chi nhánh của họ, Admin xem toàn hệ thống).<br>- Staff không có màn hình doanh thu (hợp lý vì Staff chỉ làm nghiệp vụ vận hành, không cần xem tài chính). |

---

## 4. Chi tiết Quy tắc Nghiệp vụ (Business Rules) cần xác định rõ

### 4.1. Quy định về cách tính giá tiền khi áp dụng mã giảm giá
Để tránh mập mờ, thứ tự tính toán hóa đơn khi áp dụng voucher & điểm tích lũy được quy định tuần tự như sau:
1.  **Giá dịch vụ gốc:** Tổng tiền của các dịch vụ được chọn.
2.  **Phụ thu xe:** Tính dựa trên tuổi xe (`Năm hiện tại - Năm sản xuất`). Cộng trực tiếp vào giá dịch vụ gốc để ra **Tạm tính (Subtotal)**.
3.  **Mã giảm giá (Voucher) & Chiết khấu hạng thành viên (Tier Discount):**
    - Áp dụng trên mức giá **Subtotal** đã bao gồm phụ thu.
    - Nếu là phần trăm: `Số tiền giảm = Subtotal * % Giảm` (Cáp tối đa theo `MaxDiscountAmount` của voucher).
    - Tổng giảm giá voucher & hạng thành viên không được vượt quá **Subtotal** (không âm tiền).
4.  **Đổi điểm tích lũy (Redeem Points):**
    - Áp dụng trên số tiền sau khi đã trừ voucher.
    - Tỷ lệ quy đổi: `1 điểm = 1 VND`.
    - Số tiền thanh toán cuối cùng: `FinalAmount = (Subtotal - Tổng giảm giá) - Điểm quy đổi`.

### 4.2. Số lượng slot đặt xe đồng thời
- Số lượng xe được rửa đồng thời tại một chi nhánh ở cùng một khung giờ được giới hạn bởi thuộc tính `Capacity` (Số khoang rửa khả dụng) của `SlotInventory` đó.
- Mỗi đơn hàng đặt thành công sẽ tăng `OnlineReservedCount` hoặc `WalkInReservedCount` lên 1. Khi tổng số lượng đặt bằng `Capacity`, slot đó sẽ khóa hiển thị (Full) và không cho phép đặt thêm.

### 4.3. Quy tắc đặt lịch cho 1 chiếc xe (Đồng thời / Nhiều đơn)
Để tối ưu hóa vận hành và tránh việc đặt chỗ ảo, quy tắc đặt lịch của phương tiện được quy định như sau:
- **Trường hợp CÙNG thời điểm (Trùng slot giờ):**
    - **KHÔNG CHO PHÉP.** Một chiếc xe vật lý không thể rửa tại hai chi nhánh hoặc hai khoang rửa khác nhau cùng một lúc.
    - *Giải pháp:* Backend kiểm tra trong `CreateAsync` và `CreateWalkInAsync`: Nếu xe đã có một đơn đặt lịch ở trạng thái hoạt động (*Pending, Confirmed, CheckedIn, InProgress*) trùng với slot giờ đăng ký mới, hệ thống sẽ chặn và thông báo: *"Xe này đã có lịch hẹn trùng với khung giờ đã chọn."*
- **Trường hợp KHÁC thời điểm:**
    - **CHO PHÉP.** Một xe có thể đặt rửa nhiều lần vào các khung giờ khác nhau hoặc các ngày khác nhau (đặt trước cho tương lai).

---

## 5. Hướng dẫn chạy hệ thống & kiểm thử

### 5.1. Biên dịch và Chạy Backend
Mở terminal và di chuyển vào thư mục backend, chạy lệnh:
```bash
# Biên dịch hệ thống để kiểm tra lỗi cú pháp
dotnet build

# Chạy API server
dotnet run --project WashingCar_API
```

### 5.2. Chạy Frontend
Di chuyển vào thư mục frontend, chạy lệnh:
```bash
npm run dev
```

### 5.3. Kịch bản kiểm thử đề xuất (Test cases)
1.  **Test check trùng biển:** Dùng Acc A tạo xe biển số `29A-99999`. Dùng Acc B tạo cùng biển số `29A-99999` → xác minh màn hình báo lỗi *"Biển số này đã được đăng ký bởi một tài khoản khác."*
2.  **Test chặn trùng giờ:** Dùng xe C đặt lịch slot 8:00 ngày mai. Tiếp tục dùng xe C đặt tiếp slot 8:00 ngày mai → xác minh hệ thống báo lỗi *"Xe này đã có lịch hẹn trùng với khung giờ đã chọn."*
3.  **Test upload ảnh xe:** Vào màn hình danh sách xe của khách hàng → bấm nút *"Ảnh xe"* → Upload ảnh mới → Đặt làm ảnh đại diện → Kiểm tra ảnh đại diện hiển thị ở danh sách xe ngoài.
