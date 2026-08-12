using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Branch;

namespace WashingCar_BLL.Mappers;

public static class BranchMapper
{
    public static BranchDto ToDto(this Branch b) => new()
    {
        BranchId     = b.BranchId,
        BranchCode   = b.BranchCode,
        Name         = b.Name,
        Address      = b.Address,
        City         = b.City,
        Phone        = b.Phone,
        Email        = b.Email,
        Latitude     = b.Latitude,
        Longitude    = b.Longitude,
        OpenTime     = b.OpenTime,
        CloseTime    = b.CloseTime,
        ManagerId    = b.ManagerId,
        ManagerName  = b.Manager?.FullName,
        IsActive     = b.IsActive,
        CreatedAtUtc = b.CreatedAtUtc,
        UpdatedAtUtc = b.UpdatedAtUtc,
    };

    public static BranchStaffDto ToStaffDto(this User u) => new()
    {
        UserId      = u.UserId,
        FullName    = u.FullName,
        Email       = u.Email,
        PhoneNumber = u.PhoneNumber,
        IsActive    = u.IsActive,
    };

    public static BranchServiceDto ToDto(this BranchService bs) => new()
    {
        ServiceCatalogItemId = bs.ServiceCatalogItemId,
        ServiceName          = bs.ServiceCatalogItem.ServiceName,
        Description          = bs.ServiceCatalogItem.Description,
        BasePrice            = bs.ServiceCatalogItem.BasePrice,
        DurationMinutes      = bs.ServiceCatalogItem.DurationMinutes,
        IsActive             = bs.IsActive && bs.ServiceCatalogItem.IsActive,
        AddedAtUtc           = bs.AddedAtUtc,
    };
}
