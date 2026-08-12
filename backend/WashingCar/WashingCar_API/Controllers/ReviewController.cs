using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Review;

namespace WashingCar_API.Controllers;

[Route("api/reviews")]
public class ReviewController : BaseApiController
{
    private readonly IReviewService _reviewService;

    public ReviewController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    /// <summary>Danh sách review công khai (ép IsHidden=false, ReviewType=1).</summary>
    /// <remarks>Gọi: ReviewService.GetReviewsAsync → IReviewRepository.GetPagedAsync.</remarks>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetReviews([FromQuery] ReviewQuery query)
    {
        var result = await _reviewService.GetReviewsAsync(query);
        return Success(result);
    }

    /// <summary>Thống kê rating trung bình + tổng booking (toàn hệ thống hoặc theo chi nhánh).</summary>
    /// <remarks>
    /// Gọi: ReviewService.GetSystemStatsAsync → IReviewRepository.GetAverageRatingAsync/GetBranchAverageRatingAsync
    /// → IBookingRepository.GetTotalBookingsCountAsync/GetBranchBookingsCountAsync.
    /// </remarks>
    [HttpGet("stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSystemStats([FromQuery] Guid? branchId)
    {
        var result = await _reviewService.GetSystemStatsAsync(branchId);
        return Success(result);
    }

    /// <summary>Danh sách review để kiểm duyệt (Staff bị giới hạn chi nhánh mình, Manager tự động lọc theo chi nhánh quản lý).</summary>
    /// <remarks>
    /// Gọi: ReviewService.GetReviewsForModerationAsync → IUserRepository.GetByIdAsync (Staff, lấy branch)
    /// / IBranchRepository.GetByManagerIdAsync (Manager) → IReviewRepository.GetPagedAsync.
    /// </remarks>
    [HttpGet("moderation")]
    [Authorize(Roles = $"{UserRole.Manager},{UserRole.Admin},{UserRole.Staff}")]
    public async Task<IActionResult> GetReviewsForModeration([FromQuery] ReviewQuery query)
    {
        var role = User.FindFirstValue("role") ?? User.FindFirstValue(ClaimTypes.Role) ?? "";
        var result = await _reviewService.GetReviewsForModerationAsync(query, role, CurrentUserId);
        return Success(result);
    }

    /// <summary>Review của chính mình (hiển thị cả review đang ẩn).</summary>
    /// <remarks>Gọi: ReviewService.GetMyReviewsAsync → IReviewRepository.GetPagedAsync(UserId=...).</remarks>
    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetMyReviews([FromQuery] ReviewQuery query)
    {
        var result = await _reviewService.GetMyReviewsAsync(CurrentUserId, query);
        return Success(result);
    }

    /// <summary>Tạo review cho booking đã Completed/Closed của chính mình.</summary>
    /// <remarks>
    /// Gọi: ReviewService.CreateReviewAsync → IBookingRepository.GetTrackedByIdAsync
    /// → IReviewRepository.GetByBookingIdAndTypeAsync (check trùng) → AddAsync + SaveChangesAsync → GetByIdAsync (trả về).
    /// </remarks>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest request)
    {
        var review = await _reviewService.CreateReviewAsync(CurrentUserId, request);
        return Success(review, "Đánh giá thành công");
    }

    /// <summary>Xoá review (chủ review, hoặc Admin/Manager — Manager chỉ chi nhánh mình).</summary>
    /// <remarks>
    /// Gọi: ReviewService.DeleteReviewAsync → IReviewRepository.GetByIdAsync
    /// → IBranchRepository.GetByManagerIdAsync (nếu Manager, check chi nhánh) → Remove + SaveChangesAsync.
    /// </remarks>
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id)
    {
        var role = User.FindFirstValue("role") ?? User.FindFirstValue(ClaimTypes.Role) ?? "";
        await _reviewService.DeleteReviewAsync(CurrentUserId, id, role);
        return Success("Xóa đánh giá thành công");
    }

    /// <summary>Ẩn/hiện review (Manager/Admin — Manager chỉ chi nhánh mình).</summary>
    /// <remarks>
    /// Gọi: ReviewService.ToggleHideAsync → IReviewRepository.GetByIdAsync
    /// → IBranchRepository.GetByManagerIdAsync (check chi nhánh) → SaveChangesAsync.
    /// </remarks>
    [HttpPut("{id:guid}/toggle-hide")]
    [Authorize(Roles = $"{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> ToggleHide(Guid id, [FromBody] ToggleHideRequest request)
    {
        var role = User.FindFirstValue("role") ?? User.FindFirstValue(ClaimTypes.Role) ?? "";
        var review = await _reviewService.ToggleHideAsync(id, request.IsHidden, CurrentUserId, role);
        var msg = request.IsHidden ? "Ẩn đánh giá thành công" : "Hiện đánh giá thành công";
        return Success(review, msg);
    }
}

public class ToggleHideRequest
{
    public bool IsHidden { get; set; }
}
