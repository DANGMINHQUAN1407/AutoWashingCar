namespace WashingCar_BLL.Interfaces;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string resetLink, DateTime expiresAt);
    Task SendWelcomeEmailAsync(string toEmail, string fullName, string tempPassword);
    Task SendBookingConfirmationEmailAsync(string toEmail, string fullName, string bookingCode,
        string qrToken, DateOnly slotDate, TimeOnly slotStart, TimeOnly slotEnd, decimal finalAmount,
        string? branchName = null, string? licensePlate = null,
        IReadOnlyList<(string Name, decimal Total)>? serviceLines = null);

    /// <summary>Nhắc khách đến rửa xe (gửi trước giờ slot ~1 tiếng).</summary>
    Task SendBookingReminderEmailAsync(string toEmail, string fullName, string bookingCode,
        DateOnly slotDate, TimeOnly slotStart, TimeOnly slotEnd, string? branchName);

    /// <summary>Báo khách vừa được cộng điểm loyalty (sau khi đóng đơn).</summary>
    Task SendPointsEarnedEmailAsync(string toEmail, string fullName, int pointsEarned, int currentPoints, string tierName);

    /// <summary>Báo quản lý chi nhánh khi lịch đặt hẹn có cọc bị hủy.</summary>
    Task SendManagerBookingCancelledNotificationEmailAsync(string toEmail, string managerName, string bookingCode, decimal depositAmount, int pointsEarned);
}
