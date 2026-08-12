using System;
using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.Review;

public class ReviewQuery : PaginationQuery
{
    public byte? Rating { get; set; }
    public bool? IsHidden { get; set; }
    public string? Search { get; set; }
    public Guid? UserId { get; set; }
    public Guid? BranchId { get; set; }
    public Guid? StaffId { get; set; }
    public Guid? ServiceCatalogItemId { get; set; }
    public int? ReviewType { get; set; }
}
