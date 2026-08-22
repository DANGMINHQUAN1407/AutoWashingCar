namespace WashingCar_BLL.Policies;

public readonly record struct CancellationDecision(
    decimal FeeRate,
    bool IsAfterSlotStart)
{
    public decimal CalculateFee(decimal paidAmount)
        => Math.Round(paidAmount * FeeRate, 0, MidpointRounding.AwayFromZero);
}

/// <summary>
/// Chính sách phí hủy booking trước khi check-in.
/// Thời gian được so sánh bằng giờ local Vietnam vì slot được lưu DateOnly/TimeOnly local.
/// </summary>
public static class CancellationPolicy
{
    public const int FreeCancellationMinimumHours = 24;
    public const int SameDayCancellationMinimumHours = 2;
    public const decimal SameDayFeeRate = 0.10m;
    public const decimal ShortNoticeFeeRate = 0.30m;

    public static CancellationDecision Evaluate(DateTime nowLocal, DateTime slotStartLocal)
    {
        if (slotStartLocal <= nowLocal)
            return new CancellationDecision(ShortNoticeFeeRate, IsAfterSlotStart: true);

        var remaining = slotStartLocal - nowLocal;
        if (remaining >= TimeSpan.FromHours(FreeCancellationMinimumHours))
            return new CancellationDecision(0m, IsAfterSlotStart: false);

        if (remaining >= TimeSpan.FromHours(SameDayCancellationMinimumHours))
            return new CancellationDecision(SameDayFeeRate, IsAfterSlotStart: false);

        return new CancellationDecision(ShortNoticeFeeRate, IsAfterSlotStart: false);
    }
}
