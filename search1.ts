# TreeView Search Strategy - MongoDB, Angular, ag-grid, C# Fullstack

## 1. MongoDB Data Structure & Indexing

### Document Schema
```javascript
{
  _id: ObjectId,
  name: "Node Name",
  path: "/root/parent/child", // Materialized path
  parentId: ObjectId | null,
  level: 0, // Root level = 0
  children: [ObjectId], // Array of child IDs
  metadata: {
    type: "folder|file",
    tags: ["tag1", "tag2"],
    description: "...",
    createdAt: ISODate,
    modifiedAt: ISODate
  },
  // Nested set model fields for efficient tree operations
  left: 1,
  right: 10
}
```

### MongoDB Indexes
```javascript
// Text search index
db.nodes.createIndex({
  "name": "text",
  "metadata.description": "text",
  "metadata.tags": "text"
})

// Tree traversal indexes
db.nodes.createIndex({ "path": 1 })
db.nodes.createIndex({ "parentId": 1 })
db.nodes.createIndex({ "level": 1 })
db.nodes.createIndex({ "left": 1, "right": 1 })

// Compound indexes for filtered searches
db.nodes.createIndex({ "metadata.type": 1, "level": 1 })
db.nodes.createIndex({ "parentId": 1, "name": 1 })
```

## 2. C# Backend Implementation

### Data Models
```csharp
public class TreeNode
{
    [BsonId]
    public ObjectId Id { get; set; }
    public string Name { get; set; }
    public string Path { get; set; }
    public ObjectId? ParentId { get; set; }
    public int Level { get; set; }
    public List<ObjectId> Children { get; set; } = new();
    public NodeMetadata Metadata { get; set; }
    public int Left { get; set; }
    public int Right { get; set; }
}

public class NodeMetadata
{
    public string Type { get; set; }
    public List<string> Tags { get; set; } = new();
    public string Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
}

public class SearchRequest
{
    public string Query { get; set; }
    public List<string> Types { get; set; } = new();
    public int? MaxLevel { get; set; }
    public ObjectId? ParentId { get; set; }
    public bool IncludeAncestors { get; set; } = true;
    public bool IncludeDescendants { get; set; } = false;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class SearchResult
{
    public List<TreeNode> Nodes { get; set; }
    public List<TreeNode> Ancestors { get; set; }
    public int TotalCount { get; set; }
    public Dictionary<string, object> Aggregations { get; set; }
}
```

### Repository Pattern Implementation
```csharp
public interface ITreeSearchRepository
{
    Task<SearchResult> SearchAsync(SearchRequest request);
    Task<List<TreeNode>> GetAncestorsAsync(ObjectId nodeId);
    Task<List<TreeNode>> GetDescendantsAsync(ObjectId nodeId, int? maxDepth = null);
}

public class TreeSearchRepository : ITreeSearchRepository
{
    private readonly IMongoCollection<TreeNode> _collection;

    public async Task<SearchResult> SearchAsync(SearchRequest request)
    {
        var builder = Builders<TreeNode>.Filter;
        var filters = new List<FilterDefinition<TreeNode>>();

        // Text search
        if (!string.IsNullOrEmpty(request.Query))
        {
            filters.Add(builder.Text(request.Query));
        }

        // Type filter
        if (request.Types.Any())
        {
            filters.Add(builder.In(x => x.Metadata.Type, request.Types));
        }

        // Level filter
        if (request.MaxLevel.HasValue)
        {
            filters.Add(builder.Lte(x => x.Level, request.MaxLevel.Value));
        }

        // Parent scope filter
        if (request.ParentId.HasValue)
        {
            var parent = await _collection.Find(x => x.Id == request.ParentId.Value).FirstOrDefaultAsync();
            if (parent != null)
            {
                // Use nested set model for efficient subtree search
                filters.Add(builder.And(
                    builder.Gt(x => x.Left, parent.Left),
                    builder.Lt(x => x.Right, parent.Right)
                ));
            }
        }

        var finalFilter = filters.Any() ? builder.And(filters) : builder.Empty;

        // Main search with pagination
        var searchTask = _collection
            .Find(finalFilter)
            .Skip((request.Page - 1) * request.PageSize)
            .Limit(request.PageSize)
            .SortByDescending(x => x.Metadata.ModifiedAt)
            .ToListAsync();

        var countTask = _collection.CountDocumentsAsync(finalFilter);

        await Task.WhenAll(searchTask, countTask);

        var nodes = searchTask.Result;
        var ancestors = new List<TreeNode>();

        // Get ancestors for context if requested
        if (request.IncludeAncestors && nodes.Any())
        {
            var ancestorIds = nodes
                .SelectMany(n => GetAncestorIdsFromPath(n.Path))
                .Distinct()
                .ToList();

            if (ancestorIds.Any())
            {
                ancestors = await _collection
                    .Find(builder.In(x => x.Id, ancestorIds))
                    .ToListAsync();
            }
        }

        return new SearchResult
        {
            Nodes = nodes,
            Ancestors = ancestors,
            TotalCount = (int)countTask.Result,
            Aggregations = await GetSearchAggregations(finalFilter)
        };
    }

    private async Task<Dictionary<string, object>> GetSearchAggregations(FilterDefinition<TreeNode> filter)
    {
        var pipeline = new[]
        {
            PipelineStageDefinitionBuilder.Match(filter),
            PipelineStageDefinitionBuilder.Group<TreeNode, object>(
                new BsonDocument
                {
                    { "_id", "$metadata.type" },
                    { "count", new BsonDocument("$sum", 1) }
                })
        };

        var typeAggregation = await _collection.Aggregate<BsonDocument>(pipeline).ToListAsync();

        return new Dictionary<string, object>
        {
            ["typeBreakdown"] = typeAggregation.ToDictionary(
                doc => doc["_id"].AsString,
                doc => doc["count"].AsInt32
            )
        };
    }
}
```

### API Controller
```csharp
[ApiController]
[Route("api/[controller]")]
public class TreeSearchController : ControllerBase
{
    private readonly ITreeSearchRepository _repository;

    [HttpPost("search")]
    public async Task<ActionResult<SearchResult>> Search([FromBody] SearchRequest request)
    {
        try
        {
            var result = await _repository.SearchAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("suggestions")]
    public async Task<ActionResult<List<string>>> GetSearchSuggestions([FromQuery] string query)
    {
        // Implement autocomplete/suggestions logic
        // Could use MongoDB's autocomplete or a separate search index
        return Ok(new List<string>());
    }
}
```

## 3. Angular Frontend Implementation

### Search Service
```typescript
export interface SearchRequest {
  query?: string;
  types?: string[];
  maxLevel?: number;
  parentId?: string;
  includeAncestors?: boolean;
  includeDescendants?: boolean;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  nodes: TreeNode[];
  ancestors: TreeNode[];
  totalCount: number;
  aggregations: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class TreeSearchService {
  private readonly apiUrl = 'api/treesearch';

  constructor(private http: HttpClient) {}

  search(request: SearchRequest): Observable<SearchResult> {
    return this.http.post<SearchResult>(`${this.apiUrl}/search`, request);
  }

  getSuggestions(query: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/suggestions`, {
      params: { query }
    });
  }
}
```

### Search Component
```typescript
@Component({
  selector: 'app-tree-search',
  template: `
    <div class="search-container">
      <!-- Search Input with Autocomplete -->
      <mat-form-field class="search-field">
        <mat-label>Search nodes...</mat-label>
        <input matInput
               [formControl]="searchControl"
               [matAutocomplete]="auto">
        <mat-autocomplete #auto="matAutocomplete">
          <mat-option *ngFor="let suggestion of suggestions$ | async" [value]="suggestion">
            {{suggestion}}
          </mat-option>
        </mat-autocomplete>
      </mat-form-field>

      <!-- Advanced Filters -->
      <div class="filters" *ngIf="showAdvanced">
        <mat-select multiple placeholder="Node Types" [(ngModel)]="selectedTypes">
          <mat-option value="folder">Folders</mat-option>
          <mat-option value="file">Files</mat-option>
        </mat-select>
        
        <mat-slider min="0" max="10" [(ngModel)]="maxLevel">
          <input matSliderThumb [(ngModel)]="maxLevel">
        </mat-slider>
      </div>

      <!-- Results Grid -->
      <ag-grid-angular
        class="ag-theme-material search-results"
        [columnDefs]="columnDefs"
        [rowData]="searchResults"
        [gridOptions]="gridOptions"
        (gridReady)="onGridReady($event)">
      </ag-grid-angular>

      <!-- Result Stats -->
      <div class="search-stats" *ngIf="totalResults > 0">
        <span>{{totalResults}} results found</span>
        <div class="type-breakdown">
          <span *ngFor="let type of getTypeBreakdown()">
            {{type.name}}: {{type.count}}
          </span>
        </div>
      </div>
    </div>
  `
})
export class TreeSearchComponent implements OnInit {
  searchControl = new FormControl('');
  selectedTypes: string[] = [];
  maxLevel = 10;
  showAdvanced = false;

  searchResults: TreeNode[] = [];
  totalResults = 0;
  aggregations: any = {};

  suggestions$ = this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(query => query ? this.searchService.getSuggestions(query) : of([]))
  );

  columnDefs: ColDef[] = [
    {
      headerName: 'Name',
      field: 'name',
      cellRenderer: 'treeNodeRenderer',
      flex: 2
    },
    {
      headerName: 'Path',
      field: 'path',
      flex: 3
    },
    {
      headerName: 'Type',
      field: 'metadata.type',
      width: 100
    },
    {
      headerName: 'Modified',
      field: 'metadata.modifiedAt',
      cellRenderer: 'dateRenderer',
      width: 120
    }
  ];

  gridOptions: GridOptions = {
    pagination: true,
    paginationPageSize: 50,
    rowSelection: 'multiple',
    components: {
      treeNodeRenderer: TreeNodeCellRenderer,
      dateRenderer: DateCellRenderer
    }
  };

  constructor(
    private searchService: TreeSearchService,
    private router: Router
  ) {}

  ngOnInit() {
    // Debounced search on input changes
    this.searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performSearch();
    });
  }

  performSearch() {
    const request: SearchRequest = {
      query: this.searchControl.value || undefined,
      types: this.selectedTypes.length > 0 ? this.selectedTypes : undefined,
      maxLevel: this.maxLevel < 10 ? this.maxLevel : undefined,
      includeAncestors: true,
      page: 1,
      pageSize: 50
    };

    this.searchService.search(request).subscribe(result => {
      this.searchResults = result.nodes;
      this.totalResults = result.totalCount;
      this.aggregations = result.aggregations;
    });
  }

  navigateToNode(node: TreeNode) {
    this.router.navigate(['/tree'], { 
      queryParams: { selectedNode: node.id } 
    });
  }
}
```

## 4. ag-grid Custom Components

### Tree Node Cell Renderer
```typescript
@Component({
  selector: 'tree-node-cell',
  template: `
    <div class="tree-node-cell" [style.margin-left.px]="indentLevel * 20">
      <mat-icon class="node-icon">{{getNodeIcon()}}</mat-icon>
      <span class="node-name" (click)="navigateToNode()">{{params.value}}</span>
      <span class="breadcrumb" *ngIf="showPath">{{getShortPath()}}</span>
    </div>
  `
})
export class TreeNodeCellRenderer implements ICellRendererAngularComp {
  params: any;

  agInit(params: any): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  get indentLevel(): number {
    return this.params.data.level || 0;
  }

  getNodeIcon(): string {
    return this.params.data.metadata?.type === 'folder' ? 'folder' : 'description';
  }

  navigateToNode(): void {
    // Emit event to parent component
    this.params.context.componentParent.navigateToNode(this.params.data);
  }
}
```

## 5. Performance Optimization Strategies

### Backend Optimizations
- **Aggregation Pipelines**: Use MongoDB aggregation for complex searches
- **Caching**: Implement Redis caching for frequent searches
- **Connection Pooling**: Optimize MongoDB connection management
- **Parallel Processing**: Use Task.WhenAll for concurrent operations

### Frontend Optimizations
- **Virtual Scrolling**: Enable ag-grid virtual scrolling for large result sets
- **Debouncing**: Implement search debouncing (already included)
- **Result Caching**: Cache search results in Angular service
- **Lazy Loading**: Load tree ancestors/descendants on demand

### Search Performance Tips
```csharp
// Use projection to limit returned fields
.Project(Builders<TreeNode>.Projection
    .Include(x => x.Name)
    .Include(x => x.Path)
    .Include(x => x.Metadata.Type)
    .Exclude(x => x.Children))

// Use explain() to analyze query performance
db.nodes.find(query).explain("executionStats")
```

## 6. Advanced Search Features

### Faceted Search
- Type-based filtering
- Level-based filtering  
- Date range filtering
- Tag-based filtering

### Search Suggestions
- Auto-complete based on existing node names
- Recent searches
- Popular searches

### Search Analytics
- Track search patterns
- Performance monitoring
- User search behavior analysis

This architecture provides a scalable, performant search solution for tree-structured data with rich filtering capabilities and an intuitive user interface.
