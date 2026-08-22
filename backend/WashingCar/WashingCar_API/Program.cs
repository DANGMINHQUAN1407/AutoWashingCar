using WashingCar_API;
using WashingCar_API.Middlewares;
using WashingCar_BLL;
using WashingCar_DAL;
using WashingCar_DAL.Seeders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDAL(builder.Configuration);
builder.Services.AddBLL(builder.Configuration);
builder.Services.AddAPI(builder.Configuration);

var app = builder.Build();

if (!app.Environment.IsEnvironment("Testing"))
    await DataSeeder.SeedAsync(app.Services, app.Configuration);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseCors();

// Thứ tự middleware quan trọng:
app.UseMiddleware<ExceptionHandlingMiddleware>(); // 1. bắt exception toàn bộ
app.UseMiddleware<RequestLoggingMiddleware>();     // 2. log request/response
app.UseMiddleware<IdempotencyMiddleware>();        // 3. chống double-submit

app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapControllers();
app.Run();

public partial class Program { }
