using MongoDB.Driver;
using TreeDataApi.Models;

namespace TreeDataApi.Services
{
    public interface ITreeDataService
    {
        Task<List<FlatTreeNode>> GetFlattenedTreeAsync();
        Task<List<FlatTreeNode>> GetFlattenedTreeByParentAsync(string parentId);
        Task<TreeNode> CreateNodeAsync(TreeNode node);
        Task<bool> UpdateNodeAsync(string id, TreeNode node);
        Task<bool> DeleteNodeAsync(string id);
    }

    public class TreeDataService : ITreeDataService
    {
        private readonly IMongoCollection<TreeNode> _treeNodes;
        private readonly ILogger<TreeDataService> _logger;

        public TreeDataService(IMongoDatabase database, ILogger<TreeDataService> logger)
        {
            _treeNodes = database.GetCollection<TreeNode>("tree_nodes");
            _logger = logger;
        }

        public async Task<List<FlatTreeNode>> GetFlattenedTreeAsync()
        {
            try
            {
                // MongoDB Aggregation Pipeline to flatten tree structure
                var pipeline = new BsonDocument[]
                {
                    // Stage 1: Match active nodes only
                    new BsonDocument("$match", new BsonDocument("isActive", true)),
                    
                    // Stage 2: Add computed fields
                    new BsonDocument("$addFields", new BsonDocument
                    {
                        ["parentObjectId"] = new BsonDocument("$cond", new BsonDocument[]
                        {
                            new BsonDocument("$ne", new BsonArray { "$parentId", BsonNull.Value }),
                            new BsonDocument("$toObjectId", "$parentId"),
                            BsonNull.Value
                        })
                    }),
                    
                    // Stage 3: Lookup to build hierarchy paths
                    new BsonDocument("$graphLookup", new BsonDocument
                    {
                        ["from"] = "tree_nodes",
                        ["startWith"] = "$parentObjectId",
                        ["connectFromField"] = "parentObjectId",
                        ["connectToField"] = "_id",
                        ["as"] = "ancestors",
                        ["depthField"] = "depth"
                    }),
                    
                    // Stage 4: Lookup children count
                    new BsonDocument("$lookup", new BsonDocument
                    {
                        ["from"] = "tree_nodes",
                        ["localField"] = "_id",
                        ["foreignField"] = "parentObjectId",
                        ["as"] = "children"
                    }),
                    
                    // Stage 5: Sort ancestors by level for proper path ordering
                    new BsonDocument("$addFields", new BsonDocument
                    {
                        ["sortedAncestors"] = new BsonDocument("$sortArray", new BsonDocument
                        {
                            ["input"] = "$ancestors",
                            ["sortBy"] = new BsonDocument("level", 1)
                        })
                    }),
                    
                    // Stage 6: Project final structure
                    new BsonDocument("$project", new BsonDocument
                    {
                        ["_id"] = 1,
                        ["name"] = 1,
                        ["description"] = 1,
                        ["parentId"] = 1,
                        ["level"] = 1,
                        ["sortOrder"] = 1,
                        ["createdDate"] = 1,
                        ["isActive"] = 1,
                        ["nodeType"] = 1,
                        ["hasChildren"] = new BsonDocument("$gt", new BsonArray { new BsonDocument("$size", "$children"), 0 }),
                        ["childCount"] = new BsonDocument("$size", "$children"),
                        ["orgHierarchy"] = new BsonDocument("$concatArrays", new BsonArray
                        {
                            new BsonDocument("$map", new BsonDocument
                            {
                                ["input"] = "$sortedAncestors",
                                ["as"] = "ancestor",
                                ["in"] = new BsonDocument("$toString", "$$ancestor._id")
                            }),
                            new BsonArray { new BsonDocument("$toString", "$_id") }
                        }),
                        ["fullPath"] = new BsonDocument("$concat", new BsonArray
                        {
                            new BsonDocument("$reduce", new BsonDocument
                            {
                                ["input"] = "$sortedAncestors",
                                ["initialValue"] = "",
                                ["in"] = new BsonDocument("$concat", new BsonArray { "$$value", "$$this.name", " > " })
                            }),
                            "$name"
                        })
                    }),
                    
                    // Stage 7: Sort by level and sortOrder
                    new BsonDocument("$sort", new BsonDocument { ["level"] = 1, ["sortOrder"] = 1, ["name"] = 1 })
                };

                var aggregateResult = await _treeNodes.Aggregate<BsonDocument>(pipeline).ToListAsync();
                
                return aggregateResult.Select(doc => new FlatTreeNode
                {
                    Id = doc["_id"].AsObjectId.ToString(),
                    Name = doc.GetValue("name", "").AsString,
                    Description = doc.GetValue("description", "").AsString,
                    ParentId = doc.GetValue("parentId", BsonNull.Value).IsBsonNull ? null : doc["parentId"].AsString,
                    Level = doc.GetValue("level", 0).AsInt32,
                    SortOrder = doc.GetValue("sortOrder", 0).AsInt32,
                    CreatedDate = doc.GetValue("createdDate", DateTime.MinValue).ToUniversalTime(),
                    IsActive = doc.GetValue("isActive", true).AsBoolean,
                    NodeType = doc.GetValue("nodeType", "").AsString,
                    HasChildren = doc.GetValue("hasChildren", false).AsBoolean,
                    ChildCount = doc.GetValue("childCount", 0).AsInt32,
                    OrgHierarchy = doc.GetValue("orgHierarchy", new BsonArray()).AsBsonArray.Select(x => x.AsString).ToList(),
                    FullPath = doc.GetValue("fullPath", "").AsString,
                    DisplayName = doc.GetValue("name", "").AsString,
                    IndentedName = new string(' ', doc.GetValue("level", 0).AsInt32 * 4) + doc.GetValue("name", "").AsString
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error flattening tree data from MongoDB");
                throw;
            }
        }

        public async Task<List<FlatTreeNode>> GetFlattenedTreeByParentAsync(string parentId)
        {
            var filter = string.IsNullOrEmpty(parentId) 
                ? Builders<TreeNode>.Filter.Eq(x => x.ParentId, null)
                : Builders<TreeNode>.Filter.Eq(x => x.ParentId, parentId);

            var nodes = await _treeNodes.Find(filter & Builders<TreeNode>.Filter.Eq(x => x.IsActive, true))
                .SortBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .ToListAsync();

            var flatNodes = new List<FlatTreeNode>();
            foreach (var node in nodes)
            {
                flatNodes.Add(await BuildFlatNodeAsync(node));
                flatNodes.AddRange(await GetDescendantsAsync(node.Id));
            }

            return flatNodes;
        }

        private async Task<FlatTreeNode> BuildFlatNodeAsync(TreeNode node)
        {
            var orgHierarchy = await BuildHierarchyPathAsync(node.Id);
            var childCount = await _treeNodes.CountDocumentsAsync(
                Builders<TreeNode>.Filter.Eq(x => x.ParentId, node.Id) & 
                Builders<TreeNode>.Filter.Eq(x => x.IsActive, true));

            return new FlatTreeNode
            {
                Id = node.Id,
                Name = node.Name,
                Description = node.Description,
                ParentId = node.ParentId,
                Level = node.Level,
                SortOrder = node.SortOrder,
                CreatedDate = node.CreatedDate,
                IsActive = node.IsActive,
                NodeType = node.NodeType,
                HasChildren = childCount > 0,
                ChildCount = (int)childCount,
                OrgHierarchy = orgHierarchy,
                FullPath = await BuildFullPathAsync(node.Id),
                DisplayName = node.Name,
                IndentedName = new string(' ', node.Level * 4) + node.Name
            };
        }

        private async Task<List<string>> BuildHierarchyPathAsync(string nodeId)
        {
            var path = new List<string>();
            var currentNodeId = nodeId;

            while (!string.IsNullOrEmpty(currentNodeId))
            {
                path.Insert(0, currentNodeId);
                var node = await _treeNodes.Find(x => x.Id == currentNodeId).FirstOrDefaultAsync();
                currentNodeId = node?.ParentId;
            }

            return path;
        }

        private async Task<string> BuildFullPathAsync(string nodeId)
        {
            var pathNames = new List<string>();
            var currentNodeId = nodeId;

            while (!string.IsNullOrEmpty(currentNodeId))
            {
                var node = await _treeNodes.Find(x => x.Id == currentNodeId).FirstOrDefaultAsync();
                if (node != null)
                {
                    pathNames.Insert(0, node.Name);
                    currentNodeId = node.ParentId;
                }
                else
                {
                    break;
                }
            }

            return string.Join(" > ", pathNames);
        }

        private async Task<List<FlatTreeNode>> GetDescendantsAsync(string parentId)
        {
            var descendants = new List<FlatTreeNode>();
            var children = await _treeNodes.Find(
                Builders<TreeNode>.Filter.Eq(x => x.ParentId, parentId) & 
                Builders<TreeNode>.Filter.Eq(x => x.IsActive, true))
                .SortBy(x => x.SortOrder)
                .ToListAsync();

            foreach (var child in children)
            {
                descendants.Add(await BuildFlatNodeAsync(child));
                descendants.AddRange(await GetDescendantsAsync(child.Id));
            }

            return descendants;
        }

        public async Task<TreeNode> CreateNodeAsync(TreeNode node)
        {
            node.CreatedDate = DateTime.UtcNow;
            node.IsActive = true;
            
            // Auto-calculate level if parent exists
            if (!string.IsNullOrEmpty(node.ParentId))
            {
                var parent = await _treeNodes.Find(x => x.Id == node.ParentId).FirstOrDefaultAsync();
                node.Level = parent?.Level + 1 ?? 0;
            }
            else
            {
                node.Level = 0;
            }

            await _treeNodes.InsertOneAsync(node);
            return node;
        }

        public async Task<bool> UpdateNodeAsync(string id, TreeNode node)
        {
            var result = await _treeNodes.ReplaceOneAsync(x => x.Id == id, node);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteNodeAsync(string id)
        {
            // Soft delete - mark as inactive
            var update = Builders<TreeNode>.Update.Set(x => x.IsActive, false);
            var result = await _treeNodes.UpdateOneAsync(x => x.Id == id, update);
            return result.ModifiedCount > 0;
        }
    }
}
