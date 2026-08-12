using System;

namespace WashingCar_Domain.DTOs.Review;

public class ReviewDto
{
    public Guid ReviewId { get; set; }
    public Guid UserId { get; set; }
    public string UserFullName { get; set; } = null!;
    public Guid BookingId { get; set; }
    public Guid? BranchId { get; set; }
    public string? BranchName { get; set; }
    public byte Rating { get; set; }
    public string? Comment { get; set; }
    public bool IsHidden { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int ReviewType { get; set; }
    public Guid? StaffId { get; set; }
    public string? StaffFullName { get; set; }
    public Guid? ServiceCatalogItemId { get; set; }
    public string? ServiceName { get; set; }
}
