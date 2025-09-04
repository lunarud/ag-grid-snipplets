
difference client vs server SSRM ag-grid Row Column Grouping angular

In AG-Grid's Server-Side Row Model (SSRM), row and column grouping can be handled either on the client-side or server-side, each with distinct implications for performance and implementation.

Client-Side Grouping in SSRM
How it works:

The server returns flat data to AG-Grid
AG-Grid performs the grouping logic in the browser
All group operations (expand/collapse, aggregations) happen client-side
Pros:

Simpler server implementation - just return raw data
Rich interactive features work out-of-the-box
Good for smaller datasets (thousands of rows)
Cons:

Performance degrades with large datasets
All data must be loaded to perform grouping
Memory consumption increases significantly
Angular Implementation:

typescript
gridOptions: GridOptions = {
  rowModelType: 'serverSide',
  rowGroupPanelShow: 'always',
  groupDefaultExpanded: 1,
  
  columnDefs: [
    { field: 'country', rowGroup: true, hide: true },
    { field: 'sport', rowGroup: true, hide: true },
    { field: 'athlete' },
    { field: 'gold', aggFunc: 'sum' }
  ],

  onGridReady: (params) => {
    const datasource: IServerSideDatasource = {
      getRows: (params: IServerSideGetRowsParams) => {
        // Server returns flat data, AG-Grid handles grouping
        this.httpClient.get('/api/data', { params: this.buildParams(params) })
          .subscribe(data => {
            params.success({
              rowData: data.rows,
              rowCount: data.totalCount
            });
          });
      }
    };
    params.api.setServerSideDatasource(datasource);
  }
};
Server-Side Grouping in SSRM
How it works:

The server receives grouping instructions from AG-Grid
Server performs grouping, aggregation, and pagination
AG-Grid receives pre-grouped data structure
Pros:

Handles massive datasets efficiently
Lower memory footprint on client
Faster initial load times
Leverages database optimization (indexes, etc.)
Cons:

Complex server-side implementation required
Must handle group expand/collapse requests
Server must maintain grouping state
Angular Implementation:

typescript
gridOptions: GridOptions = {
  rowModelType: 'serverSide',
  serverSideStoreType: 'partial',
  rowGroupPanelShow: 'always',
  
  columnDefs: [
    { field: 'country', rowGroup: true, hide: true },
    { field: 'sport', rowGroup: true, hide: true },
    { field: 'athlete' },
    { field: 'gold', aggFunc: 'sum' }
  ],

  onGridReady: (params) => {
    const datasource: IServerSideDatasource = {
      getRows: (params: IServerSideGetRowsParams) => {
        // Build request with grouping information
        const request = {
          startRow: params.request.startRow,
          endRow: params.request.endRow,
          rowGroupCols: params.request.rowGroupCols,
          groupKeys: params.request.groupKeys,
          valueCols: params.request.valueCols
        };

        this.httpClient.post('/api/grouped-data', request)
          .subscribe(data => {
            params.success({
              rowData: data.rows, // Pre-grouped data
              rowCount: data.rowCount
            });
          });
      }
    };
    params.api.setServerSideDatasource(datasource);
  }
};
Server-Side Implementation Considerations
For server-side grouping, your API needs to handle:

csharp
// C# Example - handling the grouping request
public class GroupedDataRequest
{
    public int StartRow { get; set; }
    public int EndRow { get; set; }
    public List<ColumnVO> RowGroupCols { get; set; }
    public List<string> GroupKeys { get; set; }
    public List<ColumnVO> ValueCols { get; set; }
}

// MongoDB aggregation pipeline example
public async Task<GroupedDataResponse> GetGroupedData(GroupedDataRequest request)
{
    var pipeline = new List<BsonDocument>();
    
    // Build grouping stages based on request.RowGroupCols
    foreach (var groupCol in request.RowGroupCols)
    {
        pipeline.Add(new BsonDocument("$group", new BsonDocument
        {
            { "_id", $"${groupCol.Field}" },
            { "count", new BsonDocument("$sum", 1) }
        }));
    }
    
    // Execute aggregation
    var results = await collection.Aggregate<BsonDocument>(pipeline).ToListAsync();
    
    return new GroupedDataResponse
    {
        Rows = TransformToGridFormat(results),
        RowCount = results.Count
    };
}
Recommendation
For your architecture:

Use client-side grouping for datasets < 10,000 rows or when you need rapid prototyping
Use server-side grouping for large datasets, especially when leveraging MongoDB's powerful aggregation framework for optimal performance
The choice often depends on your data volume, server capabilities, and the complexity you're willing to handle on the backend.

define TransformToGridFormat

Here's a comprehensive implementation of TransformToGridFormat for converting MongoDB aggregation results into AG-Grid's expected format for server-side row grouping:

csharp
public class GroupedDataResponse
{
    public List<object> Rows { get; set; }
    public int RowCount { get; set; }
}

public class GridRowData
{
    public string Group { get; set; }
    public Dictionary<string, object> Data { get; set; }
    public bool IsGroup { get; set; }
    public int ChildCount { get; set; }
    public string[] GroupKeys { get; set; }
}

private List<object> TransformToGridFormat(
    List<BsonDocument> mongoResults, 
    GroupedDataRequest request)
{
    var gridRows = new List<object>();
    
    // Determine the current grouping level based on GroupKeys
    var currentLevel = request.GroupKeys?.Count ?? 0;
    var totalLevels = request.RowGroupCols?.Count ?? 0;
    var isLeafLevel = currentLevel >= totalLevels;
    
    foreach (var doc in mongoResults)
    {
        if (isLeafLevel)
        {
            // Leaf level - return actual data rows
            gridRows.Add(TransformLeafRow(doc));
        }
        else
        {
            // Group level - return group headers
            gridRows.Add(TransformGroupRow(doc, request, currentLevel));
        }
    }
    
    return gridRows;
}

private object TransformLeafRow(BsonDocument doc)
{
    var row = new Dictionary<string, object>();
    
    foreach (var element in doc.Elements)
    {
        var key = element.Name;
        var value = element.Value;
        
        // Convert BSON types to .NET types
        row[key] = ConvertBsonValue(value);
    }
    
    return row;
}

private object TransformGroupRow(BsonDocument doc, GroupedDataRequest request, int level)
{
    var groupCol = request.RowGroupCols[level];
    var groupValue = doc["_id"].ToString();
    var childCount = doc.Contains("count") ? doc["count"].AsInt32 : 0;
    
    // Build the group keys array (parent groups + current group)
    var groupKeys = new List<string>();
    if (request.GroupKeys != null)
    {
        groupKeys.AddRange(request.GroupKeys);
    }
    groupKeys.Add(groupValue);
    
    var groupRow = new Dictionary<string, object>
    {
        // The field being grouped by should contain the group value
        [groupCol.Field] = groupValue,
        
        // AG-Grid specific properties for group rows
        ["ag-Grid-AutoColumn"] = groupValue,
        
        // Add aggregated values if they exist
    };
    
    // Add aggregated values from MongoDB results
    AddAggregatedValues(groupRow, doc, request.ValueCols);
    
    // Add AG-Grid group metadata
    groupRow["__agGridGroupData"] = new
    {
        isGroup = true,
        key = groupValue,
        field = groupCol.Field,
        childCount = childCount,
        level = level,
        expanded = false // Initially collapsed
    };
    
    return groupRow;
}

private void AddAggregatedValues(
    Dictionary<string, object> groupRow, 
    BsonDocument doc, 
    List<ColumnVO> valueCols)
{
    if (valueCols == null) return;
    
    foreach (var valueCol in valueCols)
    {
        var aggFieldName = GetAggregatedFieldName(valueCol);
        
        if (doc.Contains(aggFieldName))
        {
            groupRow[valueCol.Field] = ConvertBsonValue(doc[aggFieldName]);
        }
    }
}

private string GetAggregatedFieldName(ColumnVO valueCol)
{
    // Map AG-Grid aggregation function to MongoDB field name
    return valueCol.AggFunc switch
    {
        "sum" => $"{valueCol.Field}_sum",
        "avg" => $"{valueCol.Field}_avg", 
        "min" => $"{valueCol.Field}_min",
        "max" => $"{valueCol.Field}_max",
        "count" => $"{valueCol.Field}_count",
        _ => valueCol.Field
    };
}

private object ConvertBsonValue(BsonValue bsonValue)
{
    return bsonValue.BsonType switch
    {
        BsonType.String => bsonValue.AsString,
        BsonType.Int32 => bsonValue.AsInt32,
        BsonType.Int64 => bsonValue.AsInt64,
        BsonType.Double => bsonValue.AsDouble,
        BsonType.Decimal128 => bsonValue.AsDecimal,
        BsonType.Boolean => bsonValue.AsBoolean,
        BsonType.DateTime => bsonValue.AsDateTime,
        BsonType.ObjectId => bsonValue.AsObjectId.ToString(),
        BsonType.Null => null,
        _ => bsonValue.ToString()
    };
}
Enhanced MongoDB Aggregation Pipeline
Here's an updated aggregation method that properly handles multi-level grouping:

csharp
public async Task<GroupedDataResponse> GetGroupedData(GroupedDataRequest request)
{
    var pipeline = new List<BsonDocument>();
    
    // Apply filters first (if any)
    if (request.FilterModel != null)
    {
        pipeline.Add(BuildFilterStage(request.FilterModel));
    }
    
    // Determine grouping level
    var currentLevel = request.GroupKeys?.Count ?? 0;
    var totalLevels = request.RowGroupCols?.Count ?? 0;
    
    if (currentLevel < totalLevels)
    {
        // We're at a group level - need to create group aggregation
        pipeline.AddRange(BuildGroupingPipeline(request, currentLevel));
    }
    else
    {
        // We're at leaf level - return filtered data
        pipeline.AddRange(BuildLeafPipeline(request));
    }
    
    // Execute pipeline
    var results = await _collection.Aggregate<BsonDocument>(pipeline).ToListAsync();
    
    return new GroupedDataResponse
    {
        Rows = TransformToGridFormat(results, request),
        RowCount = results.Count
    };
}

private List<BsonDocument> BuildGroupingPipeline(GroupedDataRequest request, int level)
{
    var pipeline = new List<BsonDocument>();
    var groupCol = request.RowGroupCols[level];
    
    // Match stage for parent group keys
    if (request.GroupKeys != null && request.GroupKeys.Count > 0)
    {
        var matchConditions = new BsonDocument();
        for (int i = 0; i < request.GroupKeys.Count; i++)
        {
            var parentCol = request.RowGroupCols[i];
            matchConditions[parentCol.Field] = request.GroupKeys[i];
        }
        pipeline.Add(new BsonDocument("$match", matchConditions));
    }
    
    // Group stage
    var groupStage = new BsonDocument("$group", new BsonDocument
    {
        { "_id", $"${groupCol.Field}" },
        { "count", new BsonDocument("$sum", 1) }
    });
    
    // Add aggregations for value columns
    if (request.ValueCols != null)
    {
        foreach (var valueCol in request.ValueCols)
        {
            var aggFieldName = GetAggregatedFieldName(valueCol);
            var aggExpression = valueCol.AggFunc switch
            {
                "sum" => new BsonDocument("$sum", $"${valueCol.Field}"),
                "avg" => new BsonDocument("$avg", $"${valueCol.Field}"),
                "min" => new BsonDocument("$min", $"${valueCol.Field}"),
                "max" => new BsonDocument("$max", $"${valueCol.Field}"),
                "count" => new BsonDocument("$sum", 1),
                _ => new BsonDocument("$first", $"${valueCol.Field}")
            };
            
            groupStage["$group"][aggFieldName] = aggExpression;
        }
    }
    
    pipeline.Add(groupStage);
    
    // Sort stage
    pipeline.Add(new BsonDocument("$sort", new BsonDocument("_id", 1)));
    
    // Pagination
    if (request.StartRow > 0)
    {
        pipeline.Add(new BsonDocument("$skip", request.StartRow));
    }
    
    if (request.EndRow > request.StartRow)
    {
        pipeline.Add(new BsonDocument("$limit", request.EndRow - request.StartRow));
    }
    
    return pipeline;
}

private List<BsonDocument> BuildLeafPipeline(GroupedDataRequest request)
{
    var pipeline = new List<BsonDocument>();
    
    // Match exact group path for leaf nodes
    if (request.GroupKeys != null && request.GroupKeys.Count > 0)
    {
        var matchConditions = new BsonDocument();
        for (int i = 0; i < request.GroupKeys.Count; i++)
        {
            var groupCol = request.RowGroupCols[i];
            matchConditions[groupCol.Field] = request.GroupKeys[i];
        }
        pipeline.Add(new BsonDocument("$match", matchConditions));
    }
    
    // Pagination for leaf data
    if (request.StartRow > 0)
    {
        pipeline.Add(new BsonDocument("$skip", request.StartRow));
    }
    
    if (request.EndRow > request.StartRow)
    {
        pipeline.Add(new BsonDocument("$limit", request.EndRow - request.StartRow));
    }
    
    return pipeline;
}
This implementation handles:

Multi-level grouping with proper parent-child relationships
Aggregated values (sum, avg, min, max, count) at group levels
Pagination at both group and leaf levels
Type conversion from BSON to .NET types
AG-Grid specific metadata for proper rendering
The key is understanding that AG-Grid expects different data structures for group rows vs. leaf rows, and the grouping level is determined by the GroupKeys array length.

show code for only SSRM ag-grid C# mongodb Angular ag-grid Row Grouping Multiple Group Columns

Here's a complete implementation for AG-Grid SSRM with multiple group columns using C#, MongoDB, and Angular:

Angular Component
typescript
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { 
  GridOptions, 
  IServerSideDatasource, 
  IServerSideGetRowsParams,
  ColDef
} from 'ag-grid-community';

@Component({
  selector: 'app-multi-group-grid',
  template: `
    <ag-grid-angular
      style="width: 100%; height: 600px;"
      class="ag-theme-alpine"
      [gridOptions]="gridOptions"
      [columnDefs]="columnDefs"
      (gridReady)="onGridReady($event)">
    </ag-grid-angular>
  `
})
export class MultiGroupGridComponent implements OnInit {
  
  public gridOptions: GridOptions = {};
  public columnDefs: ColDef[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.columnDefs = [
      // Group columns - these will create the hierarchy
      { 
        field: 'country', 
        rowGroup: true, 
        hide: true,
        headerName: 'Country'
      },
      { 
        field: 'year', 
        rowGroup: true, 
        hide: true,
        headerName: 'Year'
      },
      { 
        field: 'sport', 
        rowGroup: true, 
        hide: true,
        headerName: 'Sport'
      },
      
      // Display columns
      { field: 'athlete', headerName: 'Athlete' },
      { field: 'age', headerName: 'Age' },
      { 
        field: 'gold', 
        headerName: 'Gold',
        aggFunc: 'sum',
        enableValue: true
      },
      { 
        field: 'silver', 
        headerName: 'Silver',
        aggFunc: 'sum',
        enableValue: true
      },
      { 
        field: 'bronze', 
        headerName: 'Bronze',
        aggFunc: 'sum',
        enableValue: true
      }
    ];

    this.gridOptions = {
      rowModelType: 'serverSide',
      serverSideStoreType: 'partial',
      
      // Row grouping configuration
      rowGroupPanelShow: 'always',
      groupDefaultExpanded: 0, // Start collapsed
      groupSelectsChildren: true,
      groupSelectsFiltered: true,
      
      // Enable aggregation
      suppressAggFuncInHeader: true,
      groupAggFiltering: true,
      
      // Auto group column configuration
      autoGroupColumnDef: {
        headerName: 'Group',
        field: 'ag-Grid-AutoColumn',
        cellRenderer: 'agGroupCellRenderer',
        cellRendererParams: {
          suppressCount: false,
          checkbox: false
        },
        minWidth: 250
      },

      // Performance settings
      cacheBlockSize: 100,
      maxBlocksInCache: 10,
      purgeClosedRowNodes: true,
      maxConcurrentDatasourceRequests: 2,

      // Debug
      debug: false
    };
  }

  onGridReady(params: any) {
    const datasource: IServerSideDatasource = {
      getRows: (params: IServerSideGetRowsParams) => {
        console.log('Server request:', params.request);
        
        const request = {
          startRow: params.request.startRow,
          endRow: params.request.endRow,
          rowGroupCols: params.request.rowGroupCols || [],
          valueCols: params.request.valueCols || [],
          groupKeys: params.request.groupKeys || [],
          sortModel: params.request.sortModel || [],
          filterModel: params.request.filterModel || {}
        };

        this.http.post<any>('/api/olympics/grouped-data', request)
          .subscribe({
            next: (response) => {
              console.log('Server response:', response);
              params.success({
                rowData: response.rows,
                rowCount: response.rowCount
              });
            },
            error: (error) => {
              console.error('Error loading data:', error);
              params.fail();
            }
          });
      }
    };

    params.api.setServerSideDatasource(datasource);
  }
}
C# Backend Models
csharp
// Request models
public class ServerSideRequest
{
    public int StartRow { get; set; }
    public int EndRow { get; set; }
    public List<ColumnVO> RowGroupCols { get; set; } = new();
    public List<ColumnVO> ValueCols { get; set; } = new();
    public List<string> GroupKeys { get; set; } = new();
    public List<SortModel> SortModel { get; set; } = new();
    public Dictionary<string, object> FilterModel { get; set; } = new();
}

public class ColumnVO
{
    public string Id { get; set; }
    public string DisplayName { get; set; }
    public string Field { get; set; }
    public string AggFunc { get; set; }
}

public class SortModel
{
    public string ColId { get; set; }
    public string Sort { get; set; } // 'asc' or 'desc'
}

// Response models
public class ServerSideResponse
{
    public List<object> Rows { get; set; } = new();
    public int RowCount { get; set; }
}

// MongoDB document model
public class OlympicResult
{
    public ObjectId Id { get; set; }
    public string Athlete { get; set; }
    public int Age { get; set; }
    public string Country { get; set; }
    public int Year { get; set; }
    public string Date { get; set; }
    public string Sport { get; set; }
    public int Gold { get; set; }
    public int Silver { get; set; }
    public int Bronze { get; set; }
    public int Total { get; set; }
}
C# Controller
csharp
[ApiController]
[Route("api/[controller]")]
public class OlympicsController : ControllerBase
{
    private readonly OlympicsService _olympicsService;

    public OlympicsController(OlympicsService olympicsService)
    {
        _olympicsService = olympicsService;
    }

    [HttpPost("grouped-data")]
    public async Task<ActionResult<ServerSideResponse>> GetGroupedData(
        [FromBody] ServerSideRequest request)
    {
        try
        {
            var response = await _olympicsService.GetGroupedData(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
C# Service with MongoDB Aggregation
csharp
public class OlympicsService
{
    private readonly IMongoCollection<OlympicResult> _collection;

    public OlympicsService(IMongoDatabase database)
    {
        _collection = database.GetCollection<OlympicResult>("olympics");
    }

    public async Task<ServerSideResponse> GetGroupedData(ServerSideRequest request)
    {
        var currentLevel = request.GroupKeys.Count;
        var totalLevels = request.RowGroupCols.Count;
        var isLeafLevel = currentLevel >= totalLevels;

        List<BsonDocument> results;
        int totalCount;

        if (isLeafLevel)
        {
            // Get leaf data (actual records)
            results = await GetLeafData(request);
            totalCount = await GetLeafDataCount(request);
        }
        else
        {
            // Get group data
            results = await GetGroupData(request, currentLevel);
            totalCount = await GetGroupDataCount(request, currentLevel);
        }

        return new ServerSideResponse
        {
            Rows = TransformToGridFormat(results, request, isLeafLevel),
            RowCount = totalCount
        };
    }

    private async Task<List<BsonDocument>> GetGroupData(ServerSideRequest request, int level)
    {
        var pipeline = new List<BsonDocument>();

        // Add match stage for parent groups
        if (request.GroupKeys.Count > 0)
        {
            var matchDoc = BuildParentGroupMatch(request);
            pipeline.Add(new BsonDocument("$match", matchDoc));
        }

        // Add filter stage
        if (request.FilterModel.Count > 0)
        {
            var filterDoc = BuildFilterStage(request.FilterModel);
            pipeline.Add(new BsonDocument("$match", filterDoc));
        }

        // Group by current level field
        var groupCol = request.RowGroupCols[level];
        var groupDoc = new BsonDocument("$group", new BsonDocument
        {
            { "_id", $"${groupCol.Field}" },
            { "childCount", new BsonDocument("$sum", 1) }
        });

        // Add aggregations for value columns
        foreach (var valueCol in request.ValueCols)
        {
            var aggExpression = GetAggregationExpression(valueCol);
            groupDoc["$group"][$"{valueCol.Field}_{valueCol.AggFunc}"] = aggExpression;
        }

        pipeline.Add(groupDoc);

        // Add sort
        var sortDoc = new BsonDocument("$sort", new BsonDocument("_id", 1));
        pipeline.Add(sortDoc);

        // Add pagination
        if (request.StartRow > 0)
        {
            pipeline.Add(new BsonDocument("$skip", request.StartRow));
        }

        var pageSize = request.EndRow - request.StartRow;
        if (pageSize > 0)
        {
            pipeline.Add(new BsonDocument("$limit", pageSize));
        }

        return await _collection.Aggregate<BsonDocument>(pipeline).ToListAsync();
    }

    private async Task<List<BsonDocument>> GetLeafData(ServerSideRequest request)
    {
        var pipeline = new List<BsonDocument>();

        // Match exact group path
        if (request.GroupKeys.Count > 0)
        {
            var matchDoc = BuildExactGroupMatch(request);
            pipeline.Add(new BsonDocument("$match", matchDoc));
        }

        // Add filter stage
        if (request.FilterModel.Count > 0)
        {
            var filterDoc = BuildFilterStage(request.FilterModel);
            pipeline.Add(new BsonDocument("$match", filterDoc));
        }

        // Add sort
        if (request.SortModel.Count > 0)
        {
            var sortDoc = BuildSortStage(request.SortModel);
            pipeline.Add(new BsonDocument("$sort", sortDoc));
        }

        // Add pagination
        if (request.StartRow > 0)
        {
            pipeline.Add(new BsonDocument("$skip", request.StartRow));
        }

        var pageSize = request.EndRow - request.StartRow;
        if (pageSize > 0)
        {
            pipeline.Add(new BsonDocument("$limit", pageSize));
        }

        return await _collection.Aggregate<BsonDocument>(pipeline).ToListAsync();
    }

    private BsonDocument BuildParentGroupMatch(ServerSideRequest request)
    {
        var matchDoc = new BsonDocument();
        
        for (int i = 0; i < request.GroupKeys.Count; i++)
        {
            var groupCol = request.RowGroupCols[i];
            matchDoc[groupCol.Field] = request.GroupKeys[i];
        }
        
        return matchDoc;
    }

    private BsonDocument BuildExactGroupMatch(ServerSideRequest request)
    {
        var matchDoc = new BsonDocument();
        
        for (int i = 0; i < request.GroupKeys.Count; i++)
        {
            var groupCol = request.RowGroupCols[i];
            matchDoc[groupCol.Field] = request.GroupKeys[i];
        }
        
        return matchDoc;
    }

    private BsonDocument GetAggregationExpression(ColumnVO valueCol)
    {
        return valueCol.AggFunc?.ToLower() switch
        {
            "sum" => new BsonDocument("$sum", $"${valueCol.Field}"),
            "avg" => new BsonDocument("$avg", $"${valueCol.Field}"),
            "min" => new BsonDocument("$min", $"${valueCol.Field}"),
            "max" => new BsonDocument("$max", $"${valueCol.Field}"),
            "count" => new BsonDocument("$sum", 1),
            _ => new BsonDocument("$sum", $"${valueCol.Field}")
        };
    }

    private async Task<int> GetGroupDataCount(ServerSideRequest request, int level)
    {
        var pipeline = new List<BsonDocument>();

        if (request.GroupKeys.Count > 0)
        {
            var matchDoc = BuildParentGroupMatch(request);
            pipeline.Add(new BsonDocument("$match", matchDoc));
        }

        if (request.FilterModel.Count > 0)
        {
            var filterDoc = BuildFilterStage(request.FilterModel);
            pipeline.Add(new BsonDocument("$match", filterDoc));
        }

        var groupCol = request.RowGroupCols[level];
        pipeline.Add(new BsonDocument("$group", new BsonDocument
        {
            { "_id", $"${groupCol.Field}" }
        }));

        pipeline.Add(new BsonDocument("$count", "total"));

        var result = await _collection.Aggregate<BsonDocument>(pipeline).FirstOrDefaultAsync();
        return result?["total"].AsInt32 ?? 0;
    }

    private async Task<int> GetLeafDataCount(ServerSideRequest request)
    {
        var pipeline = new List<BsonDocument>();

        if (request.GroupKeys.Count > 0)
        {
            var matchDoc = BuildExactGroupMatch(request);
            pipeline.Add(new BsonDocument("$match", matchDoc));
        }

        if (request.FilterModel.Count > 0)
        {
            var filterDoc = BuildFilterStage(request.FilterModel);
            pipeline.Add(new BsonDocument("$match", filterDoc));
        }

        pipeline.Add(new BsonDocument("$count", "total"));

        var result = await _collection.Aggregate<BsonDocument>(pipeline).FirstOrDefaultAsync();
        return result?["total"].AsInt32 ?? 0;
    }

    private List<object> TransformToGridFormat(
        List<BsonDocument> results, 
        ServerSideRequest request, 
        bool isLeafLevel)
    {
        var gridRows = new List<object>();

        foreach (var doc in results)
        {
            if (isLeafLevel)
            {
                // Transform leaf row
                gridRows.Add(TransformLeafRow(doc));
            }
            else
            {
                // Transform group row
                var currentLevel = request.GroupKeys.Count;
                gridRows.Add(TransformGroupRow(doc, request, currentLevel));
            }
        }

        return gridRows;
    }

    private object TransformLeafRow(BsonDocument doc)
    {
        var row = new Dictionary<string, object>();

        foreach (var element in doc.Elements)
        {
            if (element.Name == "_id") continue;
            
            var value = ConvertBsonValue(element.Value);
            row[element.Name] = value;
        }

        return row;
    }

    private object TransformGroupRow(BsonDocument doc, ServerSideRequest request, int level)
    {
        var groupCol = request.RowGroupCols[level];
        var groupValue = doc["_id"].ToString();
        var childCount = doc.Contains("childCount") ? doc["childCount"].AsInt32 : 0;

        var row = new Dictionary<string, object>
        {
            [groupCol.Field] = groupValue,
            ["ag-Grid-AutoColumn"] = groupValue
        };

        // Add aggregated values
        foreach (var valueCol in request.ValueCols)
        {
            var aggFieldName = $"{valueCol.Field}_{valueCol.AggFunc}";
            if (doc.Contains(aggFieldName))
            {
                row[valueCol.Field] = ConvertBsonValue(doc[aggFieldName]);
            }
        }

        // Add AG-Grid metadata for group rendering
        row["__agGridGroupData"] = new
        {
            isGroup = true,
            key = groupValue,
            field = groupCol.Field,
            childCount = childCount,
            level = level,
            expanded = false
        };

        return row;
    }

    private object ConvertBsonValue(BsonValue bsonValue)
    {
        return bsonValue.BsonType switch
        {
            BsonType.String => bsonValue.AsString,
            BsonType.Int32 => bsonValue.AsInt32,
            BsonType.Int64 => bsonValue.AsInt64,
            BsonType.Double => bsonValue.AsDouble,
            BsonType.Decimal128 => bsonValue.AsDecimal,
            BsonType.Boolean => bsonValue.AsBoolean,
            BsonType.DateTime => bsonValue.AsDateTime,
            BsonType.ObjectId => bsonValue.AsObjectId.ToString(),
            BsonType.Null => null,
            _ => bsonValue.ToString()
        };
    }

    private BsonDocument BuildFilterStage(Dictionary<string, object> filterModel)
    {
        var matchDoc = new BsonDocument();
        
        foreach (var filter in filterModel)
        {
            // Implement filter logic based on your filter types
            // This is a simplified example
            matchDoc[filter.Key] = BsonValue.Create(filter.Value);
        }
        
        return matchDoc;
    }

    private BsonDocument BuildSortStage(List<SortModel> sortModel)
    {
        var sortDoc = new BsonDocument();
        
        foreach (var sort in sortModel)
        {
            sortDoc[sort.ColId] = sort.Sort == "asc" ? 1 : -1;
        }
        
        return sortDoc;
    }
}
Key Features Implemented
Multi-level Grouping: Country → Year → Sport hierarchy
Server-side Aggregation: Sum, avg, min, max, count operations
Lazy Loading: Only loads data when groups are expanded
Pagination: Handles large datasets efficiently
Filtering & Sorting: Server-side processing
Performance Optimized: Uses MongoDB aggregation pipeline
MongoDB Sample Data Structure
json
{
  "_id": ObjectId("..."),
  "athlete": "Michael Phelps",
  "age": 23,
  "country": "United States",
  "year": 2008,
  "date": "24/08/2008",
  "sport": "Swimming",
  "gold": 8,
  "silver": 0,
  "bronze": 0,
  "total": 8
}
This implementation creates a three-level hierarchy (Country > Year > Sport) with aggregated medal counts at each level, and shows individual athlete records at the leaf level.






