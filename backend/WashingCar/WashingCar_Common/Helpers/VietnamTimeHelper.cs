using System;

namespace WashingCar_Common.Helpers;

public static class VietnamTimeHelper
{
    public const int UtcOffsetHours = 7; // VN không có DST

    public static DateTime SlotStartToUtc(DateOnly slotDate, TimeOnly slotStartTime)
        => slotDate.ToDateTime(slotStartTime).AddHours(-UtcOffsetHours);
}
