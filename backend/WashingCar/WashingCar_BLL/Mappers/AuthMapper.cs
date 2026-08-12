using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Auth;

namespace WashingCar_BLL.Mappers;

public static class AuthMapper
{
    public static UserDto ToDto(this User user) => new()
    {
        UserId       = user.UserId,
        FullName     = user.FullName,
        Email        = user.Email,
        PhoneNumber  = user.PhoneNumber,
        Role         = user.Role,
        IsActive     = user.IsActive,
        CreatedAtUtc = user.CreatedAtUtc,
        BranchId     = user.BranchId,
    };
}
