using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class ManufactureYearAttribute : ValidationAttribute
{
    private const int MinimumYear = 1900;

    public ManufactureYearAttribute()
        : base($"Năm sản xuất phải nằm trong khoảng từ {MinimumYear} đến năm hiện tại.")
    {
    }

    public override bool IsValid(object? value)
    {
        if (value is null)
        {
            return true;
        }

        return value is int year
            && year >= MinimumYear
            && year <= DateTime.UtcNow.Year;
    }
}
