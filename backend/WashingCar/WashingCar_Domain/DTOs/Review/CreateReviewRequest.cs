using System;
using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Review;

public class CreateReviewRequest
{
    [Range(1, 5, ErrorMessage = "Đánh giá phải từ 1 đến 5 sao")]
    public byte Rating { get; set; }

    [MaxLength(1000, ErrorMessage = "Bình luận không được vượt quá 1000 ký tự")]
    public string? Comment { get; set; }

    [Required(ErrorMessage = "Vui lòng cung cấp mã đơn hàng")]
    public Guid BookingId { get; set; }

    [Range(1, 2, ErrorMessage = "Loại đánh giá không hợp lệ (1: Service, 2: Staff)")]
    public int ReviewType { get; set; }
}
