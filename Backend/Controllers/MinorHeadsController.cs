using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MinorHeadsController : ControllerBase
{
    private readonly AppDbContext _db;
    public MinorHeadsController(AppDbContext db) => _db = db;

    [HttpGet("major/{majorHeadId:int}")]
    public async Task<IActionResult> GetByMajor(int majorHeadId)
    {
        var list = await _db.GetMinorHeadsByMajorAsync(majorHeadId);
        return Ok(list);
    }

    public record CreateMinorHeadRequest(int MajorHeadId, string Name);

    [HttpPost]
    public async Task<IActionResult> Create(CreateMinorHeadRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name required");
        var id = await _db.InsertMinorHeadAsync(req.MajorHeadId, req.Name.Trim());
        return Ok(new { Id = id, req.Name, req.MajorHeadId });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _db.DeleteMinorHeadAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }
}
