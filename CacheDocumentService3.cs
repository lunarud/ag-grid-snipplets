Updated C# Service
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
            // Get leaf data from "data" field
            results = await GetLeafData(request);
            totalCount = await GetLeafDataCount(request);
        }
        else
        {
            // Get group data from "data" field
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

        // Filter out documents where data is null
        pipeline.Add(new BsonDocument("$match", new BsonDocument("data", new BsonDocument("$ne", null))));

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

        // Group by current level field from "data"
        var groupCol = request.RowGroupCols[level];
        var groupDoc = new BsonDocument("$group", new BsonDocument
        {
            { "_id", $"$data.{groupCol.Field}" }
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

        // Filter out documents where data is null
        pipeline.Add(new BsonDocument("$match", new BsonDocument("data", new BsonDocument("$ne", null))));

        // Project the data fields along with cache document fields
        pipeline.Add(new BsonDocument("$project", new BsonDocument
        {
            // Cache document fields
            { "cacheKey", 1 },
            { "gridKey", 1 },
            { "parentId", 1 },
            { "fullPath", 1 },
            { "hashKey", 1 },
            { "documentType", 1 },
            { "createdAt", 1 },
            { "expiresAt", 1 },
            { "metadata", 1 },
            
            // Data fields (flattened from "data" object)
            { "id", "$data.id" },
            { "region", "$data.region" },
            { "pendingChangeType", "$data.pendingChangeType" },
            { "approvalStatus", "$data.approvalStatus" },
            { "updatedBy", "$data.updatedBy" },
            { "updatedOn", "$data.updatedOn" },
            { "algo", "$data.algo" },
            { "controlCategory", "$data.controlCategory" },
            { "productType", "$data.productType" },
            { "productSegment", "$data.productSegment" },
            { "desk", "$data.desk" }
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
            matchDoc[$"data.{groupCol.Field}"] = request.GroupKeys[i];
        }
        
        return matchDoc;
    }

    private BsonDocument BuildExactGroupMatch(ServerSideRequest request)
    {
        var matchDoc = new BsonDocument();
        
        for (int i = 0; i < request.GroupKeys.Count; i++)
        {
            var groupCol = request.RowGroupCols[i];
            // After projection, the fields are flattened to root level
            matchDoc[groupCol.Field] = request.GroupKeys[i];
        }
        
        return matchDoc;
    }

    private async Task<int> GetLeafDataCount(ServerSideRequest request)
    {
        var pipeline = new List<BsonDocument>();

        // Filter out documents where data is null
        pipeline.Add(new BsonDocument("$match", new BsonDocument("data", new BsonDocument("$ne", null))));

        // Project flattened fields from "data"
        pipeline.Add(new BsonDocument("$project", new BsonDocument
        {
            { "region", "$data.region" },
            { "controlCategory", "$data.controlCategory" },
            { "productType", "$data.productType" },
            { "desk", "$data.desk" },
            { "id", "$data.id" },
            { "pendingChangeType", "$data.pendingChangeType" },
            { "approvalStatus", "$data.approvalStatus" },
            { "updatedBy", "$data.updatedBy" },
            { "updatedOn", "$data.updatedOn" },
            { "algo", "$data.algo" },
            { "productSegment", "$data.productSegment" }
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
