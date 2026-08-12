using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Auth;
using WashingCar_Domain.DTOs.User;

namespace WashingCar_BLL.Interfaces
{
    public interface IAdminService
    {
        Task<UserDto> CreateAccountStaffAsync(CreateUserRequest request);
        Task<PagedResult<UserDto>> GetAllUsersAsync(UserFilterQuery query);
        Task<UserDto> UpdateUserAsync(Guid userId, UpdateUserRequest request);
        Task SetUserActiveAsync(Guid adminId, Guid userId, bool isActive);
        Task SoftDeleteUserAsync(Guid adminId, Guid userId);
    }
}
