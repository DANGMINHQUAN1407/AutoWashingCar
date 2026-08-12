using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Review;

namespace WashingCar_DAL.Interfaces;

public interface IReviewRepository
{
    Task<Review?> GetByIdAsync(Guid id);
    Task<Review?> GetByBookingIdAndTypeAsync(Guid bookingId, int type);
    Task<bool> ExistsForBookingAsync(Guid bookingId);
    Task<(List<Review> Items, int TotalCount)> GetPagedAsync(ReviewQuery query);
    Task AddAsync(Review review);
    void Remove(Review review);
    Task SaveChangesAsync();
    Task<double> GetAverageRatingAsync();
    Task<double> GetBranchAverageRatingAsync(Guid branchId);
}
