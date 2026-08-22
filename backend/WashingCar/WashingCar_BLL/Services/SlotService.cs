using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Slot;

namespace WashingCar_BLL.Services;

public class SlotService : ISlotService
{
    private readonly ISlotRepository slotRepo;
    private readonly ILogger<SlotService> logger;

    public SlotService(ISlotRepository slotRepo, ILogger<SlotService> logger)
    {
        this.slotRepo = slotRepo;
        this.logger = logger;
    }

    /// <summary>
    /// Tạo 1 slot thủ công.
    /// Validate: EndTime > StartTime, không trùng slot cùng (BranchId, Date, StartTime).
    /// </summary>
    /// <remarks>Gọi: ISlotRepository.ExistsAsync → AddAsync + SaveChangesAsync.</remarks>
    public async Task<SlotDto> CreateAsync(Guid branchId, CreateSlotRequest request, CancellationToken ct = default)
    {
        if (request.SlotEndTime <= request.SlotStartTime)
            throw AppException.BadRequest(ValidationMessage.Slot.EndTimeAfterStart);

        if (await slotRepo.ExistsAsync(branchId, request.SlotDate, request.SlotStartTime, ct))
            throw AppException.Conflict(ValidationMessage.Slot.AlreadyExists);

        var slot = new SlotInventory
        {
            BranchId      = branchId,
            SlotDate      = request.SlotDate,
            SlotStartTime = request.SlotStartTime,
            SlotEndTime   = request.SlotEndTime,
            Capacity      = request.Capacity,
            CreatedAtUtc  = DateTime.UtcNow,
        };

        await slotRepo.AddAsync(slot, ct);
        await slotRepo.SaveChangesAsync(ct);

        logger.LogInformation("Created slot {Id} for branch {BranchId} on {Date} {Start}-{End}",
            slot.SlotInventoryId, branchId, request.SlotDate, request.SlotStartTime, request.SlotEndTime);
        return slot.ToDto();
    }

    /// <summary>
    /// Xóa slot (hard delete).
    /// Từ chối nếu slot đã có booking — phải hủy booking trước mới xóa được.
    /// </summary>
    /// <remarks>Gọi: ISlotRepository.GetByIdAsync + HasBookingsAsync → RemoveAsync + SaveChangesAsync.</remarks>
    public async Task DeleteAsync(
        Guid slotId,
        Guid? managerBranchId = null,
        CancellationToken ct = default)
    {
        var slot = await slotRepo.GetByIdAsync(slotId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Slot.NotFound);

        EnsureManagerBranchScope(slot, managerBranchId);

        if (await slotRepo.HasBookingsAsync(slotId, ct))
            throw AppException.BadRequest(ValidationMessage.Slot.HasBookingsCannotDelete);

        await slotRepo.RemoveAsync(slot, ct);
        await slotRepo.SaveChangesAsync(ct);

        logger.LogInformation("Deleted slot {Id}", slotId);
    }

    /// <summary>
    /// Tạo hàng loạt slot theo khoảng ngày.
    /// Logic: mỗi ngày trong [FromDate..ToDate], tạo các slot từ OpenTime đến CloseTime
    /// theo bước SlotDurationMinutes. Slot đã tồn tại sẽ bị bỏ qua (idempotent).
    /// Bulk insert 1 lần duy nhất sau khi duyệt xong toàn bộ.
    /// Trả về số slot thực sự được tạo mới.
    /// </summary>
    /// <remarks>Gọi: ISlotRepository.ExistsAsync (loop mỗi slot) → AddRangeAsync + SaveChangesAsync.</remarks>
    public async Task<int> GenerateAsync(Guid branchId, GenerateSlotsRequest request, CancellationToken ct = default)
    {
        if (request.ToDate < request.FromDate)
            throw AppException.BadRequest(ValidationMessage.Slot.ToDateBeforeFromDate);

        if (request.CloseTime <= request.OpenTime)
            throw AppException.BadRequest(ValidationMessage.Slot.CloseTimeBeforeOpenTime);

        var toAdd   = new List<SlotInventory>();
        var current = request.FromDate;

        while (current <= request.ToDate)
        {
            int initialMinutes = request.OpenTime.Hour * 60 + request.OpenTime.Minute;
            int startMinutes = initialMinutes;
            int endMinutes = request.CloseTime.Hour * 60 + request.CloseTime.Minute;

            while (startMinutes + request.SlotDurationMinutes <= endMinutes)
            {
                var slotStart = request.OpenTime.AddMinutes(startMinutes - initialMinutes);
                var slotEnd = slotStart.AddMinutes(request.SlotDurationMinutes);

                if (!await slotRepo.ExistsAsync(branchId, current, slotStart, ct))
                {
                    toAdd.Add(new SlotInventory
                    {
                        BranchId      = branchId,
                        SlotDate      = current,
                        SlotStartTime = slotStart,
                        SlotEndTime   = slotEnd,
                        Capacity      = request.Capacity,
                        CreatedAtUtc  = DateTime.UtcNow,
                    });
                }

                startMinutes += request.SlotDurationMinutes;
            }

            current = current.AddDays(1);
        }

        if (toAdd.Count == 0)
            return 0;

        await slotRepo.AddRangeAsync(toAdd, ct);
        await slotRepo.SaveChangesAsync(ct);

        logger.LogInformation("Generated {Count} slots for branch {BranchId}", toAdd.Count, branchId);
        return toAdd.Count;
    }

    /// <summary>
    /// Lấy slot còn chỗ trống: Capacity > OnlineReservedCount + WalkInReservedCount.
    /// Dùng cho trang đặt lịch của khách hàng.
    /// </summary>
    /// <remarks>Gọi: ISlotRepository.GetAvailableAsync.</remarks>
    public async Task<List<SlotDto>> GetAvailableAsync(Guid branchId, DateOnly date, CancellationToken ct = default)
    {
        var slots = await slotRepo.GetAvailableAsync(branchId, date, ct);
        return slots.Select(s => s.ToDto()).ToList();
    }

    /// <summary>
    /// Lấy 1 slot theo ID, trả về 404 nếu không tồn tại.
    /// </summary>
    /// <remarks>Gọi: ISlotRepository.GetByIdAsync.</remarks>
    public async Task<SlotDto> GetByIdAsync(
        Guid slotId,
        Guid? managerBranchId = null,
        CancellationToken ct = default)
    {
        var slot = await slotRepo.GetByIdAsync(slotId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Slot.NotFound);

        EnsureManagerBranchScope(slot, managerBranchId);
        return slot.ToDto();
    }

    /// <summary>
    /// Lấy danh sách slot của chi nhánh theo trang, có thể filter theo FromDate / ToDate.
    /// Sắp xếp theo ngày rồi giờ bắt đầu tăng dần.
    /// </summary>
    /// <remarks>Gọi: ISlotRepository.GetPagedAsync.</remarks>
    public async Task<PagedResult<SlotDto>> GetPagedAsync(Guid branchId, SlotQuery query, CancellationToken ct = default)
    {
        var (items, total) = await slotRepo.GetPagedAsync(
            branchId, query.FromDate, query.ToDate, query.Page, query.PageSize, ct);

        return new PagedResult<SlotDto>
        {
            Items      = items.Select(s => s.ToDto()).ToList(),
            TotalCount = total,
            PageNumber = query.Page,
            PageSize   = query.PageSize,
        };
    }

    /// <summary>
    /// Cập nhật capacity của slot.
    /// Không cho đổi ngày/giờ — muốn đổi phải xóa rồi tạo lại.
    /// </summary>
    /// <remarks>Gọi: ISlotRepository.GetByIdAsync → SaveChangesAsync.</remarks>
    public async Task<SlotDto> UpdateAsync(
        Guid slotId,
        UpdateSlotRequest request,
        Guid? managerBranchId = null,
        CancellationToken ct = default)
    {
        var slot = await slotRepo.GetByIdAsync(slotId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Slot.NotFound);

        EnsureManagerBranchScope(slot, managerBranchId);

        slot.Capacity = request.Capacity;
        await slotRepo.SaveChangesAsync(ct);

        return slot.ToDto();
    }

    private static void EnsureManagerBranchScope(
        SlotInventory slot,
        Guid? managerBranchId)
    {
        if (managerBranchId.HasValue && slot.BranchId != managerBranchId.Value)
            throw AppException.Forbidden(ValidationMessage.Branch.ForbiddenOtherBranch);
    }
}
