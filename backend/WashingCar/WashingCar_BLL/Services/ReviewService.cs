using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Auth;
using WashingCar_Domain.DTOs.Review;
using WashingCar_Domain.DTOs.Report;
using WashingCar_Common.Enum;

namespace WashingCar_BLL.Services;

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _reviewRepo;
    private readonly IBookingRepository _bookingRepo;
    private readonly IBranchRepository _branchRepo;
    private readonly IUserRepository _userRepo;
    private readonly ILogger<ReviewService> _logger;

    public ReviewService(
        IReviewRepository reviewRepo,
        IBookingRepository bookingRepo,
        IBranchRepository branchRepo,
        IUserRepository userRepo,
        ILogger<ReviewService> logger)
    {
        _reviewRepo = reviewRepo;
        _bookingRepo = bookingRepo;
        _branchRepo = branchRepo;
        _userRepo = userRepo;
        _logger = logger;
    }

    /// <summary>Danh sách review công khai — ép cứng IsHidden=false, ReviewType=1 (chỉ review dịch vụ).</summary>
    /// <remarks>Gọi: IReviewRepository.GetPagedAsync.</remarks>
    public async Task<PagedResult<ReviewDto>> GetReviewsAsync(ReviewQuery query)
    {
        // Public reviews: strictly visible service reviews (Type == 1) only
        query.IsHidden = false;
        query.ReviewType = 1;

        var (items, total) = await _reviewRepo.GetPagedAsync(query);
        return new PagedResult<ReviewDto>
        {
            Items = items.Select(r => r.ToDto()).ToList(),
            TotalCount = total,
            PageNumber = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>Danh sách review để kiểm duyệt — Staff bị ép theo chi nhánh mình (chặn xem review type Staff), Manager tự động lọc theo chi nhánh quản lý.</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync (Staff) / IBranchRepository.GetByManagerIdAsync (Manager) → IReviewRepository.GetPagedAsync.</remarks>
    public async Task<PagedResult<ReviewDto>> GetReviewsForModerationAsync(ReviewQuery query, string userRole, Guid currentUserId)
    {
        if (userRole == "Staff")
        {
            // Staff members are not allowed to view staff reviews (Type == 2)
            query.ReviewType = 1;

            var user = await _userRepo.GetByIdAsync(currentUserId);
            if (user == null || !user.BranchId.HasValue)
            {
                throw AppException.Forbidden("Tài khoản nhân viên chưa được gán vào chi nhánh nào.");
            }
            query.BranchId = user.BranchId.Value;
        }
        else if (userRole == "Manager")
        {
            var branch = await _branchRepo.GetByManagerIdAsync(currentUserId);
            if (branch == null)
            {
                throw AppException.Forbidden("Tài khoản quản lý chưa được gán cho chi nhánh nào.");
            }
            query.BranchId = branch.BranchId;
        }

        var (items, total) = await _reviewRepo.GetPagedAsync(query);
        return new PagedResult<ReviewDto>
        {
            Items = items.Select(r => r.ToDto()).ToList(),
            TotalCount = total,
            PageNumber = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>Review của chính mình — hiển thị cả review đang ẩn (IsHidden=null, không lọc).</summary>
    /// <remarks>Gọi: IReviewRepository.GetPagedAsync(UserId=...).</remarks>
    public async Task<PagedResult<ReviewDto>> GetMyReviewsAsync(Guid userId, ReviewQuery query)
    {
        query.UserId = userId;
        // Current user should see their own reviews, hidden or not
        query.IsHidden = null;

        var (items, total) = await _reviewRepo.GetPagedAsync(query);
        return new PagedResult<ReviewDto>
        {
            Items = items.Select(r => r.ToDto()).ToList(),
            TotalCount = total,
            PageNumber = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>Tạo review cho booking đã Completed/Closed của chính mình — 1 booking chỉ được review 1 lần mỗi loại.</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetTrackedByIdAsync → IReviewRepository.GetByBookingIdAndTypeAsync (check trùng)
    /// → AddAsync + SaveChangesAsync → GetByIdAsync (trả về).
    /// </remarks>
    public async Task<ReviewDto> CreateReviewAsync(Guid userId, CreateReviewRequest request)
    {
        if (request.Rating < 1 || request.Rating > 5)
        {
            throw AppException.BadRequest("Đánh giá phải từ 1 đến 5 sao");
        }

        var booking = await _bookingRepo.GetTrackedByIdAsync(request.BookingId);
        if (booking == null || booking.UserId != userId)
        {
            throw AppException.NotFound("Không tìm thấy đơn đặt lịch phù hợp");
        }

        if (booking.BookingStatus != BookingStatus.Completed && booking.BookingStatus != BookingStatus.Closed)
        {
            throw AppException.BadRequest("Chỉ có thể đánh giá đơn hàng đã hoàn thành hoặc đã chốt");
        }

        var existing = await _reviewRepo.GetByBookingIdAndTypeAsync(request.BookingId, request.ReviewType);
        if (existing != null)
        {
            throw AppException.Conflict("Đơn hàng này đã được đánh giá loại này trước đó");
        }

        var review = new Review
        {
            ReviewId = Guid.NewGuid(),
            UserId = userId,
            BookingId = request.BookingId,
            Rating = request.Rating,
            Comment = request.Comment,
            IsHidden = false,
            ReviewType = request.ReviewType,
            StaffId = booking.AssignedStaffId,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _reviewRepo.AddAsync(review);
        await _reviewRepo.SaveChangesAsync();

        _logger.LogInformation("User {UserId} created review {ReviewId} for Booking {BookingId}", userId, review.ReviewId, review.BookingId);

        var createdReview = await _reviewRepo.GetByIdAsync(review.ReviewId);
        return createdReview!.ToDto();
    }

    /// <summary>Ẩn/hiện review — Manager chỉ được thao tác review thuộc chi nhánh mình.</summary>
    /// <remarks>Gọi: IReviewRepository.GetByIdAsync → IBranchRepository.GetByManagerIdAsync (check chi nhánh) → SaveChangesAsync.</remarks>
    public async Task<ReviewDto> ToggleHideAsync(Guid reviewId, bool isHidden, Guid currentUserId, string currentUserRole)
    {
        var review = await _reviewRepo.GetByIdAsync(reviewId)
            ?? throw AppException.NotFound("Không tìm thấy đánh giá");

        if (currentUserRole == "Manager")
        {
            var branch = await _branchRepo.GetByManagerIdAsync(currentUserId);
            if (branch == null || review.Booking?.BranchId != branch.BranchId)
            {
                throw AppException.Forbidden("Bạn không có quyền ẩn đánh giá của chi nhánh khác");
            }
        }

        review.IsHidden = isHidden;
        await _reviewRepo.SaveChangesAsync();

        _logger.LogInformation("Review {ReviewId} visibility set to IsHidden={IsHidden} by User {UserId}", reviewId, isHidden, currentUserId);
        return review.ToDto();
    }

    /// <summary>Xoá review — chủ review hoặc Admin/Manager (Manager chỉ chi nhánh mình).</summary>
    /// <remarks>Gọi: IReviewRepository.GetByIdAsync → IBranchRepository.GetByManagerIdAsync (nếu Manager) → Remove + SaveChangesAsync.</remarks>
    public async Task DeleteReviewAsync(Guid userId, Guid reviewId, string userRole)
    {
        var review = await _reviewRepo.GetByIdAsync(reviewId)
            ?? throw AppException.NotFound("Không tìm thấy đánh giá");

        var isOwner = review.UserId == userId;
        var isAdminOrManager = userRole == "Admin" || userRole == "Manager";

        if (!isOwner && !isAdminOrManager)
        {
            throw AppException.Forbidden("Bạn không có quyền xóa đánh giá này");
        }

        if (userRole == "Manager")
        {
            var branch = await _branchRepo.GetByManagerIdAsync(userId);
            if (branch == null || review.Booking?.BranchId != branch.BranchId)
            {
                throw AppException.Forbidden("Bạn không có quyền xóa đánh giá của chi nhánh khác");
            }
        }

        _reviewRepo.Remove(review);
        await _reviewRepo.SaveChangesAsync();

        _logger.LogInformation("User {UserId} deleted review {ReviewId}", userId, reviewId);
    }

    /// <summary>Thống kê rating trung bình + tổng booking — toàn hệ thống hoặc theo 1 chi nhánh.</summary>
    /// <remarks>
    /// Gọi: IReviewRepository.GetAverageRatingAsync/GetBranchAverageRatingAsync
    /// → IBookingRepository.GetTotalBookingsCountAsync/GetBranchBookingsCountAsync.
    /// </remarks>
    public async Task<SystemStatsDto> GetSystemStatsAsync(Guid? branchId)
    {
        double avg = 0.0;
        int count = 0;

        if (branchId.HasValue)
        {
            avg = await _reviewRepo.GetBranchAverageRatingAsync(branchId.Value);
            count = await _bookingRepo.GetBranchBookingsCountAsync(branchId.Value);
        }
        else
        {
            avg = await _reviewRepo.GetAverageRatingAsync();
            count = await _bookingRepo.GetTotalBookingsCountAsync();
        }

        return new SystemStatsDto
        {
            AverageRating = Math.Round(avg, 1),
            TotalBookings = count
        };
    }
}
