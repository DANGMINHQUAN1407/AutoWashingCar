using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Voucher;

namespace WashingCar_DAL.Repositories;

public class VoucherRepository(WashingCarDbContext db) : IVoucherRepository
{
    private readonly WashingCarDbContext _db = db;

    public async Task<Voucher?> GetByIdAsync(Guid voucherId, CancellationToken ct = default)
        => await _db.Vouchers
            .Include(v => v.Branch)
            .Include(v => v.CreatedByUser)
            .Include(v => v.ApprovedByUser)
            .FirstOrDefaultAsync(v => v.VoucherId == voucherId, ct);

    public async Task<Voucher?> GetByCodeAsync(string code, CancellationToken ct = default)
        => await _db.Vouchers
            .Include(v => v.Branch)
            .Include(v => v.CreatedByUser)
            .Include(v => v.ApprovedByUser)
            .FirstOrDefaultAsync(v => v.VoucherCode == code.ToUpperInvariant(), ct);

    public async Task<bool> ExistsCodeAsync(string code, Guid? excludeId = null, CancellationToken ct = default)
        => await _db.Vouchers
            .AnyAsync(v => v.VoucherCode == code.ToUpperInvariant() && (excludeId == null || v.VoucherId != excludeId.Value), ct);

    public async Task<(List<Voucher> Items, int TotalCount)> GetPagedAsync(VoucherSearchFilter filter, CancellationToken ct = default)
    {
        var q = _db.Vouchers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Code))
            q = q.Where(v => v.VoucherCode.Contains(filter.Code.ToUpperInvariant()));

        if (filter.VoucherType.HasValue)
            q = q.Where(v => v.VoucherType == filter.VoucherType.Value);

        if (filter.ApprovalStatus.HasValue)
            q = q.Where(v => v.ApprovalStatus == filter.ApprovalStatus.Value);

        if (filter.IsActive.HasValue)
            q = q.Where(v => v.IsActive == filter.IsActive.Value);

        if (filter.BranchId.HasValue)
        {
            if (filter.IncludeSystemVouchers)
                q = q.Where(v => v.BranchId == filter.BranchId.Value || v.BranchId == null);
            else
                q = q.Where(v => v.BranchId == filter.BranchId.Value);
        }

        var total = await q.CountAsync(ct);

        var items = await q
            .Include(v => v.Branch)
            .Include(v => v.CreatedByUser)
            .Include(v => v.ApprovedByUser)
            .OrderByDescending(v => v.CreatedAtUtc)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task AddAsync(Voucher voucher, CancellationToken ct = default)
        => await _db.Vouchers.AddAsync(voucher, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);

    // TierVoucher CRUD
    public async Task<TierVoucher?> GetTierVoucherByIdAsync(Guid tierVoucherId, CancellationToken ct = default)
        => await _db.TierVouchers
            .Include(tv => tv.Tier)
            .Include(tv => tv.Voucher)
            .FirstOrDefaultAsync(tv => tv.TierVoucherId == tierVoucherId, ct);

    public async Task<bool> ExistsTierVoucherPairAsync(Guid tierId, Guid voucherId, Guid? excludeId = null, CancellationToken ct = default)
        => await _db.TierVouchers
            .AnyAsync(tv => tv.TierId == tierId && tv.VoucherId == voucherId && (excludeId == null || tv.TierVoucherId != excludeId.Value), ct);

    public async Task<(List<TierVoucher> Items, int TotalCount)> GetTierVouchersPagedAsync(WashingCar_Domain.DTOs.Common.PaginationQuery query, CancellationToken ct = default)
    {
        var q = _db.TierVouchers.AsQueryable();
        var total = await q.CountAsync(ct);
        var items = await q
            .Include(tv => tv.Tier)
            .Include(tv => tv.Voucher)
            .OrderByDescending(tv => tv.CreatedAtUtc)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task AddTierVoucherAsync(TierVoucher tierVoucher, CancellationToken ct = default)
        => await _db.TierVouchers.AddAsync(tierVoucher, ct);

    public void RemoveTierVoucher(TierVoucher tierVoucher)
        => _db.TierVouchers.Remove(tierVoucher);

    // Customer operations
    public async Task<List<Guid>> GetTierSpecificVoucherIdsAsync(CancellationToken ct = default)
    {
        return await _db.TierVouchers
            .Select(tv => tv.VoucherId)
            .Distinct()
            .ToListAsync(ct);
    }

    public async Task<List<TierVoucher>> GetTierVouchersByTierIdAsync(Guid tierId, CancellationToken ct = default)
        => await _db.TierVouchers
            .Include(tv => tv.Voucher)
            .ThenInclude(v => v.Branch)
            .Where(tv => tv.TierId == tierId)
            .ToListAsync(ct);

    public async Task<bool> HasUserRedeemedVoucherAsync(Guid userId, Guid voucherId, CancellationToken ct = default)
        => await _db.UserVouchers
            .AnyAsync(uv => uv.UserId == userId && uv.VoucherId == voucherId, ct);

    public async Task<UserVoucher?> GetUserVoucherByIdAsync(Guid userVoucherId, CancellationToken ct = default)
        => await _db.UserVouchers
            .Include(uv => uv.Voucher)
            .FirstOrDefaultAsync(uv => uv.UserVoucherId == userVoucherId, ct);

    public async Task<UserVoucher?> GetUserVoucherAsync(Guid userId, Guid voucherId, CancellationToken ct = default)
        => await _db.UserVouchers
            .Include(uv => uv.Voucher)
            .FirstOrDefaultAsync(uv => uv.UserId == userId && uv.VoucherId == voucherId, ct);

    public async Task<(List<UserVoucher> Items, int TotalCount)> GetUserVouchersPagedAsync(Guid userId, UserVoucherQuery query, CancellationToken ct = default)
    {
        var q = _db.UserVouchers.Where(uv => uv.UserId == userId);
        var now = DateTime.UtcNow;

        if (query.VoucherStatus.HasValue)
        {
            if (query.VoucherStatus.Value == 1) // Chưa sử dụng (Active / Unused)
            {
                q = q.Where(uv => uv.VoucherStatus == 1 && uv.ExpiredAtUtc > now);
            }
            else if (query.VoucherStatus.Value == 3) // Đã hết hạn (Expired)
            {
                q = q.Where(uv => uv.VoucherStatus == 3 || (uv.VoucherStatus == 1 && uv.ExpiredAtUtc <= now));
            }
            else
            {
                q = q.Where(uv => uv.VoucherStatus == query.VoucherStatus.Value);
            }
        }
        if (query.BranchId.HasValue)
        {
            q = q.Where(uv => uv.Voucher.BranchId == query.BranchId.Value || uv.Voucher.BranchId == null);
        }
        var total = await q.CountAsync(ct);
        var items = await q
            .Include(uv => uv.Voucher)
            .OrderByDescending(uv => uv.RedeemedAtUtc)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task AddUserVoucherAsync(UserVoucher userVoucher, CancellationToken ct = default)
        => await _db.UserVouchers.AddAsync(userVoucher, ct);

    public async Task<List<Voucher>> GetActiveSystemVouchersAsync(DateTime now, CancellationToken ct = default)
    {
        var tierSpecificIds = await GetTierSpecificVoucherIdsAsync(ct);
        return await _db.Vouchers
            .Where(v => v.BranchId == null 
                        && v.IsActive 
                        && v.ApprovalStatus == VoucherApprovalStatus.Approved 
                        && v.StartUtc <= now 
                        && v.EndUtc > now
                        && v.UsedCount < v.Quantity
                        && !tierSpecificIds.Contains(v.VoucherId))
            .ToListAsync(ct);
    }
}
