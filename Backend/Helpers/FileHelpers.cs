namespace Backend.Helpers;

public static class FileHelpers
{
    private static readonly string[] permittedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".pdf" };
    public static bool IsValidFile(IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !permittedExtensions.Contains(ext)) return false;
        return true;
    }
}

