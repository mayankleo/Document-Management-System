using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly IFileService _fileService;

    public DocumentsController(IFileService fileService)
    {
        _fileService = fileService;
    }

    [HttpPost("upload")]
    [Authorize]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        var fileName = await _fileService.SaveFileAsync(file);
        var fileUrl = _fileService.GetFileUrl(fileName);
        return Ok(new { FileName = fileName, Url = fileUrl });
    }

    [HttpDelete("{fileName}")]
    [Authorize]
    public async Task<IActionResult> Delete(string fileName)
    {
        var deleted = await _fileService.DeleteFileAsync(fileName);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
