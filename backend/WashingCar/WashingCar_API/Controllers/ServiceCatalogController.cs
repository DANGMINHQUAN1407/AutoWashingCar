using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.ServiceCatalog;

namespace WashingCar_API.Controllers;

// GET: public — ai cũng xem được danh sách và chi tiết dịch vụ
// POST/PUT/activate/deactivate: Admin + Manager
[Route("api/service-catalog")]
public class ServiceCatalogController(IServiceCatalogService service) : BaseApiController
{
    private readonly IServiceCatalogService _service = service;

    /// <summary>Danh sách dịch vụ trong catalog, phân trang.</summary>
    /// <remarks>Gọi: ServiceCatalogService.GetAllPaginatedAsync → IServiceCatalogRepository.GetAllPaginatedAsync.</remarks>
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ServiceCatalogQuery query)
    {
        var result = await _service.GetAllPaginatedAsync(query);
        return Paged(result);
    }

    /// <summary>Chi tiết 1 dịch vụ.</summary>
    /// <remarks>Gọi: ServiceCatalogService.GetByIdAsync → IServiceCatalogRepository.GetByIdAsync.</remarks>
    [AllowAnonymous]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await _service.GetByIdAsync(id);
        return Success(item);
    }

    /// <summary>Tạo dịch vụ mới. Nếu người tạo là Manager, tự động gán dịch vụ vào chi nhánh của họ.</summary>
    /// <remarks>
    /// Gọi: ServiceCatalogService.CreateAsync → IServiceCatalogRepository.ExistsNameAsync → CreateAsync;
    /// nếu isManager → IBranchRepository.GetByManagerIdAsync + AddBranchServiceAsync + SaveChangesAsync.
    /// </remarks>
    [HttpPost]
    [Authorize(Roles = $"{UserRole.Manager}")]
    public async Task<IActionResult> Create([FromBody] CreateServiceCatalogRequest request)
    {
        var item = await _service.CreateAsync(request, CurrentUserId, User.IsInRole(UserRole.Manager));
        return Created(nameof(GetById), new { id = item.ServiceCatalogItemId }, item, "Tạo dịch vụ thành công.");
    }

    /// <summary>Cập nhật thông tin dịch vụ.</summary>
    /// <remarks>Gọi: ServiceCatalogService.UpdateAsync → IServiceCatalogRepository.GetByIdAsync + ExistsNameAsync → UpdateAsync.</remarks>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{UserRole.Manager}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateServiceCatalogRequest request)
    {
        var item = await _service.UpdateAsync(id, request);
        return Success(item, "Cập nhật dịch vụ thành công.");
    }

    /// <summary>Kích hoạt lại dịch vụ.</summary>
    /// <remarks>Gọi: ServiceCatalogService.SetActiveAsync(true) → IServiceCatalogRepository.GetByIdAsync → UpdateAsync.</remarks>
    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = $"{UserRole.Manager}")]
    public async Task<IActionResult> Activate(Guid id)
    {
        await _service.SetActiveAsync(id, isActive: true);
        return Success("Đã kích hoạt dịch vụ.");
    }

    /// <summary>Vô hiệu hóa dịch vụ.</summary>
    /// <remarks>Gọi: ServiceCatalogService.SetActiveAsync(false) → IServiceCatalogRepository.GetByIdAsync → UpdateAsync.</remarks>
    [HttpPost("{id:guid}/deactivate")]
    [Authorize(Roles = $"{UserRole.Manager}")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        await _service.SetActiveAsync(id, isActive: false);
        return Success("Đã vô hiệu hóa dịch vụ.");
    }
}
