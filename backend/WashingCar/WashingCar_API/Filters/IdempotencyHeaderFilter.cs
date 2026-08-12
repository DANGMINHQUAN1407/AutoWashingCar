using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace WashingCar_API.Filters;

public class IdempotencyHeaderFilter : IOperationFilter
{
    private static readonly HashSet<string> _protectedPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/bookings",
        "/api/bookings/walk-in",
        "/api/payments/deposit",
        "/api/payments/final",
    };

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var path   = "/" + context.ApiDescription.RelativePath?.TrimStart('/');
        var method = context.ApiDescription.HttpMethod;

        if (!string.Equals(method, "POST", StringComparison.OrdinalIgnoreCase)
            || !_protectedPaths.Contains(path))
            return;

        operation.Parameters ??= [];
        operation.Parameters.Add(new OpenApiParameter
        {
            Name        = "Idempotency-Key",
            In          = ParameterLocation.Header,
            Required    = true,
            Schema      = new OpenApiSchema { Type = "string", Format = "uuid" },
            Description = "UUID duy nhất cho mỗi request, chống double-submit. Đổi UUID mới mỗi lần tạo.",
        });
    }
}
