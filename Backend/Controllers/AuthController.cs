using Microsoft.AspNetCore.Mvc;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace DMS_Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // api/auth/request-otp
    [HttpPost("request-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Mobile))
            return BadRequest("Mobile is required");

        var otp = await _authService.RequestOtpAsync(dto.Mobile);
        return Ok(new { mobile = dto.Mobile, otp });
    }

    // api/auth/validate-otp
    [HttpPost("validate-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateOtp([FromBody] ValidateOtpDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Mobile) || string.IsNullOrWhiteSpace(dto.Otp))
            return BadRequest("Mobile and Otp are required");

        var token = await _authService.ValidateOtpAsync(dto.Mobile, dto.Otp);
        if (token == null) return Unauthorized("Invalid OTP");
        return Ok(new { token });
    }

    // api/auth/update
    [HttpPost("update")]
    [Authorize]
    public async Task<IActionResult> Update([FromBody] UpdateUserDto dto)
    {
        var userIdStr = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdStr == null) return Unauthorized();
        if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

        if (dto.Username is not null && string.IsNullOrWhiteSpace(dto.Username))
            return BadRequest("Username cannot be whitespace");
        if (dto.Password is not null && dto.Password.Length < 6)
            return BadRequest("Password must be at least 6 chars");

        var updated = await _authService.UpdateUserAsync(userId, dto.Username, dto.Password);
        if (updated == null) return NotFound();

        return Ok(new { updated.Id, updated.Username, updated.Mobile, updated.IsAdmin });
    }
}

public record RequestOtpDto(string Mobile);
public record ValidateOtpDto(string Mobile, string Otp);
public record UpdateUserDto(string? Username, string? Password);
 