using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Dapper;

namespace Backend.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;

    private static readonly Dictionary<string, string> _otpStore = new();

    public AuthService(AppDbContext db, IConfiguration cfg)
    {
        _db = db;
        _cfg = cfg;
    }

    public async Task<string> RequestOtpAsync(string mobile)
    {
        var otp = new Random().Next(100000, 999999).ToString();

        _otpStore[mobile] = otp;

        var sqlFind = "SELECT * FROM Users WHERE Mobile = @Mobile LIMIT 1;";
        var user = await _db.Connection.QueryFirstOrDefaultAsync<User>(sqlFind, new { Mobile = mobile });

        if (user == null)
        {
            var sqlInsert = @"INSERT INTO Users (Mobile, Username, PasswordHash, IsAdmin) 
                              VALUES (@Mobile, @Username, @PasswordHash, @IsAdmin);
                              SELECT LAST_INSERT_ID();";

            var newId = await _db.Connection.ExecuteScalarAsync<long>(sqlInsert, new
            {
                Mobile = mobile,
                Username = mobile,
                PasswordHash = "",
                IsAdmin = false
            });

            user = new User
            {
                Id = (int)newId,
                Mobile = mobile,
                Username = mobile,
                PasswordHash = "",
                IsAdmin = false
            };
        }

        return otp;
    }

    public async Task<User?> ValidateOtpAsync(string mobile, string otp)
    {
        if (!_otpStore.ContainsKey(mobile) || _otpStore[mobile] != otp)
            return null;

        var sqlFind = "SELECT * FROM Users WHERE Mobile = @Mobile LIMIT 1;";
        var user = await _db.Connection.QueryFirstOrDefaultAsync<User>(sqlFind, new { Mobile = mobile });
        if (user == null) return null;

        _otpStore.Remove(mobile);

        return user;
    }

    public async Task<User?> CreateAdminAsync(string username, string password)
    {
        var sqlCheck = "SELECT COUNT(*) FROM Users WHERE Username = @Username;";
        var exists = await _db.Connection.ExecuteScalarAsync<int>(sqlCheck, new { Username = username });

        if (exists > 0)
            return null;

        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        var sqlInsert = @"INSERT INTO Users (Username, Mobile, PasswordHash, IsAdmin) 
                          VALUES (@Username, @Mobile, @PasswordHash, @IsAdmin);
                          SELECT LAST_INSERT_ID();";

        var newId = await _db.Connection.ExecuteScalarAsync<long>(sqlInsert, new
        {
            Username = username,
            Mobile = username,
            PasswordHash = hash,
            IsAdmin = true
        });

        return new User
        {
            Id = (int)newId,
            Username = username,
            Mobile = username,
            PasswordHash = hash,
            IsAdmin = true
        };
    }

    public async Task<(User user, string token)?> UpdateUserAsync(int userId, string? newUsername, string? newPassword, int? Department)
    {
        var sqlGet = "SELECT * FROM Users WHERE Id = @Id LIMIT 1";
        var user = await _db.Connection.QueryFirstOrDefaultAsync<User>(sqlGet, new { Id = userId });
        if (user == null) return null;

        bool needUpdate = false;
        string? hash = null;

        if (!string.IsNullOrWhiteSpace(newUsername) && newUsername != user.Username)
        {
            user.Username = newUsername.Trim();
            needUpdate = true;
        }

        if (!string.IsNullOrWhiteSpace(newPassword))
        {
            hash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.PasswordHash = hash;
            needUpdate = true;
        }

        if (needUpdate)
        {
            var sqlUpdate = "UPDATE Users SET Username = @Username, PasswordHash = @PasswordHash WHERE Id = @Id";
            await _db.Connection.ExecuteAsync(sqlUpdate, new { Username = user.Username, PasswordHash = user.PasswordHash, Id = user.Id });
        }
        var token = JwtTokenHelper.GenerateToken(user, _cfg);

        await _db.InsertMinorHeadAsync(1, user.Username);

        return (user, token);
    }
}
