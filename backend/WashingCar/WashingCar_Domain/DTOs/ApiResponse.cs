namespace WashingCar_Domain.DTOs;

public sealed class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Message { get; init; }
    public string? Error { get; init; }

    public static ApiResponse<T> Ok(T data, string? message = null)
        => new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string error)
        => new() { Success = false, Error = error };
}

public static class ApiResponse
{
    public static ApiResponse<T> Ok<T>(T data, string? message = null)
        => ApiResponse<T>.Ok(data, message);

    public static ApiResponse<object?> Ok(string? message = null)
        => new() { Success = true, Message = message };

    public static ApiResponse<object?> Fail(string error)
        => new() { Success = false, Error = error };
}
