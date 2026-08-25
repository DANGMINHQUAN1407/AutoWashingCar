using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeVehicleLicensePlates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
        IF OBJECT_ID(N'dbo.Vehicle', N'U') IS NOT NULL
        BEGIN
            DECLARE @Candidates TABLE
            (
                VehicleId uniqueidentifier NOT NULL PRIMARY KEY,
                CanonicalPlate varchar(20) NOT NULL
            );

            INSERT INTO @Candidates (VehicleId, CanonicalPlate)
            SELECT
                v.VehicleId,
                LEFT(v.LicensePlate, p.DashPosition)
                    + STUFF(SUBSTRING(v.LicensePlate, p.DashPosition + 1, 100), 4, 0, '.')
            FROM dbo.Vehicle AS v
            CROSS APPLY (SELECT CHARINDEX('-', v.LicensePlate) AS DashPosition) AS p
            CROSS APPLY (SELECT SUBSTRING(v.LicensePlate, p.DashPosition + 1, 100) AS NumberPart) AS n
            WHERE v.IsDeleted = 0
              AND p.DashPosition > 0
              AND CHARINDEX('.', v.LicensePlate) = 0
              AND LEN(n.NumberPart) IN (5, 6)
              AND n.NumberPart NOT LIKE '%[^0-9]%';

            IF EXISTS
            (
                SELECT CanonicalPlate
                FROM @Candidates
                GROUP BY CanonicalPlate
                HAVING COUNT(*) > 1
            )
            BEGIN
                THROW 51000, 'Cannot normalize vehicle license plates because canonical duplicates exist.', 1;
            END;

            UPDATE v
            SET LicensePlate = c.CanonicalPlate
            FROM dbo.Vehicle AS v
            INNER JOIN @Candidates AS c ON c.VehicleId = v.VehicleId;
        END;
        """);
        }


        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
        UPDATE dbo.Vehicle
        SET LicensePlate = REPLACE(LicensePlate, '.', '')
        WHERE CHARINDEX('.', LicensePlate) > 0;
        """);
        }

    }
}
