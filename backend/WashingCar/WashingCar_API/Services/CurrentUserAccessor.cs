using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using WashingCar_DAL.Interfaces;

namespace WashingCar_API.Services;

/// <summary>
/// Lấy id người dùng đang đăng nhập từ claim "sub" của JWT (MapInboundClaims = false nên claim giữ nguyên tên gốc).
/// Trả về null khi không có HttpContext hoặc request ẩn danh — vd background job, seeder.
/// </summary>
public class CurrentUserAccessor(IHttpContextAccessor httpContextAccessor) : ICurrentUserAccessor
{
    public Guid? UserId
    {
        get
        {
            var subject = httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return Guid.TryParse(subject, out var userId) ? userId : null;
        }
    }
}
