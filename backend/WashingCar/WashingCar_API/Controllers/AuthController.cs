using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Domain.DTOs.Auth;
using WashingCar_Domain.DTOs.User;

namespace WashingCar_API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : BaseApiController
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Đăng nhập bằng email/mật khẩu.</summary>
    /// <remarks>
    /// Gọi: AuthService.LoginAsync → IUserRepository.GetByEmailAsync → PasswordHasher.VerifyHashedPassword
    /// → IJwtService.GenerateAccessToken + CreateRefreshTokenAsync (→ IRefreshTokenRepository.AddAsync + SaveChangesAsync).
    /// </remarks>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);
        return Success(response);
    }

    /// <summary>Kích hoạt tài khoản khách vãng lai (guest) đã có sẵn theo SĐT, gán mật khẩu + email.</summary>
    /// <remarks>
    /// Gọi: AuthService.ClaimGuestAccountAsync → IUserRepository.GetByPhoneAsync → GetByEmailAsync (check trùng)
    /// → UpdateAsync → ILoyaltyService.GetMyLoyaltyAsync (best-effort) → IJwtService.GenerateAccessToken + CreateRefreshTokenAsync.
    /// </remarks>
    [HttpPost("claim")]
    [AllowAnonymous]
    public async Task<IActionResult> ClaimGuestAccount([FromBody] ClaimAccountRequest request)
    {
        var response = await _authService.ClaimGuestAccountAsync(request);
        return Success(response, "Kích hoạt tài khoản thành công.");
    }

    /// <summary>Cấp access token mới từ refresh token còn hiệu lực (rotation — refresh token cũ bị thu hồi ngay).</summary>
    /// <remarks>
    /// Gọi: AuthService.RefreshTokenAsync → IJwtService.GetByTokenAsync (→ IRefreshTokenRepository.GetByTokenAsync)
    /// → RevokeAsync (→ SaveChangesAsync) → GenerateAccessToken + CreateRefreshTokenAsync.
    /// </remarks>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        var response = await _authService.RefreshTokenAsync(request.RefreshToken);
        return Success(response);
    }

    /// <summary>Đăng xuất — thu hồi refresh token hiện tại.</summary>
    /// <remarks>Gọi: AuthService.LogoutAsync → IJwtService.GetByTokenAsync → RevokeAsync.</remarks>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request)
    {
        await _authService.LogoutAsync(request.RefreshToken);
        return Success("Đăng xuất thành công.");
    }

    /// <summary>Đăng ký tài khoản Customer mới, auto-login sau khi đăng ký.</summary>
    /// <remarks>
    /// Gọi: AuthService.RegisterAsync → IUserRepository.ExistsAsync + ExistsPhoneAsync → CreateAsync
    /// → ILoyaltyService.GetMyLoyaltyAsync (best-effort) → IJwtService.GenerateAccessToken + CreateRefreshTokenAsync.
    /// </remarks>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var response = await _authService.RegisterAsync(request);
        return Success(response, "Đăng ký thành công.");
    }

    /// <summary>Đăng nhập bằng Google ID Token — tự tạo tài khoản Customer nếu email chưa từng đăng ký.</summary>
    /// <remarks>
    /// Gọi: AuthService.GoogleLoginAsync → Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync (external)
    /// → IUserRepository.GetByEmailAsync/CreateAsync → ILoyaltyService.GetMyLoyaltyAsync → IJwtService.*.
    /// </remarks>
    [HttpPost("google")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        var response = await _authService.GoogleLoginAsync(request.IdToken);
        return Success(response);
    }

    /// <summary>Gửi email đặt lại mật khẩu — luôn trả thành công kể cả email không tồn tại (chống user enumeration).</summary>
    /// <remarks>
    /// Gọi: AuthService.ForgotPasswordAsync → IUserRepository.GetByEmailAsync → IJwtService.GeneratePasswordResetToken
    /// → IEmailService.SendPasswordResetEmailAsync.
    /// </remarks>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        await _authService.ForgotPasswordAsync(request);
        return Success("Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.");
    }

    /// <summary>Đặt lại mật khẩu bằng token nhận qua email.</summary>
    /// <remarks>
    /// Gọi: AuthService.ResetPasswordAsync → IJwtService.ValidatePasswordResetToken → IUserRepository.GetByIdAsync → UpdateAsync.
    /// </remarks>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        await _authService.ResetPasswordAsync(request);
        return Success("Đặt lại mật khẩu thành công.");
    }

    /// <summary>Đổi mật khẩu (yêu cầu nhập đúng mật khẩu cũ).</summary>
    /// <remarks>
    /// Gọi: AuthService.ChangePasswordAsync → IUserRepository.GetByIdAsync → PasswordHasher.VerifyHashedPassword → UpdateAsync.
    /// </remarks>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        await _authService.ChangePasswordAsync(CurrentUserId, request);
        return Success("Đổi mật khẩu thành công.");
    }

    /// <summary>Lấy thông tin hồ sơ của chính người dùng đang đăng nhập.</summary>
    /// <remarks>Gọi: AuthService.GetProfileAsync → IUserRepository.GetByIdAsync.</remarks>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await _authService.GetProfileAsync(CurrentUserId);
        return Success(profile);
    }

    /// <summary>Cập nhật hồ sơ của chính mình (FullName/Email/PhoneNumber).</summary>
    /// <remarks>
    /// Gọi: AuthService.UpdateProfileAsync → IUserRepository.GetByIdAsync → GetByEmailAsync/ExistsPhoneAsync (check trùng) → UpdateAsync.
    /// </remarks>
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var profile = await _authService.UpdateProfileAsync(CurrentUserId, request);
        return Success(profile, "Cập nhật thông tin thành công.");
    }
}
