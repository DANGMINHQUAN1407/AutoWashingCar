using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.ServicePricing;

namespace WashingCar_API.Controllers;

/// <summary>
/// API bảng giá global theo dịch vụ, loại xe và động cơ.
/// Giá active có thể đọc công khai; chỉ Admin được cấu hình hoặc xem rule inactive.
/// </summary>
[Route("api/service-catalog")]
public class ServicePricingController(IServicePricingService service) : BaseApiController
{
    private readonly IServicePricingService _service = service;

    /// <summary>Lấy các rule giá của một dịch vụ.</summary>
    [AllowAnonymous]
    [HttpGet("{serviceId:guid}/pricing")]
    public async Task<IActionResult> GetForService(
        Guid serviceId,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var canViewInactive = User.IsInRole(UserRole.Admin);
        var result = await _service.GetForServiceAsync(
            serviceId,
            includeInactive && canViewInactive,
            ct);
        return Success(result);
    }

    /// <summary>Tạo rule giá cho service leaf. Chỉ Admin được thực hiện.</summary>
    [Authorize(Roles = UserRole.Admin)]
    [HttpPost("pricing")]
    public async Task<IActionResult> Create(
        [FromBody] CreateServicePricingRequest request,
        CancellationToken ct = default)
    {
        var result = await _service.CreateAsync(request, ct);
        return Success(result, "Tạo cấu hình giá thành công.");
    }

    /// <summary>Cập nhật giá, thời lượng hoặc trạng thái của rule.</summary>
    [Authorize(Roles = UserRole.Admin)]
    [HttpPut("pricing/{pricingId:guid}")]
    public async Task<IActionResult> Update(
        Guid pricingId,
        [FromBody] UpdateServicePricingRequest request,
        CancellationToken ct = default)
    {
        var result = await _service.UpdateAsync(pricingId, request, ct);
        return Success(result, "Cập nhật cấu hình giá thành công.");
    }

    /// <summary>Kích hoạt rule giá.</summary>
    [Authorize(Roles = UserRole.Admin)]
    [HttpPost("pricing/{pricingId:guid}/activate")]
    public async Task<IActionResult> Activate(
        Guid pricingId,
        CancellationToken ct = default)
    {
        await _service.SetActiveAsync(pricingId, true, ct);
        return Success("Đã kích hoạt cấu hình giá.");
    }

    /// <summary>Vô hiệu hóa rule giá.</summary>
    [Authorize(Roles = UserRole.Admin)]
    [HttpPost("pricing/{pricingId:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(
        Guid pricingId,
        CancellationToken ct = default)
    {
        await _service.SetActiveAsync(pricingId, false, ct);
        return Success("Đã vô hiệu hóa cấu hình giá.");
    }
}
