using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_BLL.Mappers;

public static class VehicleImageMapper
{
    public static VehicleImageDto ToDto(this VehicleImage image) => new()
    {
        VehicleImageId = image.VehicleImageId,
        ImageUrl = image.ImageUrl,
        IsPrimary = image.IsPrimary,
        DisplayOrder = image.DisplayOrder,
        UploadedAtUtc = image.UploadedAtUtc
    };
}
