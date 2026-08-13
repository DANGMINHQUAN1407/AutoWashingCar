using System;

namespace WashingCar_Common.Helpers;

public static class VietnamTimeHelper
{
    public const int UtcOffsetHours = 7; // VN không có DST

    public static DateTime SlotStartToUtc(DateOnly slotDate, TimeOnly slotStartTime)
        => DateTime.SpecifyKind(
            slotDate.ToDateTime(slotStartTime).AddHours(-UtcOffsetHours),
            DateTimeKind.Utc);

    /// <summary>
    /// Chuyển ngày hiệu lực voucher do người dùng chọn theo giờ Việt Nam
    /// sang thời điểm bắt đầu ngày ở UTC.
    /// </summary>
    public static DateTime VietnamDateStartToUtc(DateTime value)
    {
        var vietnamLocal = ToVietnamLocal(value);
        return DateTime.SpecifyKind(
            vietnamLocal.Date.AddHours(-UtcOffsetHours),
            DateTimeKind.Utc);
    }

    /// <summary>
    /// Chuyển ngày kết thúc voucher do người dùng chọn theo giờ Việt Nam
    /// sang thời điểm cuối ngày ở UTC.
    /// </summary>
    public static DateTime VietnamDateEndToUtc(DateTime value)
    {
        var vietnamLocal = ToVietnamLocal(value);
        return DateTime.SpecifyKind(
            vietnamLocal.Date.AddDays(1).AddTicks(-1).AddHours(-UtcOffsetHours),
            DateTimeKind.Utc);
    }

    private static DateTime ToVietnamLocal(DateTime value)
        => value.Kind switch
        {
            DateTimeKind.Utc => value.AddHours(UtcOffsetHours),
            DateTimeKind.Local => value.ToUniversalTime().AddHours(UtcOffsetHours),
            _ => value // datetime-local không có offset: hiểu theo giờ Việt Nam.
        };
}
