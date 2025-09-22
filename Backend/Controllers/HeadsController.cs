using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HeadsController : ControllerBase
{
    private readonly AppDbContext _db;
    public HeadsController(AppDbContext db) => _db = db;


    [HttpGet("major")]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.GetMajorHeadsAsync();
        return Ok(list);
    }

    [HttpGet("minor/{majorHeadId:int}")]
    public async Task<IActionResult> GetByMajor(int majorHeadId)
    {
        var list = await _db.GetMinorHeadsByMajorAsync(majorHeadId);
        return Ok(list);
    }

    public record CreateMinorHeadRequest(int MajorHeadId, string Name);

    [HttpPost("minor")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create(CreateMinorHeadRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name required");
        var id = await _db.InsertMinorHeadAsync(req.MajorHeadId, req.Name.Trim());
        return Ok(new { Id = id, req.Name, req.MajorHeadId });
    }

    [HttpDelete("minor/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _db.DeleteMinorHeadAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }
}
