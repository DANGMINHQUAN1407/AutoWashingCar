/* ============================================================
   WashingCar — Seed phân loại gói dịch vụ & dịch vụ Add-on
   ------------------------------------------------------------
   Chạy SAU khi đã có schema đầy đủ:
       1) database/WashingCar.sql          (tạo DB + schema gốc)
       2) dotnet ef database update        (chạy trong WashingCar_API,
                                            tạo cột ServicePackageType)
       3) file này

   Script idempotent — chạy lại nhiều lần vẫn an toàn.
   ServicePackageType: 1 = Standard, 2 = AddOn, 3 = Premium
   ============================================================ */

USE [WashingCar];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.ServiceCatalogItem', 'ServicePackageType') IS NULL
BEGIN
    RAISERROR(N'Thiếu cột ServiceCatalogItem.ServicePackageType. Hãy chạy "dotnet ef database update" trước khi chạy script này.', 16, 1);
    RETURN;
END;
GO

/* ---------- 1. Phân loại lại các gói dịch vụ đã seed -------- */

-- Combo toàn diện là gói trọn gói cao cấp (Premium)
UPDATE [dbo].[ServiceCatalogItem]
SET    [ServicePackageType] = 3
WHERE  [ServiceCatalogItemId] = '2B4958CE-F23B-4AEB-B459-2E24BD36EF7D'
   AND [ServicePackageType] <> 3;

-- Các gói còn lại trong seed gốc là gói chính thông thường (Standard)
UPDATE [dbo].[ServiceCatalogItem]
SET    [ServicePackageType] = 1
WHERE  [ServiceCatalogItemId] IN (
           '0F871E92-2D58-45F4-A0C3-CD0B9B34A3E3',   -- Rửa xe cơ bản
           '4C3DF329-873F-4F7F-959D-9FBD60BCDE92',   -- Rửa xe cao cấp & Phủ Wax
           '3B8D4CD8-87A7-4404-BC49-2C62FCE5762D'    -- Vệ sinh nội thất chuyên sâu
       )
   AND [ServicePackageType] <> 1;
GO

/* ---------- 2. Seed các dịch vụ Add-on (Type = 2) ----------- */

IF NOT EXISTS (SELECT 1 FROM [dbo].[ServiceCatalogItem] WHERE [ServiceCatalogItemId] = 'A1D1F1C0-0001-4A01-9E01-0000000000A1')
BEGIN
    INSERT INTO [dbo].[ServiceCatalogItem] ([ServiceCatalogItemId], [ServiceName], [Description], [BasePrice], [DurationMinutes], [ServicePackageType], [IsActive])
    VALUES ('A1D1F1C0-0001-4A01-9E01-0000000000A1', N'Tẩy nhựa đường', N'Loại bỏ nhựa đường, bụi sơn bám trên bề mặt sơn xe bằng dung dịch chuyên dụng.', 150000.00, 30, 2, 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[ServiceCatalogItem] WHERE [ServiceCatalogItemId] = 'A1D1F1C0-0002-4A02-9E02-0000000000A2')
BEGIN
    INSERT INTO [dbo].[ServiceCatalogItem] ([ServiceCatalogItemId], [ServiceName], [Description], [BasePrice], [DurationMinutes], [ServicePackageType], [IsActive])
    VALUES ('A1D1F1C0-0002-4A02-9E02-0000000000A2', N'Khử mùi nano', N'Khử mùi khoang lái bằng công nghệ nano, diệt khuẩn hệ thống điều hòa.', 200000.00, 20, 2, 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[ServiceCatalogItem] WHERE [ServiceCatalogItemId] = 'A1D1F1C0-0003-4A03-9E03-0000000000A3')
BEGIN
    INSERT INTO [dbo].[ServiceCatalogItem] ([ServiceCatalogItemId], [ServiceName], [Description], [BasePrice], [DurationMinutes], [ServicePackageType], [IsActive])
    VALUES ('A1D1F1C0-0003-4A03-9E03-0000000000A3', N'Đánh bóng đèn pha', N'Đánh bóng, phục hồi độ trong của chóa đèn pha bị ố mờ.', 250000.00, 40, 2, 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[ServiceCatalogItem] WHERE [ServiceCatalogItemId] = 'A1D1F1C0-0004-4A04-9E04-0000000000A4')
BEGIN
    INSERT INTO [dbo].[ServiceCatalogItem] ([ServiceCatalogItemId], [ServiceName], [Description], [BasePrice], [DurationMinutes], [ServicePackageType], [IsActive])
    VALUES ('A1D1F1C0-0004-4A04-9E04-0000000000A4', N'Rửa khoang động cơ', N'Vệ sinh khoang máy, xịt dưỡng dây điện và các chi tiết nhựa.', 180000.00, 30, 2, 1);
END;
GO

/* ---------- 3. Gán Add-on cho mọi chi nhánh đang hoạt động -- */

INSERT INTO [dbo].[BranchService] ([BranchId], [ServiceCatalogItemId], [IsActive])
SELECT b.[BranchId], s.[ServiceCatalogItemId], 1
FROM   [dbo].[Branch] b
CROSS JOIN [dbo].[ServiceCatalogItem] s
WHERE  s.[ServicePackageType] = 2
  AND  s.[IsActive] = 1
  AND  NOT EXISTS (
           SELECT 1
           FROM   [dbo].[BranchService] bs
           WHERE  bs.[BranchId] = b.[BranchId]
             AND  bs.[ServiceCatalogItemId] = s.[ServiceCatalogItemId]
       );
GO

/* ---------- 4. Kiểm tra kết quả ----------------------------- */

SELECT [ServicePackageType], COUNT(*) AS [SoDichVu]
FROM   [dbo].[ServiceCatalogItem]
GROUP BY [ServicePackageType]
ORDER BY [ServicePackageType];
GO
