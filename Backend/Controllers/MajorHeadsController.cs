using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MajorHeadsController : ControllerBase
{
    private readonly AppDbContext _db;
    public MajorHeadsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.GetMajorHeadsAsync();
        return Ok(list);
    }

    public record CreateMajorHeadRequest(string Name);

    [HttpPost]
    public async Task<IActionResult> Create(CreateMajorHeadRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name required");
        var id = await _db.InsertMajorHeadAsync(req.Name.Trim());
        return CreatedAtAction(nameof(GetAll), new { id }, new { Id = id, req.Name });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _db.DeleteMajorHeadAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }
}
