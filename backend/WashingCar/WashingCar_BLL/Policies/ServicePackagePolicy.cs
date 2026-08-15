using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_Common.Constant;

namespace WashingCar_BLL.Policies;

/// <summary>
/// Quy tắc chọn service trong một booking.
/// Việc kiểm tra được thực hiện sau khi service được tải từ database, không tin package type do client tự gửi.
/// </summary>
public static class ServicePackagePolicy
{
    /// <summary>
    /// Premium loại trừ tất cả service khác; Standard chỉ được xuất hiện một lần;
    /// mỗi ServiceCatalogItem cũng chỉ được xuất hiện một lần trong danh sách chọn.
    /// </summary>
    public static void Validate(
        IReadOnlyCollection<(Guid ServiceCatalogItemId, ServicePackageType PackageType)> selections)
    {
        if (selections.Count == 0)
            return;

        if (selections.Select(x => x.ServiceCatalogItemId).Distinct().Count() != selections.Count)
            throw AppException.BadRequest(ValidationMessage.Booking.DuplicateServiceSelection);

        var packageTypes = selections.Select(x => x.PackageType).ToList();
        if (packageTypes.Any(type => !Enum.IsDefined(type)))
            throw AppException.BadRequest(ValidationMessage.Booking.InvalidServicePackageType);

        var premiumCount = packageTypes.Count(type => type == ServicePackageType.Premium);
        if (premiumCount > 0 && selections.Count > 1)
            throw AppException.BadRequest(ValidationMessage.Booking.PremiumServiceExcludesOthers);

        if (packageTypes.Count(type => type == ServicePackageType.Standard) > 1)
            throw AppException.BadRequest(ValidationMessage.Booking.StandardServiceSelectionConflict);
    }
}
