using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly IAuthService _authService;

    public AdminController(IAuthService authService)
    {
        _authService = authService;
    }

    // api/admin/create-user
    [HttpPost("create-user")]
    public async Task<IActionResult> CreateAdminUser([FromBody] CreateAdminDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest("Username and Password required");

        var user = await _authService.CreateAdminAsync(dto.Username, dto.Password);
        if (user == null)
            return Conflict("Username already exists");

        return Ok(new { user.Id, user.Username, user.Mobile, user.IsAdmin });
    }
}

public record CreateAdminDto(string Username, string Password);
