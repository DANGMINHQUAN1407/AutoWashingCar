namespace WashingCar_Common.Constant;

/// <summary>
/// Tập trung toàn bộ message dùng cho AppException trong BLL — tránh string fix cứng rải rác ở các service.
/// Message cố định dùng const string; message cần nội suy dữ liệu dùng static method.
/// </summary>
public static class ValidationMessage
{
    public static class Common
    {
        public const string InvalidRole          = "Role không hợp lệ";
        public const string UserNotFound          = "Không tìm thấy người dùng";
        public const string EmailAlreadyExists    = "Email đã tồn tại";
        public const string EmailInUse            = "Email đã được sử dụng";
        public const string EmailInUseByOther     = "Email đã được sử dụng bởi tài khoản khác";
        public const string PhoneInUse            = "Số điện thoại đã được sử dụng";
        public const string PhoneInUseByOther     = "Số điện thoại đã được sử dụng bởi tài khoản khác";

        public static string UserNotFoundWithId(Guid userId) => $"Không tìm thấy người dùng {userId}";
    }

    public static class Admin
    {
        public const string CannotChangeOwnStatus = "Không thể thay đổi trạng thái của chính mình";
        public const string CannotDisableAdmin    = "Không thể vô hiệu hóa tài khoản Admin";
        public const string CannotDeleteSelf      = "Không thể tự xóa tài khoản của chính mình";
        public const string CannotDeleteAdmin     = "Không thể xóa tài khoản Admin";
    }

    public static class Auth
    {
        public const string InvalidCredentials    = "Email hoặc mật khẩu không đúng";
        public const string GuestAccountNotFound  = "Không tìm thấy tài khoản khách vãng lai với số điện thoại này";
        public const string AccountDisabled       = "Tài khoản đã bị vô hiệu hóa";
        public const string RefreshTokenInvalid   = "Refresh token không hợp lệ hoặc đã hết hạn";
        public const string AccountInactive       = "Tài khoản không còn hoạt động";
        public const string GoogleTokenInvalid    = "Google token không hợp lệ";
        public const string ResetTokenInvalid     = "Token không hợp lệ hoặc đã hết hạn";
        public const string UserNotExist          = "Người dùng không tồn tại";
        public const string NoPasswordAccount     = "Tài khoản này không dùng mật khẩu";
        public const string OldPasswordIncorrect  = "Mật khẩu cũ không đúng";
    }

    public static class Branch
    {
        public const string NotFound                       = "Không tìm thấy chi nhánh";
        public const string ManagerNotAssigned              = "Bạn chưa được gán quản lý chi nhánh nào";
        public const string ForbiddenOtherBranch          = "Bạn không có quyền thao tác chi nhánh này";
        public const string CannotAssignAdminAsManager      = "Không thể gán Admin làm manager chi nhánh";
        public const string ManagerAlreadyAssignedElsewhere = "User này đã quản lý một chi nhánh khác";
        public const string NotStaffRole                    = "Người dùng này không phải Staff";
        public const string StaffNotInBranch                = "Staff này không thuộc chi nhánh được chỉ định";
        public const string ServiceNotAssigned              = "Dịch vụ này chưa được gán cho chi nhánh";

        public static string UserNotStaff(string fullName) =>
            $"User {fullName} không phải Staff";
        public static string StaffBelongsToOtherBranch(string fullName) =>
            $"Staff {fullName} đang thuộc chi nhánh khác. Vui lòng gỡ khỏi chi nhánh cũ trước.";
    }

    public static class Slot
    {
        public const string NotFound               = "Không tìm thấy slot";
        public const string EndTimeAfterStart       = "Giờ kết thúc phải sau giờ bắt đầu";
        public const string AlreadyExists           = "Slot này đã tồn tại";
        public const string HasBookingsCannotDelete = "Không thể xóa slot đã có đặt chỗ";
        public const string ToDateBeforeFromDate    = "ToDate phải >= FromDate";
        public const string CloseTimeBeforeOpenTime = "CloseTime phải sau OpenTime";
    }

    public static class Booking
    {
        public const string NotFound                             = "Không tìm thấy booking";
        public const string MyVehicleNotFound                     = "Không tìm thấy xe của bạn";
        public const string SlotFull                              = "Slot đã hết chỗ";
        public const string SlotTimePast                          = "Khung giờ này đã qua, vui lòng chọn slot khác";
        public const string SlotJustFilled                        = "Slot vừa hết chỗ, vui lòng thử lại";
        public const string SlotTooFarInAdvance                   = "Slot này vượt quá số ngày được phép đặt trước";
        public const string CustomerNotFound                      = "Không tìm thấy khách hàng";
        public const string OnlyForCustomerRole                   = "Chỉ tạo booking cho tài khoản khách hàng";
        public const string OnlyConfirmPending                    = "Chỉ xác nhận được booking đang chờ thanh toán";
        public const string ForbiddenView                         = "Bạn không có quyền xem booking này";
        public const string StatusEndpointRestricted              =
            "Endpoint này chỉ hỗ trợ chuyển sang InProgress. " +
            "Confirmed dùng /confirm, CheckedIn dùng /check-in, " +
            "Completed dùng /complete, Closed dùng /close, Cancelled dùng /cancel.";
        public const string CheckInRequiresCode                   = "Cần mã QR hoặc mã booking để check-in";
        public const string InvalidCheckInCode                    = "Mã QR / mã booking không hợp lệ";
        public const string CheckInRequiresConfirmed               = "Chỉ check-in được booking đã xác nhận (Confirmed)";
        public const string InvalidQr                             = "Mã QR không hợp lệ";
        public const string LineNotFound                          = "Không tìm thấy dòng dịch vụ";
        public const string CannotRemoveLastLine                  = "Không thể xoá dịch vụ cuối cùng của booking";
        public const string OnlyCompleteWhenCheckedInOrInProgress = "Chỉ hoàn tất khi booking đang CheckedIn/InProgress";
        public const string OnlyCloseWhenCompleted                = "Chỉ đóng đơn khi đã Completed";
        public const string ForbiddenCancel                       = "Bạn không có quyền huỷ booking này";
        public const string OnlyCancelWhenPendingOrConfirmed      = "Chỉ huỷ được khi đơn ở Pending/Confirmed (trước check-in)";
        public const string PhoneRequired                         = "Vui lòng nhập số điện thoại";
        public const string MustSelectAtLeastOneService           = "Phải chọn ít nhất 1 dịch vụ";
        public const string DuplicateServiceSelection             = "Không được chọn trùng cùng một dịch vụ trong booking";
        public const string PremiumServiceExcludesOthers          = "Gói Premium không thể kết hợp với dịch vụ khác";
        public const string StandardServiceSelectionConflict      = "Chỉ được chọn một gói Standard trong mỗi booking";
        public const string InvalidServicePackageType              = "Loại gói dịch vụ không hợp lệ";
        public const string OnlyEditWhenEditableStatus            = "Chỉ thêm/sửa dịch vụ khi booking ở trạng thái Confirmed/CheckedIn/InProgress";
        public const string CustomerVehicleNotFound               = "Không tìm thấy xe của khách";
        public const string MustChooseOrCreateVehicle              = "Cần chọn xe có sẵn hoặc khai báo xe mới cho khách";
        public const string LicensePlateExistsForCustomer         = "Biển số xe đã tồn tại cho khách này";
        public const string MinRedeemPoints                       = "Số điểm quy đổi tối thiểu là 1.000";
        public const string CodeGenerationFailed                  = "Không sinh được mã booking, vui lòng thử lại";
        public const string QrGenerationFailed                    = "Không sinh được mã QR, vui lòng thử lại";
        public const string MyVoucherNotFound                     = "Không tìm thấy voucher của bạn";
        public const string VoucherInfoNotFound                   = "Không tìm thấy thông tin voucher";
        public const string VoucherMustBeClaimedFirst              = "Voucher này cần được đổi hoặc nhận trước khi sử dụng";
        public const string VoucherNotOwned                       = "Voucher này không thuộc về bạn";
        public const string VoucherAlreadyUsedOrInvalid            = "Voucher đã được sử dụng hoặc không hợp lệ";
        public const string VoucherNotActivatedOrApproved          = "Voucher chưa được kích hoạt hoặc chưa được duyệt";
        public const string VoucherExpiredOrNotStarted             = "Voucher đã hết hạn hoặc chưa đến thời gian sử dụng";
        public const string VoucherNotApplicableToBranch          = "Voucher không áp dụng cho chi nhánh này";
        public const string OnlyAssignFromCheckedInOnward     = "Chỉ gán/sửa nhân viên khi booking đang CheckedIn/InProgress/Completed/Closed";
        public const string CannotReassignAfterReview             = "Không thể gán lại nhân viên vì booking này đã có đánh giá từ khách hàng";
        public const string StaffNotFound                         = "Không tìm thấy nhân viên";
        public const string TargetMustBeStaffRole                 = "Chỉ gán được cho tài khoản có vai trò Staff";
        public const string StaffInactive                         = "Nhân viên này hiện không hoạt động";
        public const string StaffNotAtBranch                      = "Nhân viên không thuộc chi nhánh của booking này";
        public const string ForbiddenAssignOtherBranch            = "Bạn không có quyền gán nhân viên cho chi nhánh khác";
        public const string ConcurrentUpdateConflict              = "Booking vừa được cập nhật bởi thao tác khác, vui lòng tải lại và thử lại";

        public static string InvalidTransition(byte from, byte to) =>
            $"Không thể chuyển trạng thái {from} → {to}";
        public static string ServiceNotFound(Guid serviceCatalogItemId) =>
            $"Không tìm thấy dịch vụ {serviceCatalogItemId}";
        public static string ServiceInactive(string serviceName) =>
            $"Dịch vụ '{serviceName}' đang ngừng cung cấp";
        public static string ServiceNotAvailableAtBranch(string serviceName) =>
            $"Dịch vụ '{serviceName}' không khả dụng tại chi nhánh này";
        public static string InsufficientPoints(int available) =>
            $"Không đủ điểm. Hiện có {available} điểm.";
        public static string VoucherCodeNotFound(string code) =>
            $"Không tìm thấy mã voucher '{code}'";
        public static string VoucherMinOrderNotMet(decimal minOrderAmount) =>
            $"Giá trị đơn hàng chưa đạt mức tối thiểu ({minOrderAmount:N0} đ) để áp dụng voucher";
    }

    public static class Payment
    {
        public const string ForbiddenPay             = "Bạn không có quyền thanh toán booking này";
        public const string OnlyPayWhenPending        = "Chỉ thanh toán online khi booking đang chờ thanh toán (Pending)";
        public const string AlreadyHasPayment         = "Booking đã có thanh toán trước đó";
        public const string InvalidAmount             = "Số tiền thanh toán không hợp lệ";
        public const string CannotCreateQrForClosed   = "Không thể tạo QR cho đơn đã đóng/huỷ";
        public const string FullyPaidNoQrNeeded       = "Booking đã thanh toán đủ, không cần tạo QR";
        public const string CannotCollectForClosed    = "Không thể thu tiền cho đơn đã đóng/huỷ";
        public const string NoRemainingBalance        = "Booking đã thanh toán đủ, không còn khoản phải thu";
        public const string TenderAmountMustBePositive = "Số tiền mỗi phương thức phải lớn hơn 0";
        public const string NotFound                  = "Không tìm thấy giao dịch";
        public const string ForbiddenView             = "Bạn không có quyền xem giao dịch này";
        public const string TxnRefGenerationFailed    = "Không sinh được mã giao dịch, vui lòng thử lại";

        public static string TenderSumMismatch(decimal sum, decimal remaining) =>
            $"Tổng tiền ({sum:N0}) phải bằng số còn lại phải thu ({remaining:N0})";
    }

    public static class ServiceCatalog
    {
        public const string NotFound   = "Không tìm thấy dịch vụ";
        public const string NameExists = "Tên dịch vụ đã tồn tại";
        public const string InvalidNodeType = "Loại node dịch vụ không hợp lệ";
        public const string InvalidSelectionMode = "Cách chọn dịch vụ không hợp lệ";
        public const string ParentNotFound = "Không tìm thấy dịch vụ cha";
        public const string ParentMustBeGroup = "Dịch vụ cha phải là một nhóm dịch vụ";
        public const string GroupCannotHaveParent = "Nhóm dịch vụ không được nằm dưới một dịch vụ khác";
        public const string LeafMustHaveParentOrBeRoot = "Dịch vụ con phải tham chiếu đến nhóm dịch vụ cha";
        public const string GroupCannotBeBooked = "Không thể đặt trực tiếp nhóm dịch vụ; hãy chọn dịch vụ con";
        public const string HierarchyCycle = "Quan hệ cha-con của dịch vụ tạo thành vòng lặp";
        public const string GroupCannotBeAssignedToBranch = "Không thể gán nhóm dịch vụ trực tiếp cho chi nhánh";
        public const string GroupWithChildrenCannotBecomeLeaf = "Nhóm còn dịch vụ con nên không thể đổi thành dịch vụ đơn";
        public const string ActiveChildrenPreventGroupDeactivation = "Không thể vô hiệu hóa nhóm khi còn dịch vụ con đang hoạt động";
    }

    public static class Loyalty
    {
        public const string AccountNotFound          = "Người dùng chưa có tài khoản loyalty";
        public const string PointsMustBePositive     = "Số điểm phải lớn hơn 0";
        public const string AdjustPointsCannotBeZero = "Số điểm điều chỉnh không được bằng 0";
        public const string ManagerNoBranch          = "Bạn chưa được gán chi nhánh";
        public const string CustomerNoBookingAtBranch = "Khách hàng không có đơn hàng tại chi nhánh của bạn";
        public const string InsufficientPointsToDeduct = "Không đủ điểm để trừ";

        public static string InsufficientPoints(int current, int required) =>
            $"Không đủ điểm. Hiện có {current} điểm, cần {required} điểm.";
    }

    public static class Tier
    {
        public const string NotFound                          = "Không tìm thấy hạng thành viên";
        public const string NameExists                        = "Tên hạng đã tồn tại";
        public const string MinPointsExists                   = "Mốc điểm này đã được sử dụng bởi hạng khác";
        public const string HasActiveMembersCannotDeactivate  = "Không thể vô hiệu hóa hạng đang có thành viên";
        public const string NoTierConfigured                  = "Hệ thống chưa có hạng thành viên";
    }

    public static class TierBenefit
    {
        public const string NotFound                  = "Không tìm thấy quyền lợi";
        public const string DuplicateType             = "Hạng này đã có loại quyền lợi này";
        public const string InvalidDiscountPercent    = "BenefitValue của DiscountPercent phải là số từ 0 đến 100";
        public const string InvalidAdvanceBookingDays = "BenefitValue của AdvanceBookingDays phải là số nguyên dương";
    }

    public static class Vehicle
    {
        public const string NotFound            = "Không tìm thấy xe";
        public const string LicensePlateExists  = "Biển số xe đã tồn tại";
    }

    public static class Report
    {
        public const string InvalidGroupBy = "GroupBy chỉ nhận Day, Week hoặc Month";
    }

    public static class Voucher
    {
        public const string NotFound                    = "Không tìm thấy voucher";
        public const string OutOfStock                  = "Voucher đã hết lượt đổi phát hành";
        public const string TierInfoLoadFailed          = "Không thể tải thông tin hạng thành viên";
        public const string Inactive                    = "Voucher hiện không hoạt động";
        public const string NotStarted                  = "Voucher chưa bắt đầu hạn sử dụng";
        public const string Expired                     = "Voucher đã hết hạn sử dụng";
        public const string AlreadyRedeemedOnce         = "Bạn đã nhận mã voucher này rồi, mỗi tài khoản chỉ được nhận 1 lần";
        public const string NotConfiguredForCurrentTier = "Voucher này không được cấu hình đổi cho hạng thành viên hiện tại của bạn";
        public const string TierVoucherAlreadyAssigned  = "Voucher này đã được gán cho hạng thành viên này rồi";
        public const string RequiredPointsMustBePositive = "Số điểm yêu cầu đổi voucher phải lớn hơn 0";
        public const string TierVoucherNotFound         = "Không tìm thấy cấu hình gán hạng cho voucher";

        // Approval
        public const string NotPendingApproval    = "Voucher này không ở trạng thái Chờ duyệt";
        public const string ApproverNotFound      = "Không tìm thấy thông tin người phê duyệt";

        // Create / Update
        public const string CreatorNotFound                 = "Không tìm thấy thông tin người tạo";
        public const string OnlyStaffCanCreateDraft         = "Chỉ có nhân viên (Staff) mới có quyền tạo bản thảo voucher";
        public const string OnlyOwnBranchVoucher            = "Bạn chỉ có quyền tạo voucher cho chi nhánh của mình";
        public const string AssignedBranchNotFound          = "Không tìm thấy chi nhánh được gán";
        public const string OnlyAdminCanCreateSystemVoucher = "Chỉ có Admin mới có quyền tạo voucher cho toàn hệ thống";
        public const string OnlyEditPendingVoucher          = "Chỉ có thể chỉnh sửa voucher đang ở trạng thái Chờ duyệt (Draft)";
        public const string OnlyEditOwnVoucher              = "Bạn chỉ có quyền chỉnh sửa voucher do chính mình tạo ra";
        public const string EditorNotFound                  = "Không tìm thấy thông tin người chỉnh sửa";
        public const string OnlyUpdateOwnBranchVoucher      = "Bạn chỉ có quyền cập nhật voucher về chi nhánh của mình";

        // Activate / toggle
        public const string ManagerOnlyOwnBranchToggle = "Quản lý chỉ có quyền kích hoạt hoặc ngưng kích hoạt voucher thuộc chi nhánh của mình";
        public const string NoPermissionForAction      = "Bạn không có quyền thực hiện chức năng này";
        public const string OnlyActivateApproved       = "Chỉ có thể kích hoạt (Activate) những voucher đã được phê duyệt";

        // Validate request
        public const string EndDateMustBeAfterStart          = "Thời gian kết thúc phải lớn hơn thời gian bắt đầu";
        public const string PercentageRange                  = "Giá trị giảm phần trăm phải nằm trong khoảng từ 5% đến 100%";
        public const string PercentageRequiresMaxDiscount    = "Voucher dạng phần trăm bắt buộc phải định nghĩa giới hạn giảm tối đa (MaxDiscountAmount)";
        public const string FixedAmountMustBePositive        = "Số tiền giảm trực tiếp phải lớn hơn 0";
        public const string FixedAmountNoMaxDiscount         = "Voucher dạng tiền mặt không được có giới hạn giảm tối đa (MaxDiscountAmount)";
        public const string InvalidDiscountType              = "Loại voucher không hợp lệ";

        public static string CodeExists(string code) => $"Mã voucher '{code}' đã tồn tại";
        public static string NotFoundWithId(Guid voucherId) => $"Không tìm thấy voucher với ID: {voucherId}";
        public static string NotPendingApprovalWithCode(string code) => $"Voucher '{code}' không ở trạng thái Chờ duyệt";
        public static string ManagerBranchMismatchApprove(Guid? voucherBranchId, Guid? managerBranchId) =>
            $"Quản lý chỉ có quyền phê duyệt voucher thuộc chi nhánh của mình (Voucher.Branch: {voucherBranchId}, Manager.Branch: {managerBranchId})";
        public static string ManagerBranchMismatchReject(Guid? voucherBranchId, Guid? managerBranchId) =>
            $"Quản lý chỉ có quyền từ chối voucher thuộc chi nhánh của mình (Voucher.Branch: {voucherBranchId}, Manager.Branch: {managerBranchId})";
        public static string ManagerBranchMismatchBulkApprove(string code) =>
            $"Quản lý không có quyền phê duyệt voucher '{code}' thuộc chi nhánh khác";
        public static string ManagerBranchMismatchBulkReject(string code) =>
            $"Quản lý không có quyền từ chối phê duyệt voucher '{code}' thuộc chi nhánh khác";
        public static string InsufficientPointsToRedeem(int required, int current) =>
            $"Bạn không đủ điểm để đổi voucher này (Cần {required} điểm, hiện có {current} điểm)";
    }
}
