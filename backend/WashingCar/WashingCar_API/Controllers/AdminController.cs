using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.User;

namespace WashingCar_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = UserRole.Admin)]
    public class AdminController : BaseApiController
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        /// <summary>Tạo tài khoản Staff/Manager với mật khẩu tạm sinh ngẫu nhiên.</summary>
        /// <remarks>
        /// Gọi: AdminService.CreateAccountStaffAsync → IUserRepository.GetByEmailAsync (check trùng) → CreateAsync
        /// → IEmailService.SendWelcomeEmailAsync.
        /// </remarks>
        [HttpPost("create-staff")]
        public async Task<IActionResult> CreateStaff([FromBody] CreateUserRequest request)
        {
            var response = await _adminService.CreateAccountStaffAsync(request);
            return Success(response, "Tạo tài khoản nhân viên thành công.");
        }

        /// <summary>Danh sách người dùng có phân trang, lọc theo search/role/isActive.</summary>
        /// <remarks>Gọi: AdminService.GetAllUsersAsync → IUserRepository.GetAllPaginatedAsync.</remarks>
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers([FromQuery] UserFilterQuery query)
        {
            var users = await _adminService.GetAllUsersAsync(query);
            return Success(users);
        }

        /// <summary>Cập nhật thông tin người dùng (chỉ Staff/Manager).</summary>
        /// <remarks>
        /// Gọi: AdminService.UpdateUserAsync → IUserRepository.GetByIdIncludeInactiveAsync → GetByEmailAsync (check trùng) → UpdateAsync.
        /// </remarks>
        [HttpPut("users/{id:guid}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
        {
            var user = await _adminService.UpdateUserAsync(id, request);
            return Success(user, "Cập nhật người dùng thành công.");
        }

        /// <summary>Xoá mềm người dùng (không tự xoá mình, không xoá Admin khác).</summary>
        /// <remarks>Gọi: AdminService.SoftDeleteUserAsync → IUserRepository.GetByIdIncludeInactiveAsync → UpdateAsync.</remarks>
        [HttpDelete("users/{id:guid}")]
        public async Task<IActionResult> SoftDeleteUser(Guid id)
        {
            await _adminService.SoftDeleteUserAsync(CurrentUserId, id);
            return Success("Đã xóa người dùng.");
        }

        /// <summary>Kích hoạt lại tài khoản đã bị vô hiệu hóa.</summary>
        /// <remarks>Gọi: AdminService.SetUserActiveAsync(isActive:true) → IUserRepository.GetByIdIncludeInactiveAsync → UpdateAsync.</remarks>
        [HttpPost("users/{id:guid}/activate")]
        public async Task<IActionResult> ActivateUser(Guid id)
        {
            await _adminService.SetUserActiveAsync(CurrentUserId, id, isActive: true);
            return Success("Đã kích hoạt người dùng.");
        }

        /// <summary>Vô hiệu hóa tài khoản (không tự khoá mình, không khoá Admin khác).</summary>
        /// <remarks>Gọi: AdminService.SetUserActiveAsync(isActive:false) → IUserRepository.GetByIdIncludeInactiveAsync → UpdateAsync.</remarks>
        [HttpPost("users/{id:guid}/deactivate")]
        public async Task<IActionResult> DeactivateUser(Guid id)
        {
            await _adminService.SetUserActiveAsync(CurrentUserId, id, isActive: false);
            return Success("Đã vô hiệu hóa người dùng.");
        }
    }
}
