using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using QRCoder;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Settings;

namespace WashingCar_BLL.Services;

/// <summary>
/// Service hạ tầng thuần túy — gửi email qua MailKit/SMTP (Gmail). Không gọi Repository (leaf service),
/// được các Service khác (Auth, Booking, Loyalty) gọi vào để gửi thông báo, luôn dùng theo kiểu best-effort (try/catch ở phía gọi).
/// </summary>
public class EmailService : IEmailService
{
    private readonly EmailSettings         _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<EmailSettings> settings, ILogger<EmailService> logger)
    {
        _settings = settings.Value;
        _logger   = logger;
    }

    /// <summary>Email đặt lại mật khẩu — dùng bởi AuthService.ForgotPasswordAsync.</summary>
    public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink, DateTime expiresAt)
    {
        var subject = "Đặt lại mật khẩu — WashingCar";
        var body    = BuildPasswordResetBody(resetLink, expiresAt);

        await SendAsync(toEmail, subject, body);

        _logger.LogInformation("Password reset email sent to: {Email}", toEmail);
    }

    // ─── CORE SEND ───────────────────────────────────────────────────────────
    private async Task SendAsync(MimeMessage message)
    {
        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(_settings.Server, _settings.Port, SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(_settings.SenderEmail, _settings.Password);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
    }

    private async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body    = new TextPart("html") { Text = htmlBody };
        await SendAsync(message);
    }

    // ─── EMAIL TEMPLATE ──────────────────────────────────────────────────────
    private static string BuildPasswordResetBody(string resetLink, DateTime expiresAt)
    {
        var expireText = expiresAt.ToLocalTime().ToString("HH:mm dd/MM/yyyy");

        return $"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
              <h2 style="color:#2c3e50">Đặt lại mật khẩu</h2>
              <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
              <p>Nhấn vào nút bên dưới để tạo mật khẩu mới. Liên kết có hiệu lực đến <strong>{expireText}</strong>.</p>
              <div style="text-align:center;margin:32px 0">
                <a href="{resetLink}"
                   style="background:#2563eb;color:#fff;text-decoration:none;
                          padding:14px 32px;border-radius:8px;font-size:15px;
                          font-weight:600;display:inline-block">
                  Đặt lại mật khẩu
                </a>
              </div>
              <p style="color:#e74c3c;font-size:13px">Liên kết chỉ có hiệu lực trong <strong>15 phút</strong>.</p>
              <p style="font-size:13px">Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:</p>
              <p style="background:#f4f4f4;padding:10px 14px;border-radius:6px;
                        font-size:12px;word-break:break-all;color:#555">{resetLink}</p>
              <p style="font-size:13px;color:#888">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
              <p style="color:#999;font-size:12px">WashingCar System</p>
            </div>
            """;
    }

    /// <summary>Email chào mừng kèm mật khẩu tạm — dùng bởi AdminService.CreateAccountStaffAsync.</summary>
    public async Task SendWelcomeEmailAsync(string toEmail, string fullName, string tempPassword)
    {
        var subject = "Tài khoản WashingCar của bạn";
        var body = BuildWelcomeBody(fullName, toEmail, tempPassword);
        await SendAsync(toEmail, subject, body);
    }

    private static string BuildWelcomeBody(string fullName, string email, string tempPassword)
    {
        return $"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h2>Xin chào {fullName},</h2>
          <p>Tài khoản của bạn đã được tạo trên hệ thống WashingCar.</p>
          <table>
            <tr><td>Email:</td>    <td><strong>{email}</strong></td></tr>
            <tr><td>Mật khẩu:</td><td><strong>{tempPassword}</strong></td></tr>
          </table>
          <p style="color:red">Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.</p>
        </div>
        """;
    }

    private const string QrCid = "booking-qr@washingcar";

    /// <summary>Email xác nhận booking kèm QR check-in nhúng inline — dùng bởi BookingService (Create/CreateWalkIn).</summary>
    public async Task SendBookingConfirmationEmailAsync(string toEmail, string fullName, string bookingCode,
        string qrToken, DateOnly slotDate, TimeOnly slotStart, TimeOnly slotEnd, decimal finalAmount,
        string? branchName = null, string? licensePlate = null,
        IReadOnlyList<(string Name, decimal Total)>? serviceLines = null)
    {
        var subject  = $"Xác nhận đặt lịch rửa xe — {bookingCode}";
        var qrBytes  = GenerateQrBytes(qrToken);
        var htmlBody = BuildBookingConfirmationBody(
            fullName, bookingCode, slotDate, slotStart, slotEnd, finalAmount,
            branchName, licensePlate, serviceLines);

        var builder = new BodyBuilder { HtmlBody = htmlBody };
        var qrResource = builder.LinkedResources.Add("qr.png", qrBytes, new ContentType("image", "png"));
        qrResource.ContentId = QrCid;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body    = builder.ToMessageBody();

        await SendAsync(message);
        _logger.LogInformation("Booking confirmation email sent for {Code}", bookingCode);
    }

    private static byte[] GenerateQrBytes(string content)
    {
        using var generator = new QRCodeGenerator();
        var data   = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        var qrCode = new PngByteQRCode(data);
        return qrCode.GetGraphic(6);
    }

    private static string BuildBookingConfirmationBody(string fullName, string bookingCode,
        DateOnly slotDate, TimeOnly slotStart, TimeOnly slotEnd, decimal finalAmount,
        string? branchName, string? licensePlate, IReadOnlyList<(string Name, decimal Total)>? serviceLines)
    {
        var branchRow = branchName is not null
            ? $"<tr><td>Chi nhánh:&nbsp;</td><td><strong>{branchName}</strong></td></tr>"
            : "";
        var plateRow = licensePlate is not null
            ? $"<tr><td>Biển số xe:&nbsp;</td><td><strong>{licensePlate}</strong></td></tr>"
            : "";

        var servicesHtml = "";
        if (serviceLines is { Count: > 0 })
        {
            var rows = string.Join("", serviceLines.Select(s =>
                $"<tr><td style='padding:4px 8px'>{s.Name}</td><td style='padding:4px 8px;text-align:right'>{s.Total:N0} đ</td></tr>"));
            servicesHtml = $"""
                <p style="margin-top:20px"><strong>Dịch vụ đã chọn:</strong></p>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                  <thead><tr style="background:#f0f0f0">
                    <th style="padding:4px 8px;text-align:left">Dịch vụ</th>
                    <th style="padding:4px 8px;text-align:right">Thành tiền</th>
                  </tr></thead>
                  <tbody>{rows}</tbody>
                </table>
                """;
        }

        return $"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
          <h2 style="color:#2c3e50;margin-bottom:4px">Đặt lịch thành công!</h2>
          <p style="color:#555;margin-top:0">Cảm ơn bạn đã sử dụng dịch vụ WashingCar.</p>
          <p>Xin chào <strong>{fullName}</strong>,</p>
          <p>Lịch rửa xe của bạn đã được đặt thành công. Vui lòng mang theo mã QR bên dưới khi đến để check-in nhanh.</p>

          <table style="margin:16px 0;border-collapse:collapse">
            <tr><td style="padding:4px 0">Mã booking:&nbsp;</td><td><strong style="font-size:16px;color:#2563eb">{bookingCode}</strong></td></tr>
            <tr><td style="padding:4px 0">Thời gian:&nbsp;</td><td><strong>{slotStart:HH:mm} – {slotEnd:HH:mm} ngày {slotDate:dd/MM/yyyy}</strong></td></tr>
            {branchRow}
            {plateRow}
            <tr><td style="padding:4px 0">Tổng tiền:&nbsp;</td><td><strong style="color:#e74c3c">{finalAmount:N0} đ</strong></td></tr>
          </table>

          {servicesHtml}

          <div style="text-align:center;margin:28px 0">
            <p style="margin-bottom:8px"><strong>Mã QR check-in</strong></p>
            <img src="cid:{QrCid}"
                 alt="QR Check-in"
                 width="200" height="200"
                 style="border:4px solid #2563eb;border-radius:8px;display:block;margin:auto"/>
            <p style="font-size:11px;color:#888;margin-top:8px;word-break:break-all">{bookingCode}</p>
          </div>

          <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;font-size:13px">
            <strong>Lưu ý:</strong> Vui lòng đến đúng giờ. Booking sẽ bị huỷ nếu bạn không check-in trong vòng 15 phút sau giờ hẹn.
          </div>

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px;margin:0">WashingCar System — Hệ thống rửa xe tự động</p>
        </div>
        """;
    }

    /// <summary>Email nhắc lịch 1h trước giờ hẹn — dùng bởi BookingService.SendDueRemindersAsync (background job).</summary>
    public async Task SendBookingReminderEmailAsync(string toEmail, string fullName, string bookingCode,
        DateOnly slotDate, TimeOnly slotStart, TimeOnly slotEnd, string? branchName)
    {
        var subject = $"Nhắc lịch rửa xe — {bookingCode}";
        var body    = BuildBookingReminderBody(fullName, bookingCode, slotDate, slotStart, slotEnd, branchName);
        await SendAsync(toEmail, subject, body);
        _logger.LogInformation("Booking reminder email sent for {Code}", bookingCode);
    }

    private static string BuildBookingReminderBody(string fullName, string bookingCode,
        DateOnly slotDate, TimeOnly slotStart, TimeOnly slotEnd, string? branchName)
    {
        var branchLine = string.IsNullOrWhiteSpace(branchName)
            ? ""
            : $"<tr><td>Chi nhánh:&nbsp;</td><td><strong>{branchName}</strong></td></tr>";

        return $"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#2c3e50">Nhắc lịch rửa xe ⏰</h2>
          <p>Xin chào {fullName},</p>
          <p>Lịch rửa xe của bạn sẽ bắt đầu sau khoảng <strong>1 tiếng</strong>. Vui lòng đến đúng giờ và mang theo mã booking để check-in.</p>
          <table style="margin:16px 0">
            <tr><td>Mã booking:&nbsp;</td><td><strong>{bookingCode}</strong></td></tr>
            <tr><td>Thời gian:&nbsp;</td><td><strong>{slotStart:HH:mm}–{slotEnd:HH:mm} {slotDate:dd/MM/yyyy}</strong></td></tr>
            {branchLine}
          </table>
          <p>Hẹn gặp bạn! 🚗</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">WashingCar System</p>
        </div>
        """;
    }

    /// <summary>Email báo cộng điểm — dùng bởi LoyaltyService (EarnFromBookingAsync/EarnFromCancelledBookingAsync).</summary>
    public async Task SendPointsEarnedEmailAsync(string toEmail, string fullName, int pointsEarned, int currentPoints, string tierName)
    {
        var subject = "Bạn vừa nhận điểm thưởng — WashingCar";
        var body    = BuildPointsEarnedBody(fullName, pointsEarned, currentPoints, tierName);
        await SendAsync(toEmail, subject, body);
        _logger.LogInformation("Points earned email sent to {Email} (+{Points})", toEmail, pointsEarned);
    }

    private static string BuildPointsEarnedBody(string fullName, int pointsEarned, int currentPoints, string tierName)
    {
        return $"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#2c3e50">Cảm ơn bạn đã sử dụng dịch vụ 🎉</h2>
          <p>Xin chào {fullName},</p>
          <p>Bạn vừa được cộng <strong>{pointsEarned:N0} điểm</strong> sau khi hoàn tất đơn rửa xe.</p>
          <table style="margin:16px 0">
            <tr><td>Điểm vừa nhận:&nbsp;</td><td><strong>+{pointsEarned:N0}</strong></td></tr>
            <tr><td>Tổng điểm hiện có:&nbsp;</td><td><strong>{currentPoints:N0}</strong></td></tr>
            <tr><td>Hạng thành viên:&nbsp;</td><td><strong>{tierName}</strong></td></tr>
          </table>
          <p>Tích thêm điểm để lên hạng và nhận nhiều ưu đãi hơn nhé!</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">WashingCar System</p>
        </div>
        """;
    }

    /// <summary>Email báo Manager booking bị hủy sau khi đã cọc — dùng bởi BookingService.CancelAsync.</summary>
    public async Task SendManagerBookingCancelledNotificationEmailAsync(string toEmail, string managerName, string bookingCode, decimal depositAmount, int pointsEarned)
    {
        var subject = $"[Thông báo] Booking {bookingCode} bị hủy";
        var body    = BuildManagerBookingCancelledBody(managerName, bookingCode, depositAmount, pointsEarned);
        await SendAsync(toEmail, subject, body);
        _logger.LogInformation("Cancelled booking notification email sent to manager {Email}", toEmail);
    }

    private static string BuildManagerBookingCancelledBody(string managerName, string bookingCode, decimal depositAmount, int pointsEarned)
    {
        return $"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#e74c3c">Thông báo hủy lịch 🚗</h2>
          <p>Xin chào quản lý <strong>{managerName}</strong>,</p>
          <p>Hệ thống ghi nhận đơn đặt lịch <strong>{bookingCode}</strong> tại chi nhánh của bạn đã bị hủy sau khi thanh toán cọc.</p>
          <table style="margin:16px 0; border-collapse: collapse; width: 100%;">
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; width: 40%;">Mã booking:</td><td><strong style="color:#2563eb">{bookingCode}</strong></td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0;">Số tiền cọc đã thanh toán:</td><td><strong style="color:#e74c3c">{depositAmount:N0} đ</strong></td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0;">Điểm thưởng cộng cho khách hàng:</td><td><strong style="color:#2563eb">+{pointsEarned:N0} điểm</strong></td></tr>
          </table>
          <p>Điểm thưởng đã được tự động cộng vào tài khoản thành viên của khách hàng.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">WashingCar System</p>
        </div>
        """;
    }
}
