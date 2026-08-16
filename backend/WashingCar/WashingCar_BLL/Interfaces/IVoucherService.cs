using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Voucher;

namespace WashingCar_BLL.Interfaces;

public interface IVoucherService
{
    Task<VoucherDto> CreateDraftAsync(Guid creatorId, CreateVoucherRequest request, CancellationToken ct = default);
    Task<VoucherDto> CreateAdminVoucherAsync(Guid adminId, CreateVoucherRequest request, CancellationToken ct = default);
    Task<VoucherDto> UpdateDraftAsync(Guid userId, Guid voucherId, UpdateVoucherRequest request, CancellationToken ct = default);
    Task<VoucherDto> GetByIdAsync(Guid voucherId, CancellationToken ct = default);
    Task<PagedResult<VoucherDto>> BrowseVouchersAsync(Guid userId, string role, VoucherSearchFilter filter, CancellationToken ct = default);
    Task<VoucherDto> SetActiveAsync(Guid userId, Guid voucherId, bool isActive, CancellationToken ct = default);
    Task DeleteVoucherAsync(Guid voucherId, CancellationToken ct = default);
}
