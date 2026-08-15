using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.ServiceCatalog;

namespace WashingCar_BLL.Mappers
{
    public static class ServiceCatalogMapper
    {
        public static ServiceCatalogDto ToDto(this ServiceCatalogItem s) => new()
        {
            ServiceCatalogItemId = s.ServiceCatalogItemId,
            ServiceName = s.ServiceName,
            Description = s.Description,
            BasePrice = s.BasePrice,
            DurationMinutes = s.DurationMinutes,
            ServicePackageType = s.ServicePackageType,
            ServicePackageTypeName = Enum.IsDefined(typeof(WashingCar_Common.Enum.ServicePackageType), s.ServicePackageType)
                ? ((WashingCar_Common.Enum.ServicePackageType)s.ServicePackageType).ToString()
                : "Unknown",
            IsActive = s.IsActive,
            CreatedAtUtc = s.CreatedAtUtc,
        };
    }
}