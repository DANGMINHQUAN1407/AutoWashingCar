using System;
using System.Linq;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Review;

namespace WashingCar_BLL.Mappers;

public static class ReviewMapper
{
    public static ReviewDto ToDto(this Review review)
    {
        if (review == null) return null!;

        var booking = review.Booking;
        var firstLine = booking?.BookingLines?.FirstOrDefault();

        return new ReviewDto
        {
            ReviewId = review.ReviewId,
            UserId = review.UserId,
            UserFullName = review.User?.FullName ?? "Khách hàng",
            BookingId = review.BookingId,
            BranchId = booking?.BranchId,
            BranchName = booking?.Branch?.Name,
            Rating = review.Rating,
            Comment = review.Comment,
            IsHidden = review.IsHidden,
            CreatedAtUtc = review.CreatedAtUtc,
            ReviewType = review.ReviewType,

            StaffId = review.StaffId,
            StaffFullName = review.Staff?.FullName,
            ServiceCatalogItemId = firstLine?.ServiceCatalogItemId,
            ServiceName = booking?.BookingLines != null ? string.Join(", ", booking.BookingLines.Select(l => l.ServiceName)) : null
        };
    }
}
