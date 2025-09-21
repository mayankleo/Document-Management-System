using Backend.Helpers;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        var User = await _authService.ValidateOtpAsync(dto.Mobile, dto.Otp);
        if (User == null) return Unauthorized("Invalid OTP");

        if (dto.Username is not null && string.IsNullOrWhiteSpace(dto.Username))
            return BadRequest("Username cannot be whitespace");
        if (dto.Password is not null && dto.Password.Length < 6)
            return BadRequest("Password must be at least 6 chars");

        var user = await _authService.UpdateUserAsync(User.Id, dto.Username, dto.Password, dto.Department);
        if (user == null) return NotFound();
        if (user.Value.token == "") return StatusCode(206);

        return Ok(new { user.Value.user.Id, user.Value.user.Username, user.Value.user.Mobile, user.Value.user.DepartmentID, user.Value.user.IsAdmin, user.Value.token });
    }
}

public record RequestOtpDto(string Mobile);
public record ValidateOtpDto(string Mobile, string Otp, string? Username, string? Password, int? Department);
 