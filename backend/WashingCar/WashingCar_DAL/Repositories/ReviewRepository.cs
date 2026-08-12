using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Review;

namespace WashingCar_DAL.Repositories;

public class ReviewRepository : IReviewRepository
{
    private readonly WashingCarDbContext _context;

    public ReviewRepository(WashingCarDbContext context)
    {
        _context = context;
    }

    public async Task<Review?> GetByIdAsync(Guid id)
    {
        return await _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Staff)
            .Include(r => r.Booking).ThenInclude(b => b.Branch)
            .Include(r => r.Booking).ThenInclude(b => b.CheckedInByUser)
            .Include(r => r.Booking).ThenInclude(b => b.BookingLines)
            .FirstOrDefaultAsync(r => r.ReviewId == id);
    }

    public async Task<Review?> GetByBookingIdAndTypeAsync(Guid bookingId, int type)
    {
        return await _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Staff)
            .Include(r => r.Booking).ThenInclude(b => b.Branch)
            .Include(r => r.Booking).ThenInclude(b => b.CheckedInByUser)
            .Include(r => r.Booking).ThenInclude(b => b.BookingLines)
            .FirstOrDefaultAsync(r => r.BookingId == bookingId && r.ReviewType == type);
    }

    public async Task<(List<Review> Items, int TotalCount)> GetPagedAsync(ReviewQuery query)
    {
        var dbQuery = _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Staff)
            .Include(r => r.Booking).ThenInclude(b => b.Branch)
            .Include(r => r.Booking).ThenInclude(b => b.CheckedInByUser)
            .Include(r => r.Booking).ThenInclude(b => b.BookingLines)
            .AsQueryable();

        // Filters
        if (query.UserId.HasValue)
        {
            dbQuery = dbQuery.Where(r => r.UserId == query.UserId.Value);
        }

        if (query.BranchId.HasValue)
        {
            dbQuery = dbQuery.Where(r => r.Booking != null && r.Booking.BranchId == query.BranchId.Value);
        }

        if (query.StaffId.HasValue)
        {
            dbQuery = dbQuery.Where(r => r.StaffId == query.StaffId.Value);
        }

        if (query.ServiceCatalogItemId.HasValue)
        {
            dbQuery = dbQuery.Where(r => r.Booking != null && r.Booking.BookingLines.Any(bl => bl.ServiceCatalogItemId == query.ServiceCatalogItemId.Value));
        }

        if (query.Rating.HasValue)
        {
            dbQuery = dbQuery.Where(r => r.Rating == query.Rating.Value);
        }

        if (query.IsHidden.HasValue)
        {
            dbQuery = dbQuery.Where(r => r.IsHidden == query.IsHidden.Value);
        }

        if (query.ReviewType.HasValue)
        {
            dbQuery = dbQuery.Where(r => r.ReviewType == query.ReviewType.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var searchLower = query.Search.ToLower();
            dbQuery = dbQuery.Where(r => 
                (r.Comment != null && r.Comment.ToLower().Contains(searchLower)) ||
                (r.User != null && r.User.FullName != null && r.User.FullName.ToLower().Contains(searchLower)) ||
                (r.Staff != null && r.Staff.FullName != null && r.Staff.FullName.ToLower().Contains(searchLower)) ||
                (r.Booking != null && r.Booking.BookingLines.Any(bl => bl.ServiceName != null && bl.ServiceName.ToLower().Contains(searchLower)))
            );
        }

        // Sorting
        dbQuery = dbQuery.OrderByDescending(r => r.CreatedAtUtc);

        var total = await dbQuery.CountAsync();

        var items = await dbQuery
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<bool> ExistsForBookingAsync(Guid bookingId)
    {
        return await _context.Reviews.AnyAsync(r => r.BookingId == bookingId);
    }

    public async Task AddAsync(Review review)
    {
        await _context.Reviews.AddAsync(review);
    }

    public void Remove(Review review)
    {
        _context.Reviews.Remove(review);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }

    public async Task<double> GetAverageRatingAsync()
    {
        var ratings = _context.Reviews.Where(r => r.ReviewType == 1 && !r.IsHidden);
        if (!await ratings.AnyAsync()) return 0.0;
        return await ratings.AverageAsync(r => (double)r.Rating);
    }

    public async Task<double> GetBranchAverageRatingAsync(Guid branchId)
    {
        var ratings = _context.Reviews.Where(r => r.ReviewType == 1 && !r.IsHidden && r.Booking != null && r.Booking.BranchId == branchId);
        if (!await ratings.AnyAsync()) return 0.0;
        return await ratings.AverageAsync(r => (double)r.Rating);
    }
}
