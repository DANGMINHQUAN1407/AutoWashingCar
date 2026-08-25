using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Services;
using WashingCar_Common.Settings;

namespace WashingCar_BLL;

public static class DependencyInjection
{
        public static IServiceCollection AddBLL(this IServiceCollection services, IConfiguration config)
        {
                services.Configure<EmailSettings>(config.GetSection("SmtpSettings"));
                services.Configure<VnPaySettings>(config.GetSection("VnPay"));
                services.Configure<PaymentSettings>(config.GetSection("Payment"));
                services.Configure<AppSettings>(config.GetSection("App"));
                services.Configure<GoogleAuthSettings>(config.GetSection("GoogleAuth"));

                services.AddScoped<IJwtService, JwtService>();
                services.AddScoped<IAuthService, AuthService>();
                services.AddScoped<IEmailService, EmailService>();
                services.AddScoped<IAdminService, AdminService>();
                services.AddScoped<IVehicleService, VehicleService>();
                services.AddScoped<IVehicleTransferService, VehicleTransferService>();
        services.AddScoped<IVehicleCatalogService, VehicleCatalogService>();
                services.AddScoped<IServiceCatalogService, ServiceCatalogService>();
                services.AddScoped<IServicePricingService, ServicePricingService>();
                services.AddScoped<IBranchService, BranchService>();
                services.AddScoped<ISlotService, SlotService>();
                services.AddScoped<IBookingService, BookingService>();
                services.AddScoped<IPaymentService, PaymentService>();
                services.AddScoped<IVoucherService, VoucherService>();
                services.AddScoped<ILoyaltyVoucherService, LoyaltyVoucherService>();
                services.AddScoped<IVoucherApprovalService, VoucherApprovalService>();
                services.AddScoped<ILoyaltyService, LoyaltyService>();
                services.AddScoped<ITierService, TierService>();
                services.AddScoped<ITierBenefitService, TierBenefitService>();
                services.AddScoped<IReportService, ReportService>();
                services.AddScoped<IReviewService, ReviewService>();

                return services;
        }
}