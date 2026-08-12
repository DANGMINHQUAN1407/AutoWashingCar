using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.Loyalty;

public class LoyaltyLedgerQuery : PaginationQuery
{
    public byte? EntryType { get; set; }
}
