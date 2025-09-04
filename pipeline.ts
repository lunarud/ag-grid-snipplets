Here's a complete implementation for AG-Grid SSRM with multiple group columns without aggregation using C#, MongoDB, and Angular:
Angular Component
typescriptimport { Component, OnInit } from '@angular/core';
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
      // Group columns - these will create the hierarchy (no aggregation)
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
      
      // Display columns (no aggregation functions)
      { field: 'athlete', headerName: 'Athlete' },
      { field: 'age', headerName: 'Age' },
      { field: 'gold', headerName: 'Gold' },
      { field: 'silver', headerName: 'Silver' },
      { field: 'bronze', headerName: 'Bronze' },
      { field: 'date', headerName: 'Date' }
    ];

    this.gridOptions = {
      rowModelType: 'serverSide',
      serverSideStoreType: 'partial',
      
      // Row grouping configuration
      rowGroupPanelShow: 'always',
      groupDefaultExpanded: 0, // Start collapsed
      groupSelectsChildren: true,
      groupSelectsFiltered: true,
      
      // Disable aggregation
      suppressAggFuncInHeader: true,
      
      // Auto group column configuration
      autoGroupColumnDef: {
        headerName: 'Group',
        field: 'ag-Grid-AutoColumn',
        cellRenderer: 'agGroupCellRenderer',
        cellRendererParams: {
          suppressCount: true, // Hide count in group headers
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
csharp// Request models (no ValueCols needed since no aggregation)
public class ServerSideRequest
{
    public int StartRow { get; set; }
    public int EndRow { get; set; }
    public List<ColumnVO> RowGroupCols { get; set; } = new();
    public List<string> GroupKeys { get; set; } = new();
    public List<SortModel> SortModel { get; set; } = new();
    public Dictionary<string, object> FilterModel { get; set; } = new();
}

public class ColumnVO
{
    public string Id { get; set; }
    public string DisplayName { get; set; }
    public string Field { get; set; }
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
csharp[ApiController]
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
C# Service with MongoDB (No Aggregation)
csharppublic class OlympicsService
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
            // Get group data (distinct values only)
            results = await GetGroupData(request, currentLevel);
            totalCount = results.Count; // For groups, count is the number of distinct groups
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

        // Get distinct values for the current group level (no aggregation)
        var groupCol = request.RowGroupCols[level];
        var groupDoc = new BsonDocument("$group", new BsonDocument
        {
            { "_id", $"${groupCol.Field}" }
        });

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
        else
        {
            // Default sort by athlete name
            pipeline.Add(new BsonDocument("$sort", new BsonDocument("athlete", 1)));
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
                // Transform leaf row (actual data)
                gridRows.Add(TransformLeafRow(doc));
            }
            else
            {
                // Transform group row (group headers only)
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

        var row = new Dictionary<string, object>
        {
            [groupCol.Field] = groupValue,
            ["ag-Grid-AutoColumn"] = groupValue
        };

        // Add AG-Grid metadata for group rendering (no aggregation data)
        row["__agGridGroupData"] = new
        {
            isGroup = true,
            key = groupValue,
            field = groupCol.Field,
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
            // This is a simplified example for text filters
            if (filter.Value is string stringValue)
            {
                matchDoc[filter.Key] = new BsonRegularExpression(stringValue, "i"); // Case insensitive
            }
            else
            {
                matchDoc[filter.Key] = BsonValue.Create(filter.Value);
            }
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
Key Differences from Aggregated Version

No Value Columns: Removed ValueCols from request model and processing
No Aggregation Functions: Column definitions don't include aggFunc
Simple Group Query: MongoDB aggregation only does $group by _id without sum/count/avg
No Aggregated Data: Group rows only contain the group value, no calculated totals
Simplified Transform: Group transformation doesn't include aggregated values
Cleaner Group Headers: suppressCount: true hides counts in group headers

Result Structure

Group Levels: Show distinct values for Country → Year → Sport
Leaf Level: Shows individual athlete records with all their data
No Totals: Group headers show only the group name (e.g., "United States", "2008", "Swimming")
Raw Data: Leaf nodes show the actual Olympic results without any calculations

This implementation provides a clean hierarchical view of your data organized by multiple group columns without any aggregation calculations, making it ideal for browsing and exploring data structure rather than analyzing totals.
