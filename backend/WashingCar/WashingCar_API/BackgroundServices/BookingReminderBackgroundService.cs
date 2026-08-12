using WashingCar_BLL.Interfaces;

namespace WashingCar_API.BackgroundServices;

/// <summary>
/// Chạy nền định kỳ: quét booking Confirmed sắp tới giờ (~1h) và gửi email nhắc khách đến rửa xe.
/// Mỗi tick tạo 1 scope riêng để resolve các service Scoped (DbContext/repo/email).
/// </summary>
public class BookingReminderBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<BookingReminderBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var bookingService = scope.ServiceProvider.GetRequiredService<IBookingService>();
                var sent = await bookingService.SendDueRemindersAsync(stoppingToken);
                if (sent > 0)
                    logger.LogInformation("Đã gửi {Count} email nhắc lịch rửa xe", sent);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break; // app shutdown
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi khi chạy job nhắc lịch rửa xe");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
