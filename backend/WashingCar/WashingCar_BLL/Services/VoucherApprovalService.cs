using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Voucher;

namespace WashingCar_BLL.Services;

/// <summary>Manager phê duyệt/từ chối voucher draft do Staff soạn — tách riêng khỏi VoucherService (draft/CRUD).</summary>
public class VoucherApprovalService(
    IVoucherRepository voucherRepo,
    IUserRepository userRepo,
    ILogger<VoucherApprovalService> logger) : IVoucherApprovalService
{
    private readonly IVoucherRepository _voucherRepo = voucherRepo;
    private readonly IUserRepository _userRepo = userRepo;
    private readonly ILogger<VoucherApprovalService> _logger = logger;

    /// <summary>Phê duyệt voucher — tự động kích hoạt (IsActive=true).</summary>
    /// <remarks>Gọi: IVoucherRepository.GetByIdAsync → IUserRepository.GetByIdAsync → SaveChangesAsync → GetByIdAsync.</remarks>
    public async Task<VoucherDto> ApproveAsync(Guid approverId, Guid voucherId, CancellationToken ct = default)
    {
        var voucher = await _voucherRepo.GetByIdAsync(voucherId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.NotFound);

        if (voucher.ApprovalStatus != VoucherApprovalStatus.Pending)
            throw AppException.BadRequest(ValidationMessage.Voucher.NotPendingApproval);

        // For testing purposes, we allow self-approval
        // if (voucher.CreatedByUserId == approverId)
        //     throw AppException.Forbidden("Bạn không thể tự phê duyệt voucher do chính mình tạo ra");

        var approver = await _userRepo.GetByIdAsync(approverId)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.ApproverNotFound);

        if (approver.Role == UserRole.Manager)
        {
            if (voucher.BranchId.HasValue && approver.BranchId.HasValue && voucher.BranchId.Value != approver.BranchId.Value)
                throw AppException.Forbidden(ValidationMessage.Voucher.ManagerBranchMismatchApprove(voucher.BranchId, approver.BranchId));
        }

        voucher.ApprovalStatus   = VoucherApprovalStatus.Approved;
        voucher.ApprovedByUserId = approverId;
        voucher.ApprovedAtUtc    = DateTime.UtcNow;
        voucher.IsActive         = true; // Tự động kích hoạt khi duyệt

        await _voucherRepo.SaveChangesAsync(ct);
        _logger.LogInformation("Voucher {Code} approved by Manager {ApproverId}", voucher.VoucherCode, approverId);

        return (await _voucherRepo.GetByIdAsync(voucherId, ct))!.ToDto();
    }

    /// <summary>Từ chối voucher.</summary>
    /// <remarks>Gọi: IVoucherRepository.GetByIdAsync → IUserRepository.GetByIdAsync → SaveChangesAsync → GetByIdAsync.</remarks>
    public async Task<VoucherDto> RejectAsync(Guid approverId, Guid voucherId, CancellationToken ct = default)
    {
        var voucher = await _voucherRepo.GetByIdAsync(voucherId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.NotFound);

        if (voucher.ApprovalStatus != VoucherApprovalStatus.Pending)
            throw AppException.BadRequest(ValidationMessage.Voucher.NotPendingApproval);

        // For testing purposes, allow self-rejection
        // if (voucher.CreatedByUserId == approverId)
        //     throw AppException.Forbidden("Bạn không thể từ chối voucher do chính mình tạo ra");

        var approver = await _userRepo.GetByIdAsync(approverId)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.ApproverNotFound);

        if (approver.Role == UserRole.Manager)
        {
            if (voucher.BranchId.HasValue && approver.BranchId.HasValue && voucher.BranchId.Value != approver.BranchId.Value)
                throw AppException.Forbidden(ValidationMessage.Voucher.ManagerBranchMismatchReject(voucher.BranchId, approver.BranchId));
        }

        voucher.ApprovalStatus   = VoucherApprovalStatus.Rejected;
        voucher.ApprovedByUserId = approverId;
        voucher.ApprovedAtUtc    = DateTime.UtcNow;
        voucher.IsActive         = false; // Từ chối thì bắt buộc IsActive = false

        await _voucherRepo.SaveChangesAsync(ct);
        _logger.LogInformation("Voucher {Code} rejected by Manager {ApproverId}", voucher.VoucherCode, approverId);

        return (await _voucherRepo.GetByIdAsync(voucherId, ct))!.ToDto();
    }

    /// <summary>Phê duyệt hàng loạt.</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync → IVoucherRepository.GetByIdAsync (loop) → SaveChangesAsync (1 lần cuối).</remarks>
    public async Task<List<VoucherDto>> BulkApproveAsync(Guid approverId, List<Guid> voucherIds, CancellationToken ct = default)
    {
        var approver = await _userRepo.GetByIdAsync(approverId)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.ApproverNotFound);

        var approvedList = new List<VoucherDto>();
        foreach (var id in voucherIds)
        {
            var voucher = await _voucherRepo.GetByIdAsync(id, ct)
                ?? throw AppException.NotFound(ValidationMessage.Voucher.NotFoundWithId(id));

            if (voucher.ApprovalStatus != VoucherApprovalStatus.Pending)
                throw AppException.BadRequest(ValidationMessage.Voucher.NotPendingApprovalWithCode(voucher.VoucherCode));

            // For testing
            // if (voucher.CreatedByUserId == approverId)
            //     throw AppException.Forbidden($"Bạn không thể tự phê duyệt voucher '{voucher.VoucherCode}' do chính mình tạo ra");

            if (approver.Role == UserRole.Manager)
            {
                if (voucher.BranchId.HasValue && approver.BranchId.HasValue && voucher.BranchId.Value != approver.BranchId.Value)
                    throw AppException.Forbidden(ValidationMessage.Voucher.ManagerBranchMismatchBulkApprove(voucher.VoucherCode));
            }

            voucher.ApprovalStatus   = VoucherApprovalStatus.Approved;
            voucher.ApprovedByUserId = approverId;
            voucher.ApprovedAtUtc    = DateTime.UtcNow;
            voucher.IsActive         = true;

            approvedList.Add(voucher.ToDto());
        }

        await _voucherRepo.SaveChangesAsync(ct);
        _logger.LogInformation("Bulk approved {Count} vouchers by Manager {ApproverId}", voucherIds.Count, approverId);
        return approvedList;
    }

    /// <summary>Từ chối hàng loạt.</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync → IVoucherRepository.GetByIdAsync (loop) → SaveChangesAsync (1 lần cuối).</remarks>
    public async Task<List<VoucherDto>> BulkRejectAsync(Guid approverId, List<Guid> voucherIds, CancellationToken ct = default)
    {
        var approver = await _userRepo.GetByIdAsync(approverId)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.ApproverNotFound);

        var rejectedList = new List<VoucherDto>();
        foreach (var id in voucherIds)
        {
            var voucher = await _voucherRepo.GetByIdAsync(id, ct)
                ?? throw AppException.NotFound(ValidationMessage.Voucher.NotFoundWithId(id));

            if (voucher.ApprovalStatus != VoucherApprovalStatus.Pending)
                throw AppException.BadRequest(ValidationMessage.Voucher.NotPendingApprovalWithCode(voucher.VoucherCode));

            // For testing
            // if (voucher.CreatedByUserId == approverId)
            //     throw AppException.Forbidden($"Bạn không thể tự từ chối phê duyệt voucher '{voucher.VoucherCode}' do chính mình tạo ra");

            if (approver.Role == UserRole.Manager)
            {
                if (voucher.BranchId.HasValue && approver.BranchId.HasValue && voucher.BranchId.Value != approver.BranchId.Value)
                    throw AppException.Forbidden(ValidationMessage.Voucher.ManagerBranchMismatchBulkReject(voucher.VoucherCode));
            }

            voucher.ApprovalStatus   = VoucherApprovalStatus.Rejected;
            voucher.ApprovedByUserId = approverId;
            voucher.ApprovedAtUtc    = DateTime.UtcNow;
            voucher.IsActive         = false;

            rejectedList.Add(voucher.ToDto());
        }

        await _voucherRepo.SaveChangesAsync(ct);
        _logger.LogInformation("Bulk rejected {Count} vouchers by Manager {ApproverId}", voucherIds.Count, approverId);
        return rejectedList;
    }
}
