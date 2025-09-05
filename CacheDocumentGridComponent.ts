Here's the complete implementation for AG-Grid SSRM with multiple group columns (no aggregation) applied to your CacheDocument collection structure:
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
  selector: 'app-cache-document-grid',
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
export class CacheDocumentGridComponent implements OnInit {
  
  public gridOptions: GridOptions = {};
  public columnDefs: ColDef[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.columnDefs = [
      // Group columns - create hierarchy
      { 
        field: 'region', 
        rowGroup: true, 
        hide: true,
        headerName: 'Region'
      },
      { 
        field: 'controlCategory', 
        rowGroup: true, 
        hide: true,
        headerName: 'Control Category'
      },
      { 
        field: 'productType', 
        rowGroup: true, 
        hide: true,
        headerName: 'Product Type'
      },
      { 
        field: 'desk', 
        rowGroup: true, 
        hide: true,
        headerName: 'Desk'
      },
      
      // Display columns (no aggregation)
      { field: 'id', headerName: 'ID', width: 100 },
      { field: 'pendingChangeType', headerName: 'Change Type' },
      { field: 'approvalStatus', headerName: 'Approval Status' },
      { field: 'updatedBy', headerName: 'Updated By' },
      { field: 'updatedOn', headerName: 'Updated On', cellRenderer: 'agDateStringCellRenderer' },
      { field: 'algo', headerName: 'Algorithm' },
      { field: 'productSegment', headerName: 'Product Segment' },
      { field: 'cacheKey', headerName: 'Cache Key' },
      { field: 'gridKey', headerName: 'Grid Key' }
    ];

    this.gridOptions = {
      rowModelType: 'serverSide',
      serverSideStoreType: 'partial',
      
      // Row grouping configuration
      rowGroupPanelShow: 'always',
      groupDefaultExpanded: 0,
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
        minWidth: 300
      },

      // Performance settings
      cacheBlockSize: 100,
      maxBlocksInCache: 10,
      purgeClosedRowNodes: true,
      maxConcurrentDatasourceRequests: 2
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

        this.http.post<any>('/api/cachedocuments/grouped-data', request)
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
csharp// MongoDB document models
public class CacheDocument
{
    [BsonId]
    public ObjectId Id { get; set; }
    
    [BsonElement("cacheKey")]
    public string CacheKey { get; set; }
    
    [BsonElement("gridKey")]
    public string GridKey { get; set; }
    
    [BsonElement("parentId")]
    public string ParentId { get; set; }
    
    [BsonElement("fullPath")]
    public string FullPath { get; set; }
    
    [BsonElement("hashKey")]
    public string HashKey { get; set; }
    
    [BsonElement("documentType")]
    public string DocumentType { get; set; }
    
    [BsonElement("dataList")]
    public List<ExpandoData> DataList { get; set; }
    
    [BsonElement("data")]
    public ExpandoData Data { get; set; }
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }
    
    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }
    
    [BsonElement("metadata")]
    public BsonDocument Metadata { get; set; }
}

public class ExpandoData
{
    [BsonElement("id")]
    public string Id { get; set; }
    
    [BsonElement("region")]
    public string Region { get; set; }
    
    [BsonElement("pendingChangeType")]
    public string PendingChangeType { get; set; }
    
    [BsonElement("approvalStatus")]
    public string ApprovalStatus { get; set; }
    
    [BsonElement("updatedBy")]
    public string UpdatedBy { get; set; }
    
    [BsonElement("updatedOn")]
    public DateTime UpdatedOn { get; set; }
    
    [BsonElement("algo")]
    public string Algo { get; set; }
    
    [BsonElement("controlCategory")]
    public string ControlCategory { get; set; }
    
    [BsonElement("productType")]
    public string ProductType { get; set; }
    
    [BsonElement("productSegment")]
    public string ProductSegment { get; set; }
    
    [BsonElement("desk")]
    public string Desk { get; set; }
}

// Request/Response models
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
    public string Sort { get; set; }
}

public class ServerSideResponse
{
    public List<object> Rows { get; set; } = new();
    public int RowCount { get; set; }
}
C# Controller
csharp[ApiController]
[Route("api/[controller]")]
public class CacheDocumentsController : ControllerBase
{
    private readonly CacheDocumentService _cacheDocumentService;

    public CacheDocumentsController(CacheDocumentService cacheDocumentService)
    {
        _cacheDocumentService = cacheDocumentService;
    }

    [HttpPost("grouped-data")]
    public async Task<ActionResult<ServerSideResponse>> GetGroupedData(
        [FromBody] ServerSideRequest request)
    {
        try
        {
            var response = await _cacheDocumentService.GetGroupedData(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
C# Service with MongoDB Aggregation
csharppublic class CacheDocumentService
{
    private readonly IMongoCollection<CacheDocument> _collection;

    public CacheDocumentService(IMongoDatabase database)
    {
        _collection = database.GetCollection<CacheDocument>("CacheDocument");
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
            // Get leaf data from flattened dataList/data
            results = await GetLeafData(request);
            totalCount = await GetLeafDataCount(request);
        }
        else
        {
            // Get group data
            results = await GetGroupData(request, currentLevel);
            totalCount = results.Count;
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

        // Unwind the dataList to work with individual data records
        pipeline.Add(new BsonDocument("$unwind", new BsonDocument
        {
            { "path", "$dataList" },
            { "preserveNullAndEmptyArrays", false }
        }));

        // Also handle documents where data is stored in 'data' field instead of 'dataList'
        pipeline.Add(new BsonDocument("$addFields", new BsonDocument("flatData", 
            new BsonDocument("$cond", new BsonDocument
            {
                { "if", new BsonDocument("$ne", new BsonArray { "$dataList", null }) },
                { "then", "$dataList" },
                { "else", "$data" }
            })
        )));

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
            { "_id", $"$flatData.{groupCol.Field}" }
        });

        pipeline.Add(groupDoc);

        // Add sort
        pipeline.Add(new BsonDocument("$sort", new BsonDocument("_id", 1)));

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

        // Unwind dataList to get individual records
        pipeline.Add(new BsonDocument("$unwind", new BsonDocument
        {
            { "path", "$dataList" },
            { "preserveNullAndEmptyArrays", false }
        }));

        // Handle both dataList and data fields
        pipeline.Add(new BsonDocument("$addFields", new BsonDocument("flatData", 
            new BsonDocument("$cond", new BsonDocument
            {
                { "if", new BsonDocument("$ne", new BsonArray { "$dataList", null }) },
                { "then", "$dataList" },
                { "else", "$data" }
            })
        )));

        // Project the flattened data along with cache document fields
        pipeline.Add(new BsonDocument("$project", new BsonDocument
        {
            { "cacheKey", 1 },
            { "gridKey", 1 },
            { "parentId", 1 },
            { "fullPath", 1 },
            { "hashKey", 1 },
            { "documentType", 1 },
            { "createdAt", 1 },
            { "expiresAt", 1 },
            { "id", "$flatData.id" },
            { "region", "$flatData.region" },
            { "pendingChangeType", "$flatData.pendingChangeType" },
            { "approvalStatus", "$flatData.approvalStatus" },
            { "updatedBy", "$flatData.updatedBy" },
            { "updatedOn", "$flatData.updatedOn" },
            { "algo", "$flatData.algo" },
            { "controlCategory", "$flatData.controlCategory" },
            { "productType", "$flatData.productType" },
            { "productSegment", "$flatData.productSegment" },
            { "desk", "$flatData.desk" }
        }));

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
            // Default sort by updatedOn descending
            pipeline.Add(new BsonDocument("$sort", new BsonDocument("updatedOn", -1)));
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
            matchDoc[$"flatData.{groupCol.Field}"] = request.GroupKeys[i];
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

        // Unwind and flatten
        pipeline.Add(new BsonDocument("$unwind", new BsonDocument
        {
            { "path", "$dataList" },
            { "preserveNullAndEmptyArrays", false }
        }));

        pipeline.Add(new BsonDocument("$addFields", new BsonDocument("flatData", 
            new BsonDocument("$cond", new BsonDocument
            {
                { "if", new BsonDocument("$ne", new BsonArray { "$dataList", null }) },
                { "then", "$dataList" },
                { "else", "$data" }
            })
        )));

        // Project flattened fields
        pipeline.Add(new BsonDocument("$project", new BsonDocument
        {
            { "region", "$flatData.region" },
            { "controlCategory", "$flatData.controlCategory" },
            { "productType", "$flatData.productType" },
            { "desk", "$flatData.desk" },
            { "id", "$flatData.id" },
            { "pendingChangeType", "$flatData.pendingChangeType" },
            { "approvalStatus", "$flatData.approvalStatus" },
            { "updatedBy", "$flatData.updatedBy" },
            { "updatedOn", "$flatData.updatedOn" },
            { "algo", "$flatData.algo" },
            { "productSegment", "$flatData.productSegment" }
        }));

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
                gridRows.Add(TransformLeafRow(doc));
            }
            else
            {
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
        var groupValue = doc["_id"]?.ToString() ?? "Unknown";

        var row = new Dictionary<string, object>
        {
            [groupCol.Field] = groupValue,
            ["ag-Grid-AutoColumn"] = groupValue
        };

        // Add AG-Grid metadata for group rendering
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
            if (filter.Value is string stringValue && !string.IsNullOrEmpty(stringValue))
            {
                matchDoc[filter.Key] = new BsonRegularExpression(stringValue, "i");
            }
            else if (filter.Value != null)
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
