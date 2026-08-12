using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Voucher;

namespace WashingCar_BLL.Mappers;

public static class VoucherMapper
{
    public static VoucherDto ToDto(this Voucher v) => new()
    {
        VoucherId           = v.VoucherId,
        VoucherCode         = v.VoucherCode,
        VoucherType         = v.VoucherType,
        VoucherTypeName     = v.VoucherType == 1 ? "System" : v.VoucherType == 2 ? "Branch" : v.VoucherType == 3 ? "Tier" : "Unknown",
        DiscountType        = v.DiscountType,
        DiscountTypeName    = v.DiscountType == 1 ? "Phần trăm" : v.DiscountType == 2 ? "Tiền mặt" : "Không xác định",
        DiscountValue       = v.DiscountValue,
        MinOrderAmount      = v.MinOrderAmount,
        MaxDiscountAmount   = v.MaxDiscountAmount,
        Quantity            = v.Quantity,
        UsedCount           = v.UsedCount,
        StartUtc            = v.StartUtc,
        EndUtc              = v.EndUtc,
        RequiredPoints      = v.RequiredPoints,
        IsActive            = v.IsActive,
        ApprovalStatus      = v.ApprovalStatus,
        BranchId            = v.BranchId,
        BranchName          = v.Branch?.Name,
        CreatedByUserId     = v.CreatedByUserId,
        CreatedByUserName   = v.CreatedByUser?.FullName ?? "Unknown",
        ApprovedByUserId    = v.ApprovedByUserId,
        ApprovedByUserName  = v.ApprovedByUser?.FullName,
        ApprovedAtUtc       = v.ApprovedAtUtc,
        CreatedAtUtc        = v.CreatedAtUtc,
    };

    public static TierVoucherDto ToDto(this TierVoucher tv) => new()
    {
        TierVoucherId  = tv.TierVoucherId,
        TierId         = tv.TierId,
        TierName       = tv.Tier?.TierName ?? "Unknown",
        VoucherId      = tv.VoucherId,
        VoucherCode    = tv.Voucher?.VoucherCode ?? "Unknown",
        RequiredPoints = tv.RequiredPoints,
        CreatedAtUtc   = tv.CreatedAtUtc
    };

    public static UserVoucherDto ToDto(this UserVoucher uv) => new()
    {
        UserVoucherId     = uv.UserVoucherId,
        UserId            = uv.UserId,
        VoucherId         = uv.VoucherId,
        VoucherCode       = uv.Voucher?.VoucherCode ?? "Unknown",
        VoucherType       = uv.Voucher?.VoucherType ?? 0,
        VoucherTypeName   = uv.Voucher?.VoucherType == 1 ? "System" : uv.Voucher?.VoucherType == 2 ? "Branch" : uv.Voucher?.VoucherType == 3 ? "Tier" : "Unknown",
        DiscountType      = uv.Voucher?.DiscountType ?? 0,
        DiscountTypeName  = uv.Voucher?.DiscountType == 1 ? "Phần trăm" : uv.Voucher?.DiscountType == 2 ? "Tiền mặt" : "Không xác định",
        DiscountValue     = uv.Voucher?.DiscountValue ?? 0m,
        MinOrderAmount    = uv.Voucher?.MinOrderAmount,
        MaxDiscountAmount = uv.Voucher?.MaxDiscountAmount,
        VoucherStatus     = (uv.VoucherStatus == 1 && uv.ExpiredAtUtc < DateTime.UtcNow) ? (byte)3 : uv.VoucherStatus,
        VoucherStatusName = (uv.VoucherStatus == 1 && uv.ExpiredAtUtc < DateTime.UtcNow) ? "Hết hạn" :
                            uv.VoucherStatus == 1 ? "Chưa sử dụng" : 
                            uv.VoucherStatus == 2 ? "Đã sử dụng" : 
                            uv.VoucherStatus == 3 ? "Hết hạn" : "Không xác định",
        RedeemedPoints    = uv.RedeemedPoints,
        RedeemedAtUtc     = uv.RedeemedAtUtc,
        ExpiredAtUtc      = uv.ExpiredAtUtc,
        UsedAtUtc         = uv.UsedAtUtc
    };

    public static AvailableVoucherDto ToAvailableDto(this Voucher v, int requiredPoints) => new()
    {
        VoucherId         = v.VoucherId,
        VoucherCode       = v.VoucherCode,
        VoucherType       = v.VoucherType,
        VoucherTypeName   = v.VoucherType == 1 ? "System" : v.VoucherType == 2 ? "Branch" : v.VoucherType == 3 ? "Tier" : "Unknown",
        DiscountType      = v.DiscountType,
        DiscountTypeName  = v.DiscountType == 1 ? "Phần trăm" : v.DiscountType == 2 ? "Tiền mặt" : "Không xác định",
        DiscountValue     = v.DiscountValue,
        MinOrderAmount    = v.MinOrderAmount,
        MaxDiscountAmount = v.MaxDiscountAmount,
        Quantity          = v.Quantity,
        UsedCount         = v.UsedCount,
        StartUtc          = v.StartUtc,
        EndUtc            = v.EndUtc,
        BranchId          = v.BranchId,
        BranchName        = v.Branch?.Name,
        RequiredPoints    = requiredPoints
    };
}
