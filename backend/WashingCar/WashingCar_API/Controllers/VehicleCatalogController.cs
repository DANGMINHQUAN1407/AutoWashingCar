using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.VehicleCatalog;

namespace WashingCar_API.Controllers;

[Route("api/vehicle-catalogs")]
public class VehicleCatalogController(IVehicleCatalogService service) : BaseApiController
{
    private readonly IVehicleCatalogService _service = service;
    private const string ManageRoles = $"{UserRole.Admin},{UserRole.Manager}";

    [AllowAnonymous]
    [HttpGet("engine-types")]
    public async Task<IActionResult> GetEngineTypes([FromQuery] VehicleCatalogQuery query)
        => Paged(await _service.GetEngineTypesAsync(query));

    [AllowAnonymous]
    [HttpGet("engine-types/{id:guid}")]
    public async Task<IActionResult> GetEngineTypeById(Guid id)
        => Success(await _service.GetEngineTypeByIdAsync(id));

    [Authorize(Roles = ManageRoles)]
    [HttpPost("engine-types")]
    public async Task<IActionResult> CreateEngineType([FromBody] CreateVehicleCatalogRequest request)
    {
        var item = await _service.CreateEngineTypeAsync(request);
        return Created(nameof(GetEngineTypeById), new { id = item.Id }, item, "Tạo loại động cơ thành công.");
    }

    [Authorize(Roles = ManageRoles)]
    [HttpPut("engine-types/{id:guid}")]
    public async Task<IActionResult> UpdateEngineType(Guid id, [FromBody] UpdateVehicleCatalogRequest request)
        => Success(await _service.UpdateEngineTypeAsync(id, request), "Cập nhật loại động cơ thành công.");

    [Authorize(Roles = ManageRoles)]
    [HttpPost("engine-types/{id:guid}/activate")]
    public async Task<IActionResult> ActivateEngineType(Guid id)
    {
        await _service.SetEngineTypeActiveAsync(id, true);
        return Success("Đã kích hoạt loại động cơ.");
    }

    [Authorize(Roles = ManageRoles)]
    [HttpPost("engine-types/{id:guid}/deactivate")]
    public async Task<IActionResult> DeactivateEngineType(Guid id)
    {
        await _service.SetEngineTypeActiveAsync(id, false);
        return Success("Đã vô hiệu hóa loại động cơ.");
    }

    [AllowAnonymous]
    [HttpGet("body-styles")]
    public async Task<IActionResult> GetBodyStyles([FromQuery] VehicleCatalogQuery query)
        => Paged(await _service.GetBodyStylesAsync(query));

    [AllowAnonymous]
    [HttpGet("body-styles/{id:guid}")]
    public async Task<IActionResult> GetBodyStyleById(Guid id)
        => Success(await _service.GetBodyStyleByIdAsync(id));

    [Authorize(Roles = ManageRoles)]
    [HttpPost("body-styles")]
    public async Task<IActionResult> CreateBodyStyle([FromBody] CreateVehicleCatalogRequest request)
    {
        var item = await _service.CreateBodyStyleAsync(request);
        return Created(nameof(GetBodyStyleById), new { id = item.Id }, item, "Tạo kiểu dáng xe thành công.");
    }

    [Authorize(Roles = ManageRoles)]
    [HttpPut("body-styles/{id:guid}")]
    public async Task<IActionResult> UpdateBodyStyle(Guid id, [FromBody] UpdateVehicleCatalogRequest request)
        => Success(await _service.UpdateBodyStyleAsync(id, request), "Cập nhật kiểu dáng xe thành công.");

    [Authorize(Roles = ManageRoles)]
    [HttpPost("body-styles/{id:guid}/activate")]
    public async Task<IActionResult> ActivateBodyStyle(Guid id)
    {
        await _service.SetBodyStyleActiveAsync(id, true);
        return Success("Đã kích hoạt kiểu dáng xe.");
    }

    [Authorize(Roles = ManageRoles)]
    [HttpPost("body-styles/{id:guid}/deactivate")]
    public async Task<IActionResult> DeactivateBodyStyle(Guid id)
    {
        await _service.SetBodyStyleActiveAsync(id, false);
        return Success("Đã vô hiệu hóa kiểu dáng xe.");
    }
    [AllowAnonymous]
    [HttpGet("brands")]
    public async Task<IActionResult> GetBrands([FromQuery] VehicleCatalogQuery query)
        => Paged(await _service.GetBrandsAsync(query));

    [AllowAnonymous]
    [HttpGet("brands/{id:guid}")]
    public async Task<IActionResult> GetBrandById(Guid id)
        => Success(await _service.GetBrandByIdAsync(id));

    [Authorize(Roles = ManageRoles)]
    [HttpPost("brands")]
    public async Task<IActionResult> CreateBrand([FromBody] CreateVehicleCatalogRequest request)
    {
        var item = await _service.CreateBrandAsync(request);
        return Created(nameof(GetBrandById), new { id = item.Id }, item, "Tạo hãng xe thành công.");
    }

    [Authorize(Roles = ManageRoles)]
    [HttpPut("brands/{id:guid}")]
    public async Task<IActionResult> UpdateBrand(Guid id, [FromBody] UpdateVehicleCatalogRequest request)
        => Success(await _service.UpdateBrandAsync(id, request), "Cập nhật hãng xe thành công.");

    [Authorize(Roles = ManageRoles)]
    [HttpPost("brands/{id:guid}/activate")]
    public async Task<IActionResult> ActivateBrand(Guid id)
    {
        await _service.SetBrandActiveAsync(id, true);
        return Success("Đã kích hoạt hãng xe.");
    }

    [Authorize(Roles = ManageRoles)]
    [HttpPost("brands/{id:guid}/deactivate")]
    public async Task<IActionResult> DeactivateBrand(Guid id)
    {
        await _service.SetBrandActiveAsync(id, false);
        return Success("Đã vô hiệu hóa hãng xe.");
    }
}
