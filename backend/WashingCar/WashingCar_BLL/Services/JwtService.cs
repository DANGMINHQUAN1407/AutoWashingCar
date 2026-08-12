using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using WashingCar_BLL.Interfaces;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;

namespace WashingCar_BLL.Services
{

    public class JwtService : IJwtService
    {
        private readonly IConfiguration _config;
        private readonly IRefreshTokenRepository _refreshTokenRepo;
        private readonly SymmetricSecurityKey _signingKey;

        public JwtService(IConfiguration config, IRefreshTokenRepository refreshTokenRepo)
        {
            _config = config;
            _refreshTokenRepo = refreshTokenRepo;

            var keyValue = config["Jwt:Key"]
                ?? throw new InvalidOperationException("Missing 'Jwt:Key' configuration.");
            _signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyValue));
        }

        // ─── ACCESS TOKEN ────────────────────────────────────────────────────────

        /// <summary>Sinh access token JWT (HS256, claim sub/email/name/role/jti, hạn Jwt:ExpireMinutes).</summary>
        /// <remarks>Không gọi Repository — chỉ build token trong bộ nhớ, chỉ Auth/JwtService gọi lẫn nhau.</remarks>
        public string GenerateAccessToken(User user, out DateTime expiresAt)
        {
            expiresAt = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_config["Jwt:ExpireMinutes"]));

            var claims = new[]
            {
            new Claim(JwtRegisteredClaimNames.Sub,   user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email    ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Name,  user.FullName ?? string.Empty),
            new Claim("role",                        user.Role),          // tên ngắn, khớp RoleClaimType ở DI
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
        };

            return BuildToken(claims, expiresAt);
        }

        // ─── REFRESH TOKEN — DB operations ──────────────────────────────────────

        /// <summary>Sinh refresh token (64 byte ngẫu nhiên, base64) và lưu DB, hạn 7 ngày.</summary>
        /// <remarks>Gọi: IRefreshTokenRepository.AddAsync → SaveChangesAsync.</remarks>
        public async Task<RefreshToken> CreateRefreshTokenAsync(Guid userId)
        {
            var token = new RefreshToken
            {
                UserId = userId,
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                CreatedAtUtc = DateTime.UtcNow
            };

            await _refreshTokenRepo.AddAsync(token);
            await _refreshTokenRepo.SaveChangesAsync();
            return token;
        }

        /// <summary>Tra refresh token theo chuỗi token.</summary>
        /// <remarks>Gọi: IRefreshTokenRepository.GetByTokenAsync.</remarks>
        public Task<RefreshToken?> GetByTokenAsync(string token)
            => _refreshTokenRepo.GetByTokenAsync(token);

        /// <summary>Thu hồi refresh token (chỉ set RevokedAtUtc, không xoá row — giữ để audit).</summary>
        /// <remarks>Gọi: IRefreshTokenRepository.SaveChangesAsync.</remarks>
        public async Task RevokeAsync(RefreshToken token)
        {
            token.RevokedAtUtc = DateTime.UtcNow;
            await _refreshTokenRepo.SaveChangesAsync();
        }

        // ─── PASSWORD RESET TOKEN — JWT ngắn hạn (15'), không lưu DB ────────────

        /// <summary>Sinh JWT ngắn hạn (15') dùng riêng cho đặt lại mật khẩu, claim purpose=password-reset, không lưu DB.</summary>
        /// <remarks>Không gọi Repository.</remarks>
        public string GeneratePasswordResetToken(Guid userId, out DateTime expiresAt)
        {
            expiresAt = DateTime.UtcNow.AddMinutes(15);

            var claims = new[]
            {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("purpose",                   "password-reset"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

            return BuildToken(claims, expiresAt);
        }

        /// <summary>Verify password-reset token: chữ ký + hạn + đúng claim purpose. Trả về userId hoặc null nếu invalid.</summary>
        /// <remarks>Không gọi Repository — verify hoàn toàn stateless bằng SymmetricSecurityKey.</remarks>
        public Guid? ValidatePasswordResetToken(string token)
        {
            // MapInboundClaims=false: handler thủ công KHÔNG remap "sub" → nameidentifier,
            var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
            try
            {
                var principal = handler.ValidateToken(token,
                    new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = _config["Jwt:Issuer"],
                        ValidAudience = _config["Jwt:Audience"],
                        IssuerSigningKey = _signingKey,
                        ClockSkew = TimeSpan.Zero
                    }, out _);

                if (principal.FindFirst("purpose")?.Value != "password-reset")
                    return null;

                var sub = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                return Guid.TryParse(sub, out var userId) ? userId : null;
            }
            catch
            {
                return null;
            }
        }

        // ─── helpers ────────────────────────────────────────────────────────────
        private string BuildToken(IEnumerable<Claim> claims, DateTime expiresAt)
        {
            var creds = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: expiresAt,
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
