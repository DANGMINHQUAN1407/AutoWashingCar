using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_Common.Helpers;
using WashingCar_Common.Settings;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Auth;
using WashingCar_Domain.DTOs.User;

namespace WashingCar_BLL.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository       _userRepo;
    private readonly IJwtService           _jwtService;
    private readonly IEmailService         _emailService;
    private readonly ILoyaltyService       _loyaltyService;
    private readonly AppSettings           _appSettings;
    private readonly GoogleAuthSettings    _googleSettings;
    private readonly PasswordHasher<User>  _hasher = new();
    private readonly ILogger<AuthService>  _logger;

    public AuthService(
        IUserRepository             userRepo,
        IJwtService                 jwtService,
        IEmailService                 emailService,
        ILoyaltyService             loyaltyService,
        IOptions<AppSettings>       appSettings,
        IOptions<GoogleAuthSettings> googleSettings,
        ILogger<AuthService>        logger)
    {
        _userRepo       = userRepo;
        _jwtService     = jwtService;
        _emailService   = emailService;
        _loyaltyService = loyaltyService;
        _appSettings    = appSettings.Value;
        _googleSettings = googleSettings.Value;
        _logger         = logger;
    }

    // ─── LOGIN ──────────────────────────────────────────────────────────────

    /// <summary>Đăng nhập email/mật khẩu. Cùng 1 message lỗi cho "sai email" và "sai mật khẩu" (chống user enumeration).</summary>
    /// <remarks>
    /// Gọi: IUserRepository.GetByEmailAsync → PasswordHasher.VerifyHashedPassword
    /// → IJwtService.GenerateAccessToken + CreateRefreshTokenAsync (→ IRefreshTokenRepository.AddAsync + SaveChangesAsync).
    /// </remarks>
    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        _logger.LogInformation("Login attempt for email: {Email}", EmailHelper.Mask(request.Email));

        var user = await _userRepo.GetByEmailAsync(request.Email);

        if (user is null || user.PasswordHash is null)
        {
            _logger.LogWarning("Login failed — email not found: {Email}", EmailHelper.Mask(request.Email));
            throw AppException.Unauthorized(ValidationMessage.Auth.InvalidCredentials);
        }

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            _logger.LogWarning("Login failed — wrong password for userId: {UserId}", user.UserId);
            throw AppException.Unauthorized(ValidationMessage.Auth.InvalidCredentials);
        }

        var accessToken = _jwtService.GenerateAccessToken(user, out var expiresAt);
        var refreshToken = await _jwtService.CreateRefreshTokenAsync(user.UserId);

        _logger.LogInformation("Login success — userId: {UserId}, role: {Role}", user.UserId, user.Role);

        return new LoginResponse { AccessToken = accessToken, RefreshToken = refreshToken.Token };
    }

    // ─── CLAIM GUEST ACCOUNT ────────────────────────────────────────────────

    /// <summary>Kích hoạt tài khoản khách vãng lai (guest, do Staff tạo lúc walk-in) bằng SĐT — gán mật khẩu + email.</summary>
    /// <remarks>
    /// Gọi: IUserRepository.GetByPhoneAsync → GetByEmailAsync (check trùng) → UpdateAsync
    /// → ILoyaltyService.GetMyLoyaltyAsync (best-effort) → IJwtService.GenerateAccessToken + CreateRefreshTokenAsync.
    /// </remarks>
    public async Task<LoginResponse> ClaimGuestAccountAsync(ClaimAccountRequest request)
    {
        _logger.LogInformation("Claim guest account - phone: {Phone}", request.PhoneNumber);

        //1. Tìm guest user theo SĐT
        var user = await _userRepo.GetByPhoneAsync(request.PhoneNumber);

        if(user is null || !user.IsGuest)
        throw AppException.NotFound(ValidationMessage.Auth.GuestAccountNotFound);

        if(!user.IsActive || user.IsDeleted)
        throw AppException.Forbidden(ValidationMessage.Auth.AccountDisabled);

        //2. Check email chưa bị user khác dùng
        var emailOwer = await _userRepo.GetByEmailAsync(request.Email);
        if (emailOwer is not null && emailOwer.UserId != user.UserId)
        throw AppException.Conflict(ValidationMessage.Common.EmailInUseByOther);

        //3. Kích hoạt: set password + email + bỏ flag guest
        user.PasswordHash = _hasher.HashPassword(user, request.Password);
        user.Email = request.Email;
        user.IsGuest = false;



        user.UpdatedAtUtc = DateTime.UtcNow;
        await _userRepo.UpdateAsync(user);

        //4. Tạo Loyalty account nếu chưa có (guest walk-in có thể đã có từ lần Close trước)
        try
        {
            await _loyaltyService.GetMyLoyaltyAsync(user.UserId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Loyalty account check cho user {UserId} thất bại", user.UserId);
        }

        //5. Cấp token - login
        var accessToken = _jwtService.GenerateAccessToken(user, out var expiresAt);
        var refreshToken = await _jwtService.CreateRefreshTokenAsync(user.UserId);

        _logger.LogInformation("Guest account claimed — userId: {UserId}", user.UserId);
        return new LoginResponse { AccessToken = accessToken, RefreshToken = refreshToken.Token };
    }

    // ─── REFRESH TOKEN ───────────────────────────────────────────────────────

    /// <summary>Cấp access token mới từ refresh token — rotation: token cũ bị thu hồi ngay để chống replay.</summary>
    /// <remarks>
    /// Gọi: IJwtService.GetByTokenAsync (→ IRefreshTokenRepository.GetByTokenAsync) → RevokeAsync (→ SaveChangesAsync)
    /// → GenerateAccessToken + CreateRefreshTokenAsync.
    /// </remarks>
    public async Task<LoginResponse> RefreshTokenAsync(string token)
    {
        _logger.LogInformation("Refresh token request");

        var existing = await _jwtService.GetByTokenAsync(token);

        if (existing is null || existing.RevokedAtUtc is not null || existing.ExpiresAtUtc < DateTime.UtcNow)
        {
            _logger.LogWarning("Refresh token invalid or expired");
            throw AppException.Unauthorized(ValidationMessage.Auth.RefreshTokenInvalid);
        }

        if (!existing.User.IsActive || existing.User.IsDeleted)
        {
            _logger.LogWarning("Refresh token rejected — inactive user: {UserId}", existing.UserId);
            throw AppException.Unauthorized(ValidationMessage.Auth.AccountInactive);
        }

        await _jwtService.RevokeAsync(existing);

        var accessToken = _jwtService.GenerateAccessToken(existing.User, out var expiresAt);
        var newRefreshToken = await _jwtService.CreateRefreshTokenAsync(existing.UserId);

        _logger.LogInformation("Refresh token rotated — userId: {UserId}", existing.UserId);

        return new LoginResponse { AccessToken = accessToken, RefreshToken = newRefreshToken.Token };
    }

    // ─── LOGOUT ─────────────────────────────────────────────────────────────

    /// <summary>Đăng xuất — thu hồi refresh token, im lặng nếu token không tồn tại/đã revoke.</summary>
    /// <remarks>Gọi: IJwtService.GetByTokenAsync → RevokeAsync.</remarks>
    public async Task LogoutAsync(string token)
    {
        var existing = await _jwtService.GetByTokenAsync(token);

        if (existing is not null && existing.RevokedAtUtc is null)
        {
            await _jwtService.RevokeAsync(existing);
            _logger.LogInformation("User logged out — userId: {UserId}", existing.UserId);
        }
    }

    // ─── REGISTER ───────────────────────────────────────────────────────────

    /// <summary>Đăng ký tài khoản Customer mới, auto-login sau khi đăng ký.</summary>
    /// <remarks>
    /// Gọi: IUserRepository.ExistsAsync + ExistsPhoneAsync → CreateAsync → ILoyaltyService.GetMyLoyaltyAsync (best-effort)
    /// → IJwtService.GenerateAccessToken + CreateRefreshTokenAsync.
    /// </remarks>
    public async Task<LoginResponse> RegisterAsync(RegisterRequest request)
    {
        _logger.LogInformation("Register attempt for email: {Email}", EmailHelper.Mask(request.Email));

        // 1. Kiểm tra email đã tồn tại chưa
        if (await _userRepo.ExistsAsync(request.Email))
        {
            _logger.LogWarning("Register failed — email already exists: {Email}", EmailHelper.Mask(request.Email));
            throw AppException.Conflict(ValidationMessage.Common.EmailInUse);
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber) &&
            await _userRepo.ExistsPhoneAsync(request.PhoneNumber))
            throw AppException.Conflict(ValidationMessage.Common.PhoneInUse);

        // 2. Tạo user entity + hash password
        var user = new User
        {
            UserId       = Guid.NewGuid(),
            FullName     = request.FullName,
            Email        = request.Email,
            PhoneNumber  = request.PhoneNumber,
            Role         = UserRole.Customer,
            IsGuest      = false,
            IsActive     = true,
            IsDeleted    = false,
            CreatedAtUtc = DateTime.UtcNow,
            RowVersion   = [],
        };
        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        // 3. Lưu user vào DB
        await _userRepo.CreateAsync(user);

        // 4. Tạo loyalty account (hạng Member) cho customer
        try { await _loyaltyService.GetMyLoyaltyAsync(user.UserId); }
        catch (Exception ex) { _logger.LogWarning(ex, "Không tạo được loyalty account cho user {UserId}", user.UserId); }

        // 5. Tạo token và trả về LoginResponse
        var accessToken  = _jwtService.GenerateAccessToken(user, out var expiresAt);
        var refreshToken = await _jwtService.CreateRefreshTokenAsync(user.UserId);

        _logger.LogInformation("Register success — userId: {UserId}", user.UserId);

        return new LoginResponse { AccessToken = accessToken, RefreshToken = refreshToken.Token };
    }

    // ─── GOOGLE LOGIN ─────────────────────────────────────────────────────────

    /// <summary>Đăng nhập bằng Google ID Token — verify chữ ký qua Google, tự tạo tài khoản Customer nếu email chưa từng đăng ký.</summary>
    /// <remarks>
    /// Gọi: Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync (external) → IUserRepository.GetByEmailAsync/CreateAsync
    /// → ILoyaltyService.GetMyLoyaltyAsync (best-effort, user mới) → IJwtService.GenerateAccessToken + CreateRefreshTokenAsync.
    /// </remarks>
    public async Task<LoginResponse> GoogleLoginAsync(string idToken)
    {
        _logger.LogInformation("Google login attempt");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _googleSettings.ClientId }
            };
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
        }
        catch (InvalidJwtException)
        {
            throw AppException.Unauthorized(ValidationMessage.Auth.GoogleTokenInvalid);
        }

        var user = await _userRepo.GetByEmailAsync(payload.Email);

        if (user is not null)
        {
            if (!user.IsActive || user.IsDeleted)
                throw AppException.Forbidden(ValidationMessage.Auth.AccountDisabled);
        }
        else
        {
            user = new User
            {
                UserId       = Guid.NewGuid(),
                FullName     = payload.Name ?? payload.Email,
                Email        = payload.Email,
                Role         = UserRole.Customer,
                IsGuest      = false,
                IsActive     = true,
                IsDeleted    = false,
                CreatedAtUtc = DateTime.UtcNow,
                RowVersion   = [],
            };
            await _userRepo.CreateAsync(user);

            try { await _loyaltyService.GetMyLoyaltyAsync(user.UserId); }
            catch (Exception ex) { _logger.LogWarning(ex, "Không tạo được loyalty account cho Google user {UserId}", user.UserId); }

            _logger.LogInformation("Google login — new user created: {UserId}", user.UserId);
        }

        var accessToken  = _jwtService.GenerateAccessToken(user, out _);
        var refreshToken = await _jwtService.CreateRefreshTokenAsync(user.UserId);

        _logger.LogInformation("Google login success — userId: {UserId}, role: {Role}", user.UserId, user.Role);

        return new LoginResponse { AccessToken = accessToken, RefreshToken = refreshToken.Token };
    }

    // ─── FORGOT PASSWORD ─────────────────────────────────────────────────────

    /// <summary>Gửi email đặt lại mật khẩu — luôn trả về thành công kể cả email không tồn tại (chống user enumeration).</summary>
    /// <remarks>
    /// Gọi: IUserRepository.GetByEmailAsync → IJwtService.GeneratePasswordResetToken → IEmailService.SendPasswordResetEmailAsync.
    /// </remarks>
    public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        _logger.LogInformation("Forgot password request for: {Email}", EmailHelper.Mask(request.Email));

        var user = await _userRepo.GetByEmailAsync(request.Email);

        // Không tiết lộ email có tồn tại hay không — luôn trả về success
        if (user is null || !user.IsActive || user.IsDeleted)
        {
            _logger.LogWarning("Forgot password — user not found or inactive: {Email}", EmailHelper.Mask(request.Email));
            return;
        }

        var resetToken = _jwtService.GeneratePasswordResetToken(user.UserId, out var expiresAt);
        var resetLink  = $"{_appSettings.FrontendUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}";

        await _emailService.SendPasswordResetEmailAsync(user.Email!, resetLink, expiresAt);
        _logger.LogInformation("Password reset email sent — userId: {UserId}, expires: {ExpiresAt}", user.UserId, expiresAt);
    }

    // ─── RESET PASSWORD ──────────────────────────────────────────────────────

    /// <summary>Đặt lại mật khẩu bằng token nhận qua email.</summary>
    /// <remarks>Gọi: IJwtService.ValidatePasswordResetToken → IUserRepository.GetByIdAsync → UpdateAsync.</remarks>
    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        var userId = _jwtService.ValidatePasswordResetToken(request.Token)
            ?? throw AppException.BadRequest(ValidationMessage.Auth.ResetTokenInvalid);

        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Auth.UserNotExist);

        if (!user.IsActive || user.IsDeleted)
            throw AppException.Forbidden(ValidationMessage.Auth.AccountInactive);

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _userRepo.UpdateAsync(user);

        _logger.LogInformation("Password reset success — userId: {UserId}", userId);
    }

    // ─── CHANGE PASSWORD ─────────────────────────────────────────────────────

    /// <summary>Đổi mật khẩu — bắt buộc nhập đúng mật khẩu cũ, chặn tài khoản chưa có mật khẩu (Google-only).</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync → PasswordHasher.VerifyHashedPassword → UpdateAsync.</remarks>
    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Auth.UserNotExist);

        if (user.PasswordHash is null)
            throw AppException.BadRequest(ValidationMessage.Auth.NoPasswordAccount);

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.OldPassword);
        if (result == PasswordVerificationResult.Failed)
            throw AppException.BadRequest(ValidationMessage.Auth.OldPasswordIncorrect);

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _userRepo.UpdateAsync(user);

        _logger.LogInformation("Password changed — userId: {UserId}", userId);
    }

    // ─── UPDATE PROFILE ─────────────────────────────────────────────────────

    /// <summary>Lấy hồ sơ của chính người dùng.</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync.</remarks>
    public async Task<UserDto> GetProfileAsync(Guid userId)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);
        return user.ToDto();
    }

    /// <summary>Cập nhật hồ sơ của chính mình — check trùng email/phone loại trừ chính bản thân.</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync → GetByEmailAsync/ExistsPhoneAsync (check trùng) → UpdateAsync.</remarks>
    public async Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);

        if (!string.IsNullOrWhiteSpace(request.Email) &&
            !string.Equals(request.Email, user.Email, StringComparison.OrdinalIgnoreCase))
        {
            var existing = await _userRepo.GetByEmailAsync(request.Email);
            if (existing != null && existing.UserId != userId)
                throw AppException.Conflict(ValidationMessage.Common.EmailInUseByOther);
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber) &&
            !string.Equals(request.PhoneNumber, user.PhoneNumber, StringComparison.Ordinal))
        {
            if (await _userRepo.ExistsPhoneAsync(request.PhoneNumber))
                throw AppException.Conflict(ValidationMessage.Common.PhoneInUseByOther);
        }

        user.FullName = request.FullName;
        if (!string.IsNullOrWhiteSpace(request.Email))       user.Email       = request.Email;
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber)) user.PhoneNumber = request.PhoneNumber;
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _userRepo.UpdateAsync(user);

        _logger.LogInformation("User {UserId} updated profile", userId);
        return user.ToDto();
    }


}
