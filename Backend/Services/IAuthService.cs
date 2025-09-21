using Backend.Models;

namespace Backend.Services;

public interface IAuthService
{
    Task<string> RequestOtpAsync(string mobile);
    Task<User?> ValidateOtpAsync(string mobile, string otp);
    Task<User?> CreateAdminAsync(string username, string password);
    Task<(User user, string token)?> UpdateUserAsync(int userId, string? newUsername, string? newPassword, int? Department);
}
