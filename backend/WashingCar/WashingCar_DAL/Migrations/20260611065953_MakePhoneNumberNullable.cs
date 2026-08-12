using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class MakePhoneNumberNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_User_PhoneNumber' AND object_id = OBJECT_ID(N'User'))
                DROP INDEX [UQ_User_PhoneNumber] ON [User];
            IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_User_PhoneNumber' AND parent_object_id = OBJECT_ID(N'User'))
                ALTER TABLE [User] DROP CONSTRAINT [UQ_User_PhoneNumber];");

            migrationBuilder.Sql(@"DECLARE @var0 sysname;
            SELECT @var0 = [d].[name]
            FROM [sys].[default_constraints] [d]
            INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
            WHERE ([d].[parent_object_id] = OBJECT_ID(N'[User]') AND [c].[name] = N'PhoneNumber');
            IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [User] DROP CONSTRAINT [' + @var0 + '];');
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'User') AND name = N'PhoneNumber' AND is_nullable = 0)
                ALTER TABLE [User] ALTER COLUMN [PhoneNumber] varchar(20) NULL;");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_User_PhoneNumber' AND object_id = OBJECT_ID(N'User'))
                EXEC(N'CREATE UNIQUE INDEX [UQ_User_PhoneNumber] ON [User] ([PhoneNumber]) WHERE [PhoneNumber] IS NOT NULL');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE [User] DROP INDEX [UQ_User_PhoneNumber] ON [User]");

            migrationBuilder.AlterColumn<string>(
                name: "PhoneNumber",
                table: "User",
                type: "varchar(20)",
                unicode: false,
                maxLength: 20,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "varchar(20)",
                oldUnicode: false,
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "UQ_User_PhoneNumber",
                table: "User",
                column: "PhoneNumber",
                unique: true);
        }
    }
}
