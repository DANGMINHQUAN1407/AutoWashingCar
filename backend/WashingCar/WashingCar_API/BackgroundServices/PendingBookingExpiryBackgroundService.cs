using WashingCar_BLL.Interfaces;

namespace WashingCar_API.BackgroundServices;

/// <summary>
/// Quét Pending booking định kỳ và giải phóng các reservation đã quá thời hạn.
/// Mỗi tick tạo scope riêng để dùng DbContext/repository scoped an toàn.
/// </summary>
public class PendingBookingExpiryBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<PendingBookingExpiryBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var bookingService = scope.ServiceProvider.GetRequiredService<IBookingService>();
                var expired = await bookingService.ExpirePendingBookingsAsync(stoppingToken);
                if (expired > 0)
                    logger.LogInformation("Đã expire {Count} Pending booking hết hạn", expired);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi khi chạy job expire Pending booking");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
