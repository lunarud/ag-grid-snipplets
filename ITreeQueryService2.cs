// Advanced Tree Query Patterns
// Services/ITreeQueryService.cs
using TreeApp.Models;

namespace TreeApp.Services
{
    public interface ITreeQueryService
    {
        Task<IEnumerable<TreeNode>> GetSubtreeAsync(string rootId, int? maxDepth = null);
        Task<IEnumerable<TreeNode>> GetLeafNodesAsync();
        Task<IEnumerable<TreeNode>> GetNodesAtLevelAsync(int level);
        Task<IEnumerable<TreeNode>> GetSiblingsAsync(string nodeId);
        Task<IEnumerable<TreeNode>> GetAncestorsAsync(string nodeId);
        Task<IEnumerable<TreeNode>> GetDescendantsAsync(string nodeId);
        Task<TreeStatistics> GetTreeStatisticsAsync();
        Task<IEnumerable<TreeNode>> FindOrphanedNodesAsync();
        Task<IEnumerable<TreeNode>> GetNodesByMetadataAsync(string key, object value);
        Task<TreeNode?> FindLowestCommonAncestorAsync(string nodeId1, string nodeId2);
    }

    public class TreeStatistics
    {
        public int TotalNodes { get; set; }
        public int RootNodes { get; set; }
        public int LeafNodes { get; set; }
        public int MaxDepth { get; set; }
        public double AverageChildrenPerNode { get; set; }
        public Dictionary<int, int> NodesPerLevel { get; set; } = new();
    }
}

// Services/TreeQueryService.cs
using MongoDB.Driver;
using TreeApp.Models;

namespace TreeApp.Services
{
    public class TreeQueryService : ITreeQueryService
    {
        private readonly IMongoCollection<TreeNode> _collection;

        public TreeQueryService(IMongoDatabase database)
        {
            _collection = database.GetCollection<TreeNode>("treenodes");
        }

        public async Task<IEnumerable<TreeNode>> GetSubtreeAsync(string rootId, int? maxDepth = null)
        {
            // Get all descendants using MongoDB aggregation pipeline
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument("$or", new BsonArray
                {
                    new BsonDocument("_id", new ObjectId(rootId)),
                    new BsonDocument("$expr", new BsonDocument("$function", new BsonDocument
                    {
                        {"body", @"
                            function(parentId, rootId) {
                                function isDescendant(currentId, targetRootId, visited = new Set()) {
                                    if (!currentId || visited.has(currentId.toString())) return false;
                                    if (currentId.toString() === targetRootId.toString()) return true;
                                    
                                    visited.add(currentId.toString());
                                    const parent = db.treenodes.findOne({_id: currentId});
                                    return parent && parent.parentId && isDescendant(parent.parentId, targetRootId, visited);
                                }
                                return isDescendant(parentId, rootId);
                            }
                        "},
                        {"args", new BsonArray { "$parentId", new ObjectId(rootId) }},
                        {"lang", "js"}
                    }))
                })),
                new BsonDocument("$sort", new BsonDocument { {"parentId", 1}, {"sortOrder", 1} })
            };

            // Simpler approach using recursive lookup (MongoDB 3.6+)
            var recursivePipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument("_id", new ObjectId(rootId))),
                new BsonDocument("$graphLookup", new BsonDocument
                {
                    {"from", "treenodes"},
                    {"startWith", "$_id"},
                    {"connectFromField", "_id"},
                    {"connectToField", "parentId"},
                    {"as", "descendants"},
                    {"maxDepth", maxDepth ?? 100}
                }),
                new BsonDocument("$project", new BsonDocument
                {
                    {"allNodes", new BsonDocument("$concatArrays", new BsonArray { new BsonArray { "$$ROOT" }, "$descendants" })}
                }),
                new BsonDocument("$unwind", "$allNodes"),
                new BsonDocument("$replaceRoot", new BsonDocument("newRoot", "$allNodes")),
                new BsonDocument("$sort", new BsonDocument { {"parentId", 1}, {"sortOrder", 1} })
            };

            var result = await _collection.Aggregate<TreeNode>(recursivePipeline).ToListAsync();
            return result;
        }

        public async Task<IEnumerable<TreeNode>> GetLeafNodesAsync()
        {
            // Nodes that don't have any children
            var pipeline = new[]
            {
                new BsonDocument("$lookup", new BsonDocument
                {
                    {"from", "treenodes"},
                    {"localField", "_id"},
                    {"foreignField", "parentId"},
                    {"as", "children"}
                }),
                new BsonDocument("$match", new BsonDocument("children", new BsonDocument("$size", 0))),
                new BsonDocument("$project", new BsonDocument("children", 0))
            };

            var result = await _collection.Aggregate<TreeNode>(pipeline).ToListAsync();
            return result;
        }

        public async Task<IEnumerable<TreeNode>> GetNodesAtLevelAsync(int level)
        {
            // Calculate level using recursive aggregation
            var pipeline = new[]
            {
                new BsonDocument("$graphLookup", new BsonDocument
                {
                    {"from", "treenodes"},
                    {"startWith", "$parentId"},
                    {"connectFromField", "parentId"},
                    {"connectToField", "_id"},
                    {"as", "ancestors"}
                }),
                new BsonDocument("$addFields", new BsonDocument("level", new BsonDocument("$size", "$ancestors"))),
                new BsonDocument("$match", new BsonDocument("level", level)),
                new BsonDocument("$project", new BsonDocument("ancestors", 0))
            };

            var result = await _collection.Aggregate<TreeNode>(pipeline).ToListAsync();
            return result;
        }

        public async Task<IEnumerable<TreeNode>> GetSiblingsAsync(string nodeId)
        {
            var node = await _collection.Find(x => x.Id == nodeId).FirstOrDefaultAsync();
            if (node == null) return new List<TreeNode>();

            var filter = node.ParentId == null 
                ? Builders<TreeNode>.Filter.Eq(x => x.ParentId, BsonNull.Value)
                : Builders<TreeNode>.Filter.Eq(x => x.ParentId, node.ParentId);

            filter = filter & Builders<TreeNode>.Filter.Ne(x => x.Id, nodeId);

            return await _collection.Find(filter).SortBy(x => x.SortOrder).ToListAsync();
        }

        public async Task<IEnumerable<TreeNode>> GetAncestorsAsync(string nodeId)
        {
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument("_id", new ObjectId(nodeId))),
                new BsonDocument("$graphLookup", new BsonDocument
                {
                    {"from", "treenodes"},
                    {"startWith", "$parentId"},
                    {"connectFromField", "parentId"},
                    {"connectToField", "_id"},
                    {"as", "ancestors"}
                }),
                new BsonDocument("$unwind", "$ancestors"),
                new BsonDocument("$replaceRoot", new BsonDocument("newRoot", "$ancestors"))
            };

            var result = await _collection.Aggregate<TreeNode>(pipeline).ToListAsync();
            return result;
        }

        public async Task<IEnumerable<TreeNode>> GetDescendantsAsync(string nodeId)
        {
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument("_id", new ObjectId(nodeId))),
                new BsonDocument("$graphLookup", new BsonDocument
                {
                    {"from", "treenodes"},
                    {"startWith", "$_id"},
                    {"connectFromField", "_id"},
                    {"connectToField", "parentId"},
                    {"as", "descendants"}
                }),
                new BsonDocument("$unwind", "$descendants"),
                new BsonDocument("$replaceRoot", new BsonDocument("newRoot", "$descendants"))
            };

            var result = await _collection.Aggregate<TreeNode>(pipeline).ToListAsync();
            return result;
        }

        public async Task<TreeStatistics> GetTreeStatisticsAsync()
        {
            var pipeline = new[]
            {
                new BsonDocument("$facet", new BsonDocument
                {
                    {"totalNodes", new BsonArray { new BsonDocument("$count", "count") }},
                    {"rootNodes", new BsonArray 
                    {
                        new BsonDocument("$match", new BsonDocument("parentId", BsonNull.Value)),
                        new BsonDocument("$count", "count")
                    }},
                    {"leafNodes", new BsonArray
                    {
                        new BsonDocument("$lookup", new BsonDocument
                        {
                            {"from", "treenodes"},
                            {"localField", "_id"},
                            {"foreignField", "parentId"},
                            {"as", "children"}
                        }),
                        new BsonDocument("$match", new BsonDocument("children", new BsonDocument("$size", 0))),
                        new BsonDocument("$count", "count")
                    }},
                    {"levelStats", new BsonArray
                    {
                        new BsonDocument("$graphLookup", new BsonDocument
                        {
                            {"from", "treenodes"},
                            {"startWith", "$parentId"},
                            {"connectFromField", "parentId"},
                            {"connectToField", "_id"},
                            {"as", "ancestors"}
                        }),
                        new BsonDocument("$addFields", new BsonDocument("level", new BsonDocument("$size", "$ancestors"))),
                        new BsonDocument("$group", new BsonDocument
                        {
                            {"_id", "$level"},
                            {"count", new BsonDocument("$sum", 1)}
                        }),
                        new BsonDocument("$sort", new BsonDocument("_id", 1))
                    }},
                    {"childrenStats", new BsonArray
                    {
                        new BsonDocument("$lookup", new BsonDocument
                        {
                            {"from", "treenodes"},
                            {"localField", "_id"},
                            {"foreignField", "parentId"},
                            {"as", "children"}
                        }),
                        new BsonDocument("$addFields", new BsonDocument("childCount", new BsonDocument("$size", "$children"))),
                        new BsonDocument("$group", new BsonDocument
                        {
                            {"_id", null},
                            {"avgChildren", new BsonDocument("$avg", "$childCount")},
                            {"maxLevel", new BsonDocument("$max", new BsonDocument("$size", "$ancestors"))}
                        })
                    }}
                })
            };

            var result = await _collection.Aggregate<BsonDocument>(pipeline).FirstOrDefaultAsync();
            
            var stats = new TreeStatistics();
            
            if (result != null)
            {
                stats.TotalNodes = result["totalNodes"].AsBsonArray.FirstOrDefault()?["count"]?.AsInt32 ?? 0;
                stats.RootNodes = result["rootNodes"].AsBsonArray.FirstOrDefault()?["count"]?.AsInt32 ?? 0;
                stats.LeafNodes = result["leafNodes"].AsBsonArray.FirstOrDefault()?["count"]?.AsInt32 ?? 0;
                
                var levelStats = result["levelStats"].AsBsonArray;
                foreach (var levelStat in levelStats)
                {
                    var level = levelStat["_id"].AsInt32;
                    var count = levelStat["count"].AsInt32;
                    stats.NodesPerLevel[level] = count;
                    stats.MaxDepth = Math.Max(stats.MaxDepth, level);
                }

                var childrenStats = result["childrenStats"].AsBsonArray.FirstOrDefault();
                if (childrenStats != null)
                {
                    stats.AverageChildrenPerNode = childrenStats["avgChildren"]?.AsDouble ?? 0;
                }
            }

            return stats;
        }

        public async Task<IEnumerable<TreeNode>> FindOrphanedNodesAsync()
        {
            // Nodes with parentId that doesn't exist in the collection
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument("parentId", new BsonDocument("$ne", BsonNull.Value))),
                new BsonDocument("$lookup", new BsonDocument
                {
                    {"from", "treenodes"},
                    {"localField", "parentId"},
                    {"foreignField", "_id"},
                    {"as", "parent"}
                }),
                new BsonDocument("$match", new BsonDocument("parent", new BsonDocument("$size", 0))),
                new BsonDocument("$project", new BsonDocument("parent", 0))
            };

            var result = await _collection.Aggregate<TreeNode>(pipeline).ToListAsync();
            return result;
        }

        public async Task<IEnumerable<TreeNode>> GetNodesByMetadataAsync(string key, object value)
        {
            var filter = Builders<TreeNode>.Filter.Eq($"metadata.{key}", value);
            return await _collection.Find(filter).ToListAsync();
        }

        public async Task<TreeNode?> FindLowestCommonAncestorAsync(string nodeId1, string nodeId2)
        {
            // Get ancestors for both nodes
            var ancestors1 = await GetAncestorsAsync(nodeId1);
            var ancestors2 = await GetAncestorsAsync(nodeId2);

            var ancestorIds1 = new HashSet<string>(ancestors1.Select(a => a.Id));
            
            // Find the first common ancestor when traversing from root to leaf
            foreach (var ancestor in ancestors2.Reverse())
            {
                if (ancestorIds1.Contains(ancestor.Id))
                {
                    return ancestor;
                }
            }

            return null;
        }
    }
}

// Controllers/TreeQueryController.cs
using Microsoft.AspNetCore.Mvc;
using TreeApp.Models;
using TreeApp.Services;

namespace TreeApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TreeQueryController : ControllerBase
    {
        private readonly ITreeQueryService _queryService;

        public TreeQueryController(ITreeQueryService queryService)
        {
            _queryService = queryService;
        }

        [HttpGet("subtree/{rootId}")]
        public async Task<ActionResult<IEnumerable<TreeNode>>> GetSubtree(
            string rootId, 
            [FromQuery] int? maxDepth = null)
        {
            try
            {
                var result = await _queryService.GetSubtreeAsync(rootId, maxDepth);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("leaves")]
        public async Task<ActionResult<IEnumerable<TreeNode>>> GetLeafNodes()
        {
            try
            {
                var result = await _queryService.GetLeafNodesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("level/{level}")]
        public async Task<ActionResult<IEnumerable<TreeNode>>> GetNodesAtLevel(int level)
        {
            try
            {
                var result = await _queryService.GetNodesAtLevelAsync(level);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{nodeId}/siblings")]
        public async Task<ActionResult<IEnumerable<TreeNode>>> GetSiblings(string nodeId)
        {
            try
            {
                var result = await _queryService.GetSiblingsAsync(nodeId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{nodeId}/ancestors")]
        public async Task<ActionResult<IEnumerable<TreeNode>>> GetAncestors(string nodeId)
        {
            try
            {
                var result = await _queryService.GetAncestorsAsync(nodeId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{nodeId}/descendants")]
        public async Task<ActionResult<IEnumerable<TreeNode>>> GetDescendants(string nodeId)
        {
            try
            {
                var result = await _queryService.GetDescendantsAsync(nodeId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("statistics")]
        public async Task<ActionResult<TreeStatistics>> GetTreeStatistics()
        {
            try
            {
                var result = await _queryService.GetTreeStatisticsAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("orphaned")]
        public async Task<ActionResult<IEnumerable<TreeNode>>> FindOrphanedNodes()
        {
            try
            {
                var result = await _queryService.FindOrphanedNodesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("metadata")]
        public async Task<ActionResult<IEnumerable<TreeNode>>> GetNodesByMetadata(
            [FromQuery] string key, 
            [FromQuery] string value)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(key))
                    return BadRequest("Metadata key is required");

                var result = await _queryService.GetNodesByMetadataAsync(key, value);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("lca")]
        public async Task<ActionResult<TreeNode>> FindLowestCommonAncestor(
            [FromQuery] string nodeId1, 
            [FromQuery] string nodeId2)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(nodeId1) || string.IsNullOrWhiteSpace(nodeId2))
                    return BadRequest("Both node IDs are required");

                var result = await _queryService.FindLowestCommonAncestorAsync(nodeId1, nodeId2);
                if (result == null)
                    return NotFound("No common ancestor found");

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}

// Performance Optimization Extensions
// Services/TreeCacheService.cs
using Microsoft.Extensions.Caching.Memory;
using TreeApp.Models;

namespace TreeApp.Services
{
    public class TreeCacheService
    {
        private readonly IMemoryCache _cache;
        private readonly ITreeService _treeService;
        private readonly TimeSpan _cacheExpiry = TimeSpan.FromMinutes(15);

        public TreeCacheService(IMemoryCache cache, ITreeService treeService)
        {
            _cache = cache;
            _treeService = treeService;
        }

        public async Task<IEnumerable<TreeNodeDto>> GetCachedTreeAsync(bool hierarchical = true)
        {
            string cacheKey = $"tree_{hierarchical}";
            
            if (_cache.TryGetValue(cacheKey, out IEnumerable<TreeNodeDto>? cachedTree))
            {
                return cachedTree!;
            }

            var tree = hierarchical 
                ? await _treeService.GetTreeAsync()
                : await _treeService.GetFlatTreeAsync();

            _cache.Set(cacheKey, tree, _cacheExpiry);
            return tree;
        }

        public void InvalidateCache()
        {
            _cache.Remove("tree_true");
            _cache.Remove("tree_false");
        }
    }
}
