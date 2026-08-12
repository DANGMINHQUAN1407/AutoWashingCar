using System.Text.Json;
using WashingCar_Common.Exceptions;
using WashingCar_Domain.DTOs;

namespace WashingCar_API.Middlewares;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            _logger.LogWarning(
                "AppException [{StatusCode}] {Path}: {Message}",
                ex.StatusCode, context.Request.Path, ex.Message);

            await WriteErrorAsync(context, ex.StatusCode, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Unhandled exception at {Method} {Path}",
                context.Request.Method, context.Request.Path);

            await WriteErrorAsync(context, 500, "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode  = statusCode;
        context.Response.ContentType = "application/json";

        var body = JsonSerializer.Serialize(
            ApiResponse.Fail(message),
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await context.Response.WriteAsync(body);
    }
}
