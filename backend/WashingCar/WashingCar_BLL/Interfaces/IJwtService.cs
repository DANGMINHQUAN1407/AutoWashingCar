using WashingCar_DAL.Entities;

namespace WashingCar_BLL.Interfaces;

public interface IJwtService
{
    // Access token
    string GenerateAccessToken(User user, out DateTime expiresAt);

    // Refresh token — DB operations
    Task<RefreshToken>  CreateRefreshTokenAsync(Guid userId);
    Task<RefreshToken?> GetByTokenAsync(string token);
    Task                RevokeAsync(RefreshToken token);

    // Password reset token — JWT ngắn hạn (15 phút), không cần DB
    string GeneratePasswordResetToken(Guid userId, out DateTime expiresAt);
    Guid?  ValidatePasswordResetToken(string token);  // null nếu invalid/expired
}
