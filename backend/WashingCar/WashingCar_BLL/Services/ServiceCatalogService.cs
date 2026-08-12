using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.ServiceCatalog;

namespace WashingCar_BLL.Services
{

    public class ServiceCatalogService : IServiceCatalogService
    {
        private readonly IServiceCatalogRepository _repo;
        private readonly IBranchRepository _branchRepo;
        private readonly ILogger<ServiceCatalogService> _logger;
        public ServiceCatalogService(
            IServiceCatalogRepository repo,
            IBranchRepository branchRepo,
            ILogger<ServiceCatalogService> logger)
        {
            _repo = repo;
            _branchRepo = branchRepo;
            _logger = logger;
        }

        /// <summary>Danh sách dịch vụ toàn hệ thống (danh mục chung), có lọc + phân trang. Dùng cho màn hình quản lý của Admin.</summary>
        /// <remarks>Gọi: IServiceCatalogRepository.GetAllPaginatedAsync.</remarks>
        public async Task<PagedResult<ServiceCatalogDto>> GetAllPaginatedAsync(ServiceCatalogQuery query)
        {
            var (items, totalCount) = await _repo.GetAllPaginatedAsync(query);

            _logger.LogInformation(
                "Retrieved {Count}/{Total} service catalog items — page {Page}",
                items.Count, totalCount, query.Page);

            return new PagedResult<ServiceCatalogDto>
            {
                Items = items.Select(s => s.ToDto()).ToList(),
                TotalCount = totalCount,
                PageNumber = query.Page,
                PageSize = query.PageSize,
            };
        }

        /// <summary>Chi tiết 1 dịch vụ theo Id. Ném 404 nếu không tồn tại.</summary>
        /// <remarks>Gọi: IServiceCatalogRepository.GetByIdAsync.</remarks>
        public async Task<ServiceCatalogDto> GetByIdAsync(Guid id)
        {
            var item = await _repo.GetByIdAsync(id)
                ?? throw AppException.NotFound(ValidationMessage.ServiceCatalog.NotFound);
            return item.ToDto();
        }

        /// <summary>Tạo dịch vụ mới. Nếu người tạo là Manager, tự động gán dịch vụ vào chi nhánh của họ.</summary>
        /// <remarks>
        /// Gọi: IServiceCatalogRepository.ExistsNameAsync → CreateAsync; nếu isManager → IBranchRepository.GetByManagerIdAsync
        /// → AddBranchServiceAsync + SaveChangesAsync.
        /// </remarks>
        public async Task<ServiceCatalogDto> CreateAsync(CreateServiceCatalogRequest request, Guid? currentUserId = null, bool isManager = false)
        {
            if (await _repo.ExistsNameAsync(request.ServiceName))
                throw AppException.Conflict(ValidationMessage.ServiceCatalog.NameExists);

            var item = new ServiceCatalogItem
            {
                ServiceName = request.ServiceName,
                Description = request.Description,
                BasePrice = request.BasePrice,
                DurationMinutes = request.DurationMinutes,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
            };

            var created = await _repo.CreateAsync(item);

            // Nếu người tạo là Manager, tự động gán dịch vụ này vào chi nhánh của họ
            if (isManager && currentUserId.HasValue)
            {
                var branch = await _branchRepo.GetByManagerIdAsync(currentUserId.Value);
                if (branch != null)
                {
                    var branchService = new WashingCar_DAL.Entities.BranchService
                    {
                        BranchId = branch.BranchId,
                        ServiceCatalogItemId = created.ServiceCatalogItemId,
                        IsActive = true,
                        AddedAtUtc = DateTime.UtcNow
                    };
                    await _branchRepo.AddBranchServiceAsync(branchService);
                    await _branchRepo.SaveChangesAsync();
                    _logger.LogInformation("Auto-assigned service {ServiceId} to branch {BranchId} managed by manager {ManagerId}",
                        created.ServiceCatalogItemId, branch.BranchId, currentUserId.Value);
                }
            }

            _logger.LogInformation("Created service catalog item {Id}", created.ServiceCatalogItemId);
            return created.ToDto();
        }

        /// <summary>Cập nhật tên/mô tả/giá/thời lượng của dịch vụ (định nghĩa chung toàn hệ thống). Tên phải vẫn duy nhất (bỏ qua chính nó). Không đổi giá đã snapshot trên các booking cũ.</summary>
        /// <remarks>Gọi: IServiceCatalogRepository.GetByIdAsync + ExistsNameAsync (excludeId) → UpdateAsync.</remarks>
        public async Task<ServiceCatalogDto> UpdateAsync(Guid id, UpdateServiceCatalogRequest request)
        {
            var item = await _repo.GetByIdAsync(id)
                ?? throw AppException.NotFound(ValidationMessage.ServiceCatalog.NotFound);

            if (await _repo.ExistsNameAsync(request.ServiceName, excludeId: id))
                throw AppException.Conflict(ValidationMessage.ServiceCatalog.NameExists);

            item.ServiceName = request.ServiceName;
            item.Description = request.Description;
            item.BasePrice = request.BasePrice;
            item.DurationMinutes = request.DurationMinutes;

            await _repo.UpdateAsync(item);
            _logger.LogInformation("Updated service catalog item {Id}", id);
            return item.ToDto();
        }

        /// <summary>Bật/tắt dịch vụ ở cấp danh mục chung. Tắt thì không chọn được cho booking mới nhưng vẫn giữ trên booking cũ. Bỏ qua nếu trạng thái không đổi.</summary>
        /// <remarks>Gọi: IServiceCatalogRepository.GetByIdAsync → UpdateAsync.</remarks>
        public async Task SetActiveAsync(Guid id, bool isActive)
        {
            var item = await _repo.GetByIdAsync(id)
                ?? throw AppException.NotFound(ValidationMessage.ServiceCatalog.NotFound);

            if (item.IsActive == isActive) return;

            item.IsActive = isActive;
            await _repo.UpdateAsync(item);
            _logger.LogInformation("Service {Id} IsActive={IsActive}", id, isActive);
        }
    }
}
