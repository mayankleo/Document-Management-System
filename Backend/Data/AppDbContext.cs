using System.Data;
using Dapper;
using MySqlConnector;
using Backend.Models;

namespace Backend.Data;

public class AppDbContext : IDisposable
{
    private readonly IDbConnection _connection;

    public AppDbContext(IConfiguration config)
    {
        var masterConnStr = config.GetConnectionString("Master");
        using var masterConn = new MySqlConnection(masterConnStr);
        masterConn.Open();
        masterConn.Execute("CREATE DATABASE IF NOT EXISTS mydmsdb");
        var connStr = config.GetConnectionString("Default");
        _connection = new MySqlConnection(connStr);
        _connection.Open();
        InitializeTables();
        SeedFromConfiguration(config);
    }

    public IDbConnection Connection => _connection;

    private void InitializeTables()
    {
        // Users
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS Users (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                DepartmentId INT,
                Username VARCHAR(100) UNIQUE NOT NULL,
                Mobile VARCHAR(20) NOT NULL UNIQUE,
                PasswordHash VARCHAR(255),
                IsAdmin BOOLEAN DEFAULT FALSE,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );");

        // Tags
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS Tags (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                Name VARCHAR(100) NOT NULL UNIQUE
            );");

        // MajorHeads
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS MajorHeads (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                Name VARCHAR(100) NOT NULL
            );");

        // MinorHeads
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS MinorHeads (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                MajorHeadId INT NOT NULL,
                Name VARCHAR(100) NOT NULL,
                FOREIGN KEY (MajorHeadId) REFERENCES MajorHeads(Id) ON DELETE CASCADE
            );");

        // Documents
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS Documents (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                FileOriginalName VARCHAR(255) NOT NULL,
                FileName VARCHAR(500) NOT NULL,
                ContentType VARCHAR(100) NOT NULL,
                Size BIGINT NOT NULL,
                MajorHeadId INT NOT NULL,
                MinorHeadId INT NOT NULL,
                Remarks TEXT,
                DocumentDate DATETIME,
                UploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UploadedBy INT,
                FOREIGN KEY (MajorHeadId) REFERENCES MajorHeads(Id),
                FOREIGN KEY (MinorHeadId) REFERENCES MinorHeads(Id),
                FOREIGN KEY (UploadedBy) REFERENCES Users(Id)
            );");

        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS DocumentTags (
                DocumentId INT NOT NULL,
                TagId INT NOT NULL,
                PRIMARY KEY (DocumentId, TagId),
                FOREIGN KEY (DocumentId) REFERENCES Documents(Id) ON DELETE CASCADE,
                FOREIGN KEY (TagId) REFERENCES Tags(Id) ON DELETE CASCADE
            );");
    }


    // DBinit
    private void SeedFromConfiguration(IConfiguration config)
    {
        var dbInitSection = config.GetSection("DBinit");
        if (!dbInitSection.Exists()) return;

        var majorDefs = dbInitSection.GetSection("Majors").Get<List<MajorSeed>>() ?? new();
        var adminDefs = dbInitSection.GetSection("Admins").Get<List<AdminSeed>>() ?? new();

        using var tx = _connection.BeginTransaction();
        try
        {
            foreach (var major in majorDefs)
            {
                if (string.IsNullOrWhiteSpace(major.Name)) continue;

                var majorId = _connection.ExecuteScalar<int?>(
                    "SELECT Id FROM MajorHeads WHERE Name=@Name LIMIT 1",
                    new { major.Name }, tx);

                if (majorId == null)
                {
                    majorId = _connection.ExecuteScalar<int>(
                        "INSERT INTO MajorHeads (Name) VALUES (@Name); SELECT LAST_INSERT_ID();",
                        new { major.Name }, tx);
                }

                if (major.Minors != null)
                {
                    foreach (var minor in major.Minors.Where(m => !string.IsNullOrWhiteSpace(m)))
                    {
                        var exists = _connection.ExecuteScalar<int>(
                            "SELECT COUNT(*) FROM MinorHeads WHERE MajorHeadId=@Mid AND Name=@Name",
                            new { Mid = majorId, Name = minor.Trim() }, tx);
                        if (exists == 0)
                        {
                            _connection.Execute(
                                "INSERT INTO MinorHeads (MajorHeadId, Name) VALUES (@Mid, @Name)",
                                new { Mid = majorId, Name = minor.Trim() }, tx);
                        }
                    }
                }
            }

            foreach (var admin in adminDefs)
            {
                if (string.IsNullOrWhiteSpace(admin.Mobile) ||
                    string.IsNullOrWhiteSpace(admin.Username) ||
                    string.IsNullOrWhiteSpace(admin.Password))
                    continue;

                var userExists = _connection.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM Users WHERE Mobile=@Mobile OR Username=@Username",
                    new { admin.Mobile, admin.Username }, tx);

                if (userExists == 0)
                {
                    var hash = BCrypt.Net.BCrypt.HashPassword(admin.Password);
                    var newUserId = _connection.ExecuteScalar<int>(
                        @"INSERT INTO Users (Username, Mobile, PasswordHash, IsAdmin)
                          VALUES (@Username, @Mobile, @PasswordHash, TRUE);
                          SELECT LAST_INSERT_ID();",
                        new { Username = admin.Username, Mobile = admin.Mobile, PasswordHash = hash }, tx);
                }
            }

            tx.Commit();
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    private sealed class AdminSeed
    {
        public string Mobile { get; set; } = "";
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }

    private sealed class MajorSeed
    {
        public string Name { get; set; } = "";
        public List<string> Minors { get; set; } = new();
    }


    // ---------- USERS ----------
    public async Task<User?> GetUserByMobileAsync(string mobile)
    {
        var sql = "SELECT * FROM Users WHERE Mobile = @Mobile LIMIT 1";
        return await _connection.QueryFirstOrDefaultAsync<User>(sql, new { Mobile = mobile });
    }

    public async Task<User?> GetUserByIdAsync(int id)
    {
        var sql = "SELECT * FROM Users WHERE Id = @Id LIMIT 1";
        return await _connection.QueryFirstOrDefaultAsync<User>(sql, new { Id = id });
    }

    public async Task<int> InsertUserAsync(User user)
    {
        var sql = @"INSERT INTO Users (Username, Mobile, PasswordHash, IsAdmin)
                    VALUES (@Username, @Mobile, @PasswordHash, @IsAdmin);
                    SELECT LAST_INSERT_ID();";
        return await _connection.ExecuteScalarAsync<int>(sql, user);
    }

    // ---------- TAGS ----------
    public async Task<IEnumerable<Tag>> GetTagsAsync()
    {
        var sql = "SELECT * FROM Tags";
        return await _connection.QueryAsync<Tag>(sql);
    }

    public async Task<int> InsertTagAsync(string tagName, IDbTransaction? transaction = null)
    {
        var sql = @"INSERT INTO Tags (Name) VALUES (@Name); SELECT LAST_INSERT_ID();";
        return await _connection.ExecuteScalarAsync<int>(sql, new { Name = tagName }, transaction);
    }

    // ---------- MAJOR / MINOR HEADS ----------
    public async Task<IEnumerable<MajorHead>> GetMajorHeadsAsync()
    {
        var sql = "SELECT * FROM MajorHeads";
        return await _connection.QueryAsync<MajorHead>(sql);
    }

    public async Task<MajorHead?> GetMajorHeadsByIdAsync(int id)
    {
        var sql = "SELECT * FROM MajorHeads WHERE Id=@Id";
        return await _connection.QueryFirstOrDefaultAsync<MajorHead>(sql, new { Id = id });
    }

    public async Task<IEnumerable<MinorHead>> GetMinorHeadsByMajorAsync(int majorHeadId)
    {
        var sql = "SELECT * FROM MinorHeads WHERE MajorHeadId = @MajorHeadId";
        return await _connection.QueryAsync<MinorHead>(sql, new { MajorHeadId = majorHeadId });
    }

    public async Task<MinorHead?> GetMinorHeadsByIdAsync(int id)
    {
        var sql = "SELECT * FROM MinorHeads WHERE Id=@Id";
        return await _connection.QueryFirstOrDefaultAsync<MinorHead>(sql, new { Id = id });
    }

    public async Task<int> InsertMinorHeadAsync(int majorHeadId, string name)
    {
        var sql = @"INSERT INTO MinorHeads (MajorHeadId, Name) VALUES (@MajorHeadId, @Name); SELECT LAST_INSERT_ID();";
        return await _connection.ExecuteScalarAsync<int>(sql, new { MajorHeadId = majorHeadId, Name = name });
    }

    public async Task<bool> DeleteMinorHeadAsync(int id)
    {
        var sql = "DELETE FROM MinorHeads WHERE Id = @Id";
        var rows = await _connection.ExecuteAsync(sql, new { Id = id });
        return rows > 0;
    }

    // ---------- DOCUMENTS ----------
    public async Task<int> InsertDocumentAsync(Document doc, IEnumerable<string> tags)
    {
        using var transaction = _connection.BeginTransaction();

        try
        {
            var sqlDoc = @"INSERT INTO Documents 
                            (FileOriginalName, FileName, ContentType, Size, MajorHeadId, MinorHeadId, Remarks, DocumentDate, UploadedAt, UploadedBy)
                           VALUES (@FileOriginalName, @FileName, @ContentType, @Size, @MajorHeadId, @MinorHeadId, @Remarks, @DocumentDate, @UploadedAt, @UploadedBy);
                           SELECT LAST_INSERT_ID();";

            var documentId = await _connection.ExecuteScalarAsync<int>(sqlDoc, doc, transaction);

            foreach (var tagName in tags)
            {
                if (string.IsNullOrWhiteSpace(tagName)) continue;
                var tag = await _connection.QueryFirstOrDefaultAsync<Tag>(
                    "SELECT * FROM Tags WHERE Name = @Name", new { Name = tagName }, transaction);

                int tagId;
                if (tag == null)
                {
                    tagId = await InsertTagAsync(tagName, transaction);
                }
                else
                {
                    tagId = tag.Id;
                }

                await LinkDocumentTagAsync(documentId, tagId, transaction);
            }

            transaction.Commit();
            return documentId;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<Document?> GetDocumentByIdAsync(int id)
    {
        var sql = @"SELECT d.*, 
                           mh.Id   AS MH_Id, mh.Name AS MH_Name,
                           mi.Id   AS MI_Id, mi.MajorHeadId AS MI_MajorHeadId, mi.Name AS MI_Name,
                           t.Id    AS Tag_Id, t.Name AS Tag_Name
                    FROM Documents d
                    JOIN MajorHeads mh ON d.MajorHeadId = mh.Id
                    JOIN MinorHeads mi ON d.MinorHeadId = mi.Id
                    LEFT JOIN DocumentTags dt ON d.Id = dt.DocumentId
                    LEFT JOIN Tags t ON dt.TagId = t.Id
                    WHERE d.Id = @Id";

        var lookup = new Dictionary<int, Document>();
        var rows = await _connection.QueryAsync(sql, new { Id = id });
        foreach (var row in rows)
        {
            int docId = row.Id;
            if (!lookup.TryGetValue(docId, out var doc))
            {
                doc = new Document
                {
                    Id = row.Id,
                    FileOriginalName = row.FileOriginalName,
                    FileName = row.FileName,
                    ContentType = row.ContentType,
                    Size = row.Size,
                    MajorHeadId = row.MajorHeadId,
                    MinorHeadId = row.MinorHeadId,
                    Remarks = row.Remarks ?? string.Empty,
                    DocumentDate = row.DocumentDate,
                    UploadedAt = row.UploadedAt,
                    UploadedBy = row.UploadedBy,
                    MajorHead = new MajorHead { Id = row.MH_Id, Name = row.MH_Name },
                    MinorHead = new MinorHead { Id = row.MI_Id, MajorHeadId = row.MI_MajorHeadId, Name = row.MI_Name },
                    DocumentTags = new List<DocumentTag>()
                };
                lookup[docId] = doc;
            }
            if (row.Tag_Id != null)
            {
                int tagId = row.Tag_Id;
                if (!doc.DocumentTags.Any(dt => dt.TagId == tagId))
                {
                    doc.DocumentTags.Add(new DocumentTag
                    {
                        DocumentId = doc.Id,
                        TagId = tagId,
                        Tag = new Tag { Id = tagId, Name = row.Tag_Name }
                    });
                }
            }
        }
        return lookup.Values.FirstOrDefault();
    }

    public async Task<IEnumerable<Document>> GetAllDocumentsAsync()
    {
        var sql = @"SELECT d.*, 
                           mh.Id   AS MH_Id, mh.Name AS MH_Name,
                           mi.Id   AS MI_Id, mi.MajorHeadId AS MI_MajorHeadId, mi.Name AS MI_Name,
                           t.Id    AS Tag_Id, t.Name AS Tag_Name
                    FROM Documents d
                    JOIN MajorHeads mh ON d.MajorHeadId = mh.Id
                    JOIN MinorHeads mi ON d.MinorHeadId = mi.Id
                    LEFT JOIN DocumentTags dt ON d.Id = dt.DocumentId
                    LEFT JOIN Tags t ON dt.TagId = t.Id
                    ORDER BY d.UploadedAt DESC, d.Id DESC";

        var lookup = new Dictionary<int, Document>();
        var rows = await _connection.QueryAsync(sql);
        foreach (var row in rows)
        {
            int docId = row.Id;
            if (!lookup.TryGetValue(docId, out var doc))
            {
                doc = new Document
                {
                    Id = row.Id,
                    FileOriginalName = row.FileOriginalName,
                    FileName = row.FileName,
                    ContentType = row.ContentType,
                    Size = row.Size,
                    MajorHeadId = row.MajorHeadId,
                    MinorHeadId = row.MinorHeadId,
                    Remarks = row.Remarks ?? string.Empty,
                    DocumentDate = row.DocumentDate,
                    UploadedAt = row.UploadedAt,
                    UploadedBy = row.UploadedBy,
                    MajorHead = new MajorHead { Id = row.MH_Id, Name = row.MH_Name },
                    MinorHead = new MinorHead { Id = row.MI_Id, MajorHeadId = row.MI_MajorHeadId, Name = row.MI_Name },
                    DocumentTags = new List<DocumentTag>()
                };
                lookup[docId] = doc;
            }
            if (row.Tag_Id != null)
            {
                int tagId = row.Tag_Id;
                if (!doc.DocumentTags.Any(dt => dt.TagId == tagId))
                {
                    doc.DocumentTags.Add(new DocumentTag
                    {
                        DocumentId = doc.Id,
                        TagId = tagId,
                        Tag = new Tag { Id = tagId, Name = row.Tag_Name }
                    });
                }
            }
        }
        return lookup.Values;
    }

    public async Task<IEnumerable<Document>> SearchDocumentsWithDetailsAsync(int? majorHeadId, int? minorHeadId, DateTime? from, DateTime? to, IEnumerable<string>? tags = null)
    {
        var sql = @"SELECT d.*, 
                           mh.Id   AS MH_Id, mh.Name AS MH_Name,
                           mi.Id   AS MI_Id, mi.MajorHeadId AS MI_MajorHeadId, mi.Name AS MI_Name,
                           t.Id    AS Tag_Id, t.Name AS Tag_Name
                    FROM Documents d
                    JOIN MajorHeads mh ON d.MajorHeadId = mh.Id
                    JOIN MinorHeads mi ON d.MinorHeadId = mi.Id
                    LEFT JOIN DocumentTags dt ON d.Id = dt.DocumentId
                    LEFT JOIN Tags t ON dt.TagId = t.Id
                    WHERE (@MajorHeadId IS NULL OR d.MajorHeadId = @MajorHeadId)
                      AND (@MinorHeadId IS NULL OR d.MinorHeadId = @MinorHeadId)
                      AND (@From IS NULL OR d.UploadedAt >= @From)
                      AND (@To IS NULL OR d.UploadedAt <= @To)";
        if (tags != null && tags.Any())
        {
            sql += " AND t.Name IN @Tags";
        }
        sql += " ORDER BY d.UploadedAt DESC, d.Id DESC";

        var lookup = new Dictionary<int, Document>();
        var rows = await _connection.QueryAsync(sql, new { MajorHeadId = majorHeadId, MinorHeadId = minorHeadId, From = from, To = to, Tags = tags });
        foreach (var row in rows)
        {
            int docId = row.Id;
            if (!lookup.TryGetValue(docId, out var doc))
            {
                doc = new Document
                {
                    Id = row.Id,
                    FileOriginalName = row.FileOriginalName,
                    FileName = row.FileName,
                    ContentType = row.ContentType,
                    Size = row.Size,
                    MajorHeadId = row.MajorHeadId,
                    MinorHeadId = row.MinorHeadId,
                    Remarks = row.Remarks ?? string.Empty,
                    DocumentDate = row.DocumentDate,
                    UploadedAt = row.UploadedAt,
                    UploadedBy = row.UploadedBy,
                    MajorHead = new MajorHead { Id = row.MH_Id, Name = row.MH_Name },
                    MinorHead = new MinorHead { Id = row.MI_Id, MajorHeadId = row.MI_MajorHeadId, Name = row.MI_Name },
                    DocumentTags = new List<DocumentTag>()
                };
                lookup[docId] = doc;
            }
            if (row.Tag_Id != null)
            {
                int tagId = row.Tag_Id;
                if (!lookup[docId].DocumentTags.Any(dt => dt.TagId == tagId))
                {
                    lookup[docId].DocumentTags.Add(new DocumentTag
                    {
                        DocumentId = docId,
                        TagId = tagId,
                        Tag = new Tag { Id = tagId, Name = row.Tag_Name }
                    });
                }
            }
        }
        return lookup.Values;
    }

    // NEW: get single doc by file name
    public async Task<Document?> GetDocumentByFileNameAsync(string fileName)
    {
        var sql = @"SELECT d.*, 
                           mh.Id   AS MH_Id, mh.Name AS MH_Name,
                           mi.Id   AS MI_Id, mi.MajorHeadId AS MI_MajorHeadId, mi.Name AS MI_Name,
                           t.Id    AS Tag_Id, t.Name AS Tag_Name
                    FROM Documents d
                    JOIN MajorHeads mh ON d.MajorHeadId = mh.Id
                    JOIN MinorHeads mi ON d.MinorHeadId = mi.Id
                    LEFT JOIN DocumentTags dt ON d.Id = dt.DocumentId
                    LEFT JOIN Tags t ON dt.TagId = t.Id
                    WHERE d.FileName = @FileName";
        var lookup = new Dictionary<int, Document>();
        var rows = await _connection.QueryAsync(sql, new { FileName = fileName });
        foreach (var row in rows)
        {
            int docId = row.Id;
            if (!lookup.TryGetValue(docId, out var doc))
            {
                doc = new Document
                {
                    Id = row.Id,
                    FileOriginalName = row.FileOriginalName,
                    FileName = row.FileName,
                    ContentType = row.ContentType,
                    Size = row.Size,
                    MajorHeadId = row.MajorHeadId,
                    MinorHeadId = row.MinorHeadId,
                    Remarks = row.Remarks ?? string.Empty,
                    DocumentDate = row.DocumentDate,
                    UploadedAt = row.UploadedAt,
                    UploadedBy = row.UploadedBy,
                    MajorHead = new MajorHead { Id = row.MH_Id, Name = row.MH_Name },
                    MinorHead = new MinorHead { Id = row.MI_Id, MajorHeadId = row.MI_MajorHeadId, Name = row.MI_Name },
                    DocumentTags = new List<DocumentTag>()
                };
                lookup[docId] = doc;
            }
            if (row.Tag_Id != null)
            {
                int tagId = row.Tag_Id;
                if (!doc.DocumentTags.Any(dt => dt.TagId == tagId))
                {
                    doc.DocumentTags.Add(new DocumentTag
                    {
                        DocumentId = doc.Id,
                        TagId = tagId,
                        Tag = new Tag { Id = tagId, Name = row.Tag_Name }
                    });
                }
            }
        }
        return lookup.Values.FirstOrDefault();
    }

    // NEW: get multiple docs by file names
    public async Task<IEnumerable<Document>> GetDocumentsByFileNamesAsync(ICollection<string> fileNames)
    {
        if (fileNames == null || fileNames.Count == 0) return Enumerable.Empty<Document>();
        var sql = @"SELECT d.*, 
                           mh.Id   AS MH_Id, mh.Name AS MH_Name,
                           mi.Id   AS MI_Id, mi.MajorHeadId AS MI_MajorHeadId, mi.Name AS MI_Name,
                           t.Id    AS Tag_Id, t.Name AS Tag_Name
                    FROM Documents d
                    JOIN MajorHeads mh ON d.MajorHeadId = mh.Id
                    JOIN MinorHeads mi ON d.MinorHeadId = mi.Id
                    LEFT JOIN DocumentTags dt ON d.Id = dt.DocumentId
                    LEFT JOIN Tags t ON dt.TagId = t.Id
                    WHERE d.FileName IN @Names";
        var lookup = new Dictionary<int, Document>();
        var rows = await _connection.QueryAsync(sql, new { Names = fileNames });
        foreach (var row in rows)
        {
            int docId = row.Id;
            if (!lookup.TryGetValue(docId, out var doc))
            {
                doc = new Document
                {
                    Id = row.Id,
                    FileOriginalName = row.FileOriginalName,
                    FileName = row.FileName,
                    ContentType = row.ContentType,
                    Size = row.Size,
                    MajorHeadId = row.MajorHeadId,
                    MinorHeadId = row.MinorHeadId,
                    Remarks = row.Remarks ?? string.Empty,
                    DocumentDate = row.DocumentDate,
                    UploadedAt = row.UploadedAt,
                    UploadedBy = row.UploadedBy,
                    MajorHead = new MajorHead { Id = row.MH_Id, Name = row.MH_Name },
                    MinorHead = new MinorHead { Id = row.MI_Id, MajorHeadId = row.MI_MajorHeadId, Name = row.MI_Name },
                    DocumentTags = new List<DocumentTag>()
                };
                lookup[docId] = doc;
            }
            if (row.Tag_Id != null)
            {
                int tagId = row.Tag_Id;
                if (!lookup[docId].DocumentTags.Any(dt => dt.TagId == tagId))
                {
                    lookup[docId].DocumentTags.Add(new DocumentTag
                    {
                        DocumentId = docId,
                        TagId = tagId,
                        Tag = new Tag { Id = tagId, Name = row.Tag_Name }
                    });
                }
            }
        }
        return lookup.Values;
    }

    // ---------- DOCUMENT TAGS ----------
    private async Task LinkDocumentTagAsync(int documentId, int tagId, IDbTransaction transaction)
    {
        var sql = @"INSERT INTO DocumentTags (DocumentId, TagId) VALUES (@DocumentId, @TagId)";
        await _connection.ExecuteAsync(sql, new { DocumentId = documentId, TagId = tagId }, transaction);
    }

    public void Dispose()
    {
        _connection.Dispose();
    }
}
