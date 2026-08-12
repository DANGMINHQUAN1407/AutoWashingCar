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
            IsActive = s.IsActive,
            CreatedAtUtc = s.CreatedAtUtc,
        };
    }
}