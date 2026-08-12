using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using WashingCar_Domain.DTOs.Voucher;

namespace WashingCar_BLL.Interfaces;

public interface IVoucherApprovalService
{
    Task<VoucherDto> ApproveAsync(Guid approverId, Guid voucherId, CancellationToken ct = default);
    Task<VoucherDto> RejectAsync(Guid approverId, Guid voucherId, CancellationToken ct = default);
    Task<List<VoucherDto>> BulkApproveAsync(Guid approverId, List<Guid> voucherIds, CancellationToken ct = default);
    Task<List<VoucherDto>> BulkRejectAsync(Guid approverId, List<Guid> voucherIds, CancellationToken ct = default);
}
