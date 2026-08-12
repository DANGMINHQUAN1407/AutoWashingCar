using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Security.Claims;
using WashingCar_DAL.Interfaces;
using WashingCar_API.BackgroundServices;
using WashingCar_API.Filters;
using WashingCar_API.Services;
using WashingCar_Domain.DTOs;

namespace WashingCar_API
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddAPI(this IServiceCollection services, IConfiguration config)
        {
            services.AddMemoryCache();

            // Người thao tác hiện tại — interceptor AuditLog dùng để điền cột UserId
            services.AddHttpContextAccessor();
            services.AddScoped<ICurrentUserAccessor, CurrentUserAccessor>();

            services.AddControllers();
            services.AddEndpointsApiExplorer();

            // DataAnnotations trên DTO fail (vd [Required]/[EmailAddress]) → [ApiController] tự trả 400,
            // nhưng phải bọc lại đúng format ApiResponse thay vì ValidationProblemDetails mặc định của ASP.NET.
            services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var errors = context.ModelState
                        .Where(kv => kv.Value?.Errors.Count > 0)
                        .SelectMany(kv => kv.Value!.Errors.Select(e => e.ErrorMessage));

                    return new BadRequestObjectResult(ApiResponse.Fail(string.Join(" ", errors)));
                };
            });

            services.AddCors(config);
            services.AddJwt(config);
            services.AddSwaggerWithAuth();
            services.AddHostedService<BookingReminderBackgroundService>();
            return services;
        }

        private static IServiceCollection AddCors(this IServiceCollection services, IConfiguration config)
        {
            var origins = config.GetSection("AllowedOrigins").Get<string[]>()
                ?? throw new InvalidOperationException("Missing 'AllowedOrigins' configuration.");

            services.AddCors(options =>
                options.AddDefaultPolicy(policy => policy
                    .WithOrigins(origins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()));

            return services;
        }

        private static IServiceCollection AddJwt(this IServiceCollection services, IConfiguration config)
        {
            // Đọc 1 lần lúc khởi động — thiếu key thì fail NGAY tại đây (fail-fast),
            // không trôi tới lúc user đầu tiên login mới nổ.
            var keyValue = config["Jwt:Key"]
                ?? throw new InvalidOperationException("Missing 'Jwt:Key' configuration.");
            var keyBytes = Encoding.UTF8.GetBytes(keyValue);

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    // .NET 8: tắt remap ngầm để đọc đúng tên claim "sub"/"role" đã ghi
                    options.MapInboundClaims = false;

                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = config["Jwt:Issuer"],
                        ValidAudience = config["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
                        ClockSkew = TimeSpan.Zero,
                        NameClaimType = JwtRegisteredClaimNames.Sub,   // User.Identity.Name = userId
                        RoleClaimType = "role"                          // [Authorize(Roles=...)] khớp claim "role"
                    };

                    options.Events = new JwtBearerEvents
                    {
                        // SignalR: nhận access_token qua query string cho /hubs
                        OnMessageReceived = context =>
                        {
                            var accessToken = context.Request.Query["access_token"];
                            var path = context.HttpContext.Request.Path;
                            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                                context.Token = accessToken;
                            return Task.CompletedTask;
                        },

                        // Chặn token của user đã bị vô hiệu hóa / xóa mềm
                        OnTokenValidated = async context =>
                        {
                            var sub = context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                            if (!Guid.TryParse(sub, out var userId)) return;

                            // RequestServices đã là request scope — không cần CreateScope()
                            var userRepo = context.HttpContext.RequestServices
                                                  .GetRequiredService<IUserRepository>();
                            var user = await userRepo.GetByIdAsync(userId);

                            if (user is null || !user.IsActive || user.IsDeleted)
                                context.Fail("Tài khoản đã bị vô hiệu hóa.");
                        }
                    };
                });

            services.AddAuthorization();
            return services;    
        }

        private static IServiceCollection AddSwaggerWithAuth(this IServiceCollection services)
        {
            services.AddSwaggerGen(c =>
            {
                c.CustomSchemaIds(type => type.FullName ?? type.Name);
                c.OperationFilter<IdempotencyHeaderFilter>();
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id   = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
            });
            });
            return services;
        }
    }
}
