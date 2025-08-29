// COMPLETE SETUP AND USAGE GUIDE

/* 
=== MONGODB INDEXES FOR OPTIMAL PERFORMANCE ===

Run these MongoDB commands to create optimal indexes:

// Basic indexes for tree operations
db.treenodes.createIndex({ "parentId": 1, "sortOrder": 1 })
db.treenodes.createIndex({ "parentId": 1, "_id": 1 })
db.treenodes.createIndex({ "name": "text", "description": "text" })

// Compound indexes for complex queries
db.treenodes.createIndex({ "isActive": 1, "parentId": 1, "sortOrder": 1 })
db.treenodes.createIndex({ "metadata.type": 1, "parentId": 1 })
db.treenodes.createIndex({ "createdAt": 1 })
db.treenodes.createIndex({ "updatedAt": 1 })

// For hierarchical queries performance
db.treenodes.createIndex({ "path": 1 }) // If you decide to store materialized paths
*/

// Enhanced Program.cs with all services
using MongoDB.Driver;
using TreeApp.Services;
using TreeApp.Profiles;
using Microsoft.Extensions.Caching.Memory;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Memory cache for performance
builder.Services.AddMemoryCache();

// MongoDB Configuration
builder.Services.AddSingleton<IMongoClient>(serviceProvider =>
{
    var connectionString = builder.Configuration.GetConnectionString("MongoDb")
        ?? "mongodb://localhost:27017";
    
    var settings = MongoClientSettings.FromConnectionString(connectionString);
    settings.MaxConnectionPoolSize = 100;
    settings.ConnectTimeout = TimeSpan.FromSeconds(30);
    settings.SocketTimeout = TimeSpan.FromSeconds(30);
    
    return new MongoClient(settings);
});

builder.Services.AddScoped<IMongoDatabase>(serviceProvider =>
{
    var client = serviceProvider.GetRequiredService<IMongoClient>();
    var databaseName = builder.Configuration.GetValue<string>("MongoDbSettings:DatabaseName")
        ?? "TreeApp";
    return client.GetDatabase(databaseName);
});

// Register all services
builder.Services.AddScoped<ITreeRepository, TreeRepository>();
builder.Services.AddScoped<ITreeService, TreeService>();
builder.Services.AddScoped<ITreeQueryService, TreeQueryService>();
builder.Services.AddScoped<TreeCacheService>();

// AutoMapper
builder.Services.AddAutoMapper(typeof(TreeMappingProfile));

// CORS for Angular app
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Add logging
builder.Services.AddLogging(config =>
{
    config.AddConsole();
    config.AddDebug();
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngularApp");
app.UseAuthorization();
app.MapControllers();

app.Run();

// Enhanced appsettings.json
/*
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "TreeApp": "Debug"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "MongoDb": "mongodb://localhost:27017"
  },
  "MongoDbSettings": {
    "DatabaseName": "TreeApp"
  }
}
*/

// EXAMPLE USAGE PATTERNS

// 1. Basic tree operations
/*
// Get hierarchical tree
GET /api/tree?hierarchical=true

// Get flat tree (for ag-Grid)
GET /api/tree?hierarchical=false

// Create a new root node
POST /api/tree
{
  "name": "New Category",
  "description": "Category description",
  "sortOrder": 1,
  "metadata": { "type": "category", "color": "blue" }
}

// Create a child node
POST /api/tree
{
  "name": "Subcategory",
  "parentId": "60d5f484e1b2c8a1d4567890",
  "description": "Subcategory description",
  "sortOrder": 1,
  "metadata": { "type": "subcategory" }
}

// Move a node
POST /api/tree/move
{
  "nodeId": "60d5f484e1b2c8a1d4567891",
  "newParentId": "60d5f484e1b2c8a1d4567892",
  "newSortOrder": 2
}
*/

// 2. Advanced queries
/*
// Get subtree from a specific node
GET /api/treequery/subtree/{nodeId}?maxDepth=3

// Get all leaf nodes
GET /api/treequery/leaves

// Get nodes at specific level
GET /api/treequery/level/2

// Get siblings of a node
GET /api/treequery/{nodeId}/siblings

// Get ancestors of a node
GET /api/treequery/{nodeId}/ancestors

// Get descendants of a node
GET /api/treequery/{nodeId}/descendants

// Get tree statistics
GET /api/treequery/statistics

// Find orphaned nodes
GET /api/treequery/orphaned

// Search by metadata
GET /api/treequery/metadata?key=type&value=category

// Find lowest common ancestor
GET /api/treequery/lca?nodeId1=123&nodeId2=456
*/

// 3. Angular service usage examples
/*
// Component example
export class TreeManagerComponent implements OnInit {
  constructor(private treeService: TreeService) {}

  async ngOnInit() {
    // Load tree data
    this.treeService.getTree(false).subscribe(data => {
      this.rowData = data;
    });
  }

  async loadSubtree(nodeId: string) {
    // Load specific subtree
    const subtree = await this.http.get(`/api/treequery/subtree/${nodeId}`).toPromise();
    return subtree;
  }

  async moveNode(nodeId: string, newParentId: string, newPosition: number) {
    const moveRequest = {
      nodeId,
      newParentId,
      newSortOrder: newPosition
    };
    return this.treeService.moveNode(moveRequest).toPromise();
  }
}
*/

// PERFORMANCE OPTIMIZATION STRATEGIES

// 1. Materialized Path Pattern (Alternative approach)
public class TreeNodeWithPath : TreeNode
{
    public string MaterializedPath { get; set; } = string.Empty; // e.g., "/1/3/7/"
    public int Depth { get; set; }
}

// 2. Batch operations for better performance
public async Task<bool> BatchMoveNodesAsync(List<MoveNodeRequest> requests)
{
    var session = await _collection.Database.Client.StartSessionAsync();
    
    try
    {
        session.StartTransaction();
        
        foreach (var request in requests)
        {
            await MoveNodeAsync(request.NodeId, request.NewParentId, request.NewSortOrder);
        }
        
        await session.CommitTransactionAsync();
        return true;
    }
    catch
    {
        await session.AbortTransactionAsync();
        return false;
    }
    finally
    {
        session.Dispose();
    }
}

// 3. Cached tree service with invalidation
public class CachedTreeService : ITreeService
{
    private readonly ITreeService _baseService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CachedTreeService> _logger;

    public CachedTreeService(ITreeService baseService, IMemoryCache cache, ILogger<CachedTreeService> logger)
    {
        _baseService = baseService;
        _cache = cache;
        _logger = logger;
    }

    public async Task<IEnumerable<TreeNodeDto>> GetTreeAsync(bool includeInactive = false)
    {
        var cacheKey = $"tree_hierarchical_{includeInactive}";
        
        if (_cache.TryGetValue(cacheKey, out IEnumerable<TreeNodeDto>? cached))
        {
            _logger.LogDebug("Returning cached tree data");
            return cached!;
        }

        var tree = await _baseService.GetTreeAsync(includeInactive);
        _cache.Set(cacheKey, tree, TimeSpan.FromMinutes(10));
        
        _logger.LogDebug("Tree data cached");
        return tree;
    }

    public async Task<TreeNodeDto> CreateNodeAsync(CreateTreeNodeRequest request)
    {
        var result = await _baseService.CreateNodeAsync(request);
        InvalidateCache();
        return result;
    }

    public async Task<TreeNodeDto> UpdateNodeAsync(string id, UpdateTreeNodeRequest request)
    {
        var result = await _baseService.UpdateNodeAsync(id, request);
        InvalidateCache();
        return result;
    }

    public async Task DeleteNodeAsync(string id)
    {
        await _baseService.DeleteNodeAsync(id);
        InvalidateCache();
    }

    private void InvalidateCache()
    {
        _cache.Remove("tree_hierarchical_true");
        _cache.Remove("tree_hierarchical_false");
        _cache.Remove("tree_flat_true");
        _cache.Remove("tree_flat_false");
        _logger.LogDebug("Tree cache invalidated");
    }

    // Implement other interface methods with similar caching logic...
    public Task<IEnumerable<TreeNodeDto>> GetFlatTreeAsync(bool includeInactive = false) => _baseService.GetFlatTreeAsync(includeInactive);
    public Task<TreeNodeDto?> GetNodeWithChildrenAsync(string id) => _baseService.GetNodeWithChildrenAsync(id);
    public Task<IEnumerable<TreeNodeDto>> GetNodePathAsync(string nodeId) => _baseService.GetNodePathAsync(nodeId);
    public Task<bool> MoveNodeAsync(MoveNodeRequest request) => _baseService.MoveNodeAsync(request);
    public Task<IEnumerable<TreeNodeDto>> SearchNodesAsync(string searchTerm) => _baseService.SearchNodesAsync(searchTerm);
}

// ANGULAR PERFORMANCE OPTIMIZATIONS

// Virtual scrolling for large trees
/*
// tree-virtual.component.ts
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="50" class="tree-viewport">
      <div *cdkVirtualFor="let node of flatTreeData" 
           [style.padding-left.px]="node.level * 20"
           class="tree-node">
        {{ node.name }}
      </div>
    </cdk-virtual-scroll-viewport>
  `
})
export class TreeVirtualComponent {
  flatTreeData: TreeNode[] = [];
  
  ngOnInit() {
    this.treeService.getTree(false).subscribe(data => {
      this.flatTreeData = this.treeService.flattenTree(data);
    });
  }
}
*/

// TESTING EXAMPLES

// Unit test for tree service
/*
[Test]
public async Task CreateNode_ShouldCreateNodeWithCorrectParent()
{
    // Arrange
    var request = new CreateTreeNodeRequest
    {
        Name = "Test Node",
        ParentId = "parent123",
        Description = "Test Description",
        SortOrder = 1
    };

    // Act
    var result = await _treeService.CreateNodeAsync(request);

    // Assert
    Assert.NotNull(result);
    Assert.AreEqual("Test Node", result.Name);
    Assert.AreEqual("parent123", result.ParentId);
}

[Test]
public async Task MoveNode_ShouldPreventCircularReference()
{
    // Arrange
    var parentNode = await CreateTestNode("Parent", null);
    var childNode = await CreateTestNode("Child", parentNode.Id);
    
    var moveRequest = new MoveNodeRequest
    {
        NodeId = parentNode.Id,
        NewParentId = childNode.Id,
        NewSortOrder = 1
    };

    // Act
    var result = await _treeService.MoveNodeAsync(moveRequest);

    // Assert
    Assert.IsFalse(result); // Should fail due to circular reference
}
*/

// DEPLOYMENT CHECKLIST

/*
1. MongoDB Setup:
   - Ensure indexes are created
   - Set up replica set for production
   - Configure proper authentication
   - Set up backup strategy

2. ASP.NET Core:
   - Configure connection strings
   - Set up HTTPS certificates
   - Configure CORS for production domains
   - Enable request logging

3. Angular:
   - Build for production (ng build --prod)
   - Configure environment files
   - Set up CDN for static assets
   - Enable service worker for caching

4. Performance Monitoring:
   - Set up Application Insights or similar
   - Monitor MongoDB performance
   - Set up alerts for errors
   - Monitor memory usage for caching

5. Security:
   - Validate all inputs
   - Implement authentication/authorization
   - Use HTTPS everywhere
   - Sanitize user inputs
*/
