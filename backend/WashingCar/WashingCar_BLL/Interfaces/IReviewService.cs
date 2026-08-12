using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Auth;
using WashingCar_Domain.DTOs.Review;

namespace WashingCar_BLL.Interfaces;

public interface IReviewService
{
    Task<PagedResult<ReviewDto>> GetReviewsAsync(ReviewQuery query);
    Task<PagedResult<ReviewDto>> GetReviewsForModerationAsync(ReviewQuery query, string userRole, Guid currentUserId);
    Task<PagedResult<ReviewDto>> GetMyReviewsAsync(Guid userId, ReviewQuery query);
    Task<ReviewDto> CreateReviewAsync(Guid userId, CreateReviewRequest request);
    Task<ReviewDto> ToggleHideAsync(Guid reviewId, bool isHidden, Guid currentUserId, string currentUserRole);
    Task DeleteReviewAsync(Guid userId, Guid reviewId, string userRole);
    Task<WashingCar_Domain.DTOs.Report.SystemStatsDto> GetSystemStatsAsync(Guid? branchId);
}
