using WashingCar_Domain.DTOs.Auth;
using WashingCar_Domain.DTOs.User;

namespace WashingCar_BLL.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<LoginResponse> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);

    Task<LoginResponse> RegisterAsync(RegisterRequest request);
    Task<LoginResponse> ClaimGuestAccountAsync(ClaimAccountRequest request);

    Task<LoginResponse> GoogleLoginAsync(string idToken);

    Task ForgotPasswordAsync(ForgotPasswordRequest request);
    Task ResetPasswordAsync(ResetPasswordRequest request);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request);

    Task<UserDto> GetProfileAsync(Guid userId);
    Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);

    
}
