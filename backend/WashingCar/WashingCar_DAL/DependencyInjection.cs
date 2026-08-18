using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WashingCar_DAL.Data;
using WashingCar_DAL.Interfaces;
using WashingCar_DAL.Repositories;

namespace WashingCar_DAL;

public static class DependencyInjection
{
    public static IServiceCollection AddDAL(this IServiceCollection services, IConfiguration config)
    {
        // Interceptor ghi AuditLog cho mọi thay đổi dữ liệu
        services.AddScoped<AuditSaveChangesInterceptor>();

        services.AddDbContext<WashingCarDbContext>((sp, options) =>
            options.UseSqlServer(config.GetConnectionString("DefaultConnection"))
                   .AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>()));

        // Repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IVehicleRepository, VehicleRepository>();
        services.AddScoped<IVehicleEngineCatalogRepository, VehicleEngineCatalogRepository>();
        services.AddScoped<IVehicleBodyStyleCatalogRepository, VehicleBodyStyleCatalogRepository>();
        services.AddScoped<IServiceCatalogRepository, ServiceCatalogRepository>();
        services.AddScoped<IBranchRepository, BranchRepository>();
        services.AddScoped<IVoucherRepository, VoucherRepository>();
        services.AddScoped<ISlotRepository, SlotRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<ITierRepository, TierRepository>();
        services.AddScoped<ITierBenefitRepository, TierBenefitRepository>();
        services.AddScoped<ILoyaltyRepository, LoyaltyRepository>();
        services.AddScoped<IVoucherRepository, VoucherRepository>();
        services.AddScoped<IReviewRepository, ReviewRepository>();

        return services;
    }
}
