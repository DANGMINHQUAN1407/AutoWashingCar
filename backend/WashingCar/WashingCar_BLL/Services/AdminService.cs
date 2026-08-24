using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Auth;
using WashingCar_Domain.DTOs.User;

namespace WashingCar_BLL.Services
{
    public class AdminService : IAdminService
    {
        private readonly IUserRepository       _userRepo;
        private readonly IEmailService         _emailService;
        private readonly PasswordHasher<User>  _hasher = new();
        private readonly ILogger<AdminService> _logger;

        public AdminService(
            IUserRepository       userRepo,
            IEmailService         emailService,
            ILogger<AdminService> logger)
        {
            _userRepo     = userRepo;
            _emailService = emailService;
            _logger       = logger;
        }

        // ─── CREATE ACCOUNT ──────────────────────────────────────────────────────

        /// <summary>Tạo tài khoản Staff/Manager (chặn tạo Admin qua API) với mật khẩu tạm sinh ngẫu nhiên.</summary>
        /// <remarks>
        /// Gọi: IUserRepository.GetByEmailAsync (check trùng) → CreateAsync → IEmailService.SendWelcomeEmailAsync.
        /// </remarks>
        public async Task<UserDto> CreateAccountStaffAsync(CreateUserRequest request)
        {
            try
            {
                _logger.LogInformation("Creating new staff account for email: {Email}", request.Email);
                // Validate role chỉ Staff hoặc Manager
                if (request.Role != UserRole.Staff && request.Role != UserRole.Manager)
                {
                    throw AppException.BadRequest(ValidationMessage.Common.InvalidRole);
                }
                // Kiểm tra email tồn tại chưa
                if (!string.IsNullOrWhiteSpace(request.Email))
                {
                    var existing = await _userRepo.GetByEmailAsync(request.Email);
                    if (existing != null)
                        throw AppException.Conflict(ValidationMessage.Common.EmailAlreadyExists);
                }
                // Tạo mật khẩu tạm ngẫu nhiên
                var tempPassword = GenerateTempPassword();

                var user = new User
                {
                    FullName = request.FullName,
                    Email = request.Email,
                    PhoneNumber = request.PhoneNumber,
                    Role = request.Role,
                    IsActive = true,
                    IsGuest = false,
                    IsDeleted = false,
                    CreatedAtUtc = DateTime.UtcNow,
                    RowVersion = [],
                };

                user.PasswordHash = _hasher.HashPassword(user, tempPassword);
                await _userRepo.CreateAsync(user);
                if (!string.IsNullOrWhiteSpace(user.Email))
                    await _emailService.SendWelcomeEmailAsync(user.Email, user.FullName, tempPassword);

                return user.ToDto();
            }
            catch (AppException)
            {
                throw;
            }
        }

        // ─── UPDATE USER INFO ────────────────────────────────────────────────────

        /// <summary>Cập nhật thông tin người dùng — dùng bản include-inactive vì Admin phải sửa được cả user đã bị khoá.</summary>
        /// <remarks>
        /// Gọi: IUserRepository.GetByIdIncludeInactiveAsync → GetByEmailAsync (check trùng, loại trừ chính user) → UpdateAsync.
        /// </remarks>
        public async Task<UserDto> UpdateUserAsync(Guid userId, UpdateUserRequest request)
        {
            _logger.LogInformation("Updating user {UserId}", userId);

            // 1. Tìm user (bao gồm cả inactive — admin được sửa user đã khóa)
            var user = await _userRepo.GetByIdIncludeInactiveAsync(userId)
                ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);

            // 2. Validate Role — chỉ cho phép đổi qua lại giữa Staff và Manager; Customer và Admin giữ nguyên role
            if (request.Role != UserRole.Staff && request.Role != UserRole.Manager && request.Role != user.Role)
                throw AppException.BadRequest(ValidationMessage.Common.InvalidRole);

            // 3. Nếu Email thay đổi → check trùng với user khác
            if (!string.IsNullOrWhiteSpace(request.Email) &&
                !string.Equals(request.Email, user.Email, StringComparison.OrdinalIgnoreCase))
            {
                var existing = await _userRepo.GetByEmailAsync(request.Email);
                if (existing != null && existing.UserId != userId)
                    throw AppException.Conflict(ValidationMessage.Common.EmailInUse);
            }

            // 4. Update field + UpdatedAtUtc (audit)
            user.FullName     = request.FullName;
            user.Email        = request.Email;
            user.PhoneNumber  = request.PhoneNumber;
            user.Role         = request.Role;
            user.UpdatedAtUtc = DateTime.UtcNow;

            await _userRepo.UpdateAsync(user);

            return user.ToDto();
        }

        // ─── ACTIVATE / DEACTIVATE USER ──────────────────────────────────────────

        /// <summary>Bật/tắt tài khoản — không tự khoá chính mình, không khoá được Admin khác.</summary>
        /// <remarks>Gọi: IUserRepository.GetByIdIncludeInactiveAsync → UpdateAsync.</remarks>
        public async Task SetUserActiveAsync(Guid adminId, Guid userId, bool isActive)
        {
            _logger.LogInformation(
                "Admin {AdminId} setting user {UserId} active={IsActive}",
                adminId, userId, isActive);                     // ← đủ 3 arg

            var user = await _userRepo.GetByIdIncludeInactiveAsync(userId)
                ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);

            if (user.UserId == adminId)                          // ← actorId → adminId
                throw AppException.BadRequest(ValidationMessage.Admin.CannotChangeOwnStatus);

            if (!isActive && user.Role == UserRole.Admin)
                throw AppException.Forbidden(ValidationMessage.Admin.CannotDisableAdmin);

            if (user.IsActive == isActive)
            {
                _logger.LogInformation(
                    "User {UserId} đã ở trạng thái IsActive={IsActive} — bỏ qua", userId, isActive);
                return;
            }

            user.IsActive = isActive;
            user.UpdatedAtUtc = DateTime.UtcNow;
            await _userRepo.UpdateAsync(user);
        }

        // ─── SOFT DELETE USER ────────────────────────────────────────────────────

        /// <summary>Xoá mềm người dùng — không tự xoá mình, không xoá Admin khác, giữ lại lịch sử FK.</summary>
        /// <remarks>Gọi: IUserRepository.GetByIdIncludeInactiveAsync → UpdateAsync.</remarks>
        public async Task SoftDeleteUserAsync(Guid adminId, Guid userId)
        {
            _logger.LogInformation("Admin {AdminId} soft-deleting user {UserId}", adminId, userId);

            var user = await _userRepo.GetByIdIncludeInactiveAsync(userId)
                ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);

            if (user.UserId == adminId)
                throw AppException.BadRequest(ValidationMessage.Admin.CannotDeleteSelf);

            if (user.Role == UserRole.Admin)
                throw AppException.Forbidden(ValidationMessage.Admin.CannotDeleteAdmin);

            user.IsDeleted = true;
            user.IsActive = false;
            user.DeletedAtUtc = DateTime.UtcNow;
            user.DeletedByUserId = adminId;
            user.UpdatedAtUtc = DateTime.UtcNow;
            await _userRepo.UpdateAsync(user);

            _logger.LogInformation("User {UserId} soft-deleted by {AdminId}", userId, adminId);
        }

        // ─── GET ALL USERS (PAGINATED) ───────────────────────────────────────────

        /// <summary>Danh sách người dùng có phân trang, lọc theo search/role/isActive.</summary>
        /// <remarks>Gọi: IUserRepository.GetAllPaginatedAsync.</remarks>
        public async Task<PagedResult<UserDto>> GetAllUsersAsync(UserFilterQuery query)
        {
            var (users, totalCount) = await _userRepo.GetAllPaginatedAsync(query);

            var items = users.Select(u => u.ToDto()).ToList();

            _logger.LogInformation(
                "Retrieved {Count}/{Total} users — page {Page}, search='{Search}', role='{Role}'",
                items.Count, totalCount, query.Page, query.Search, query.Role);

            return new PagedResult<UserDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = query.Page,
                PageSize = query.PageSize
            };
        }

        // ─── HELPER ──────────────────────────────────────────────────────────────
        private static string GenerateTempPassword(int length = 12)
        {
            const string validChars = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%^&*?";
            var bytes = new byte[length];
            System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
            var chars = new char[length];
            for (int i = 0; i < length; i++)
            {
                chars[i] = validChars[bytes[i] % validChars.Length];
            }
            return new string(chars);
        }

    }
}
