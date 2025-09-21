using Backend.Models;

namespace Backend.Services;

public interface IAuthService
{
    Task<string> RequestOtpAsync(string mobile);
    Task<string?> ValidateOtpAsync(string mobile, string otp);
    Task<User?> CreateAdminAsync(string username, string password);
    Task<User?> UpdateUserAsync(int userId, string? newUsername, string? newPassword);
}
