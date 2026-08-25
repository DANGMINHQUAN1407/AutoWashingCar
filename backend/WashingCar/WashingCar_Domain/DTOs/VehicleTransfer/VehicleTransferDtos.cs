using System.ComponentModel.DataAnnotations;
using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.VehicleTransfer;

public class CreateVehicleTransferRequest
{
    [Required]
    [StringLength(20, MinimumLength = 6)]
    public string LicensePlate { get; set; } = null!;

    [Required]
    public byte VehicleType { get; set; }

    [StringLength(500)]
    public string? Reason { get; set; }
}

public class ReviewVehicleTransferRequest
{
    [StringLength(500)]
    public string? ReviewNote { get; set; }
}

public class VehicleTransferQuery : PaginationQuery
{
    public byte? Status { get; set; }
    public string? LicensePlate { get; set; }
    public Guid? VehicleId { get; set; }
    public Guid? ToUserId { get; set; }
}

public class VehicleTransferRequestDto
{
    public Guid VehicleTransferRequestId { get; set; }
    public Guid VehicleId { get; set; }
    public string LicensePlate { get; set; } = null!;
    public byte VehicleType { get; set; }
    public byte Status { get; set; }
    public Guid? FromUserId { get; set; }
    public string? FromUserName { get; set; }
    public Guid ToUserId { get; set; }
    public string? ToUserName { get; set; }
    public string? Reason { get; set; }
    public string? ReviewNote { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
}

public class VehicleOwnershipHistoryDto
{
    public Guid VehicleOwnershipHistoryId { get; set; }
    public Guid VehicleId { get; set; }
    public string LicensePlate { get; set; } = null!;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = null!;
    public DateTime OwnedFromUtc { get; set; }
    public DateTime? OwnedToUtc { get; set; }
    public Guid? VehicleTransferRequestId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
