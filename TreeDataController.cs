using Microsoft.AspNetCore.Mvc;
using TreeDataApi.Models;
using TreeDataApi.Services;

namespace TreeDataApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TreeDataController : ControllerBase
    {
        private readonly ITreeDataService _treeDataService;
        private readonly ILogger<TreeDataController> _logger;

        public TreeDataController(ITreeDataService treeDataService, ILogger<TreeDataController> logger)
        {
            _treeDataService = treeDataService;
            _logger = logger;
        }

        /// <summary>
        /// Get flattened tree data for ag-Grid
        /// </summary>
        [HttpGet("flat")]
        public async Task<ActionResult<ApiResponse<List<FlatTreeNode>>>> GetFlatTreeData()
        {
            try
            {
                var data = await _treeDataService.GetFlattenedTreeAsync();
                
                return Ok(new ApiResponse<List<FlatTreeNode>>
                {
                    Success = true,
                    Data = data,
                    Message = $"Retrieved {data.Count} tree nodes",
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving flattened tree data");
                return StatusCode(500, new ApiResponse<List<FlatTreeNode>>
                {
                    Success = false,
                    Message = "An error occurred while retrieving tree data",
                    Timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Get flattened tree data by parent ID
        /// </summary>
        [HttpGet("flat/parent/{parentId}")]
        public async Task<ActionResult<ApiResponse<List<FlatTreeNode>>>> GetFlatTreeDataByParent(string parentId)
        {
            try
            {
                var data = await _treeDataService.GetFlattenedTreeByParentAsync(parentId);
                
                return Ok(new ApiResponse<List<FlatTreeNode>>
                {
                    Success = true,
                    Data = data,
                    Message = $"Retrieved {data.Count} nodes under parent {parentId}",
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tree data by parent {ParentId}", parentId);
                return StatusCode(500, new ApiResponse<List<FlatTreeNode>>
                {
                    Success = false,
                    Message = "An error occurred while retrieving tree data",
                    Timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Get root nodes only (parentId is null)
        /// </summary>
        [HttpGet("flat/roots")]
        public async Task<ActionResult<ApiResponse<List<FlatTreeNode>>>> GetRootNodes()
        {
            try
            {
                var data = await _treeDataService.GetFlattenedTreeByParentAsync(null);
                
                return Ok(new ApiResponse<List<FlatTreeNode>>
                {
                    Success = true,
                    Data = data,
                    Message = $"Retrieved {data.Count} root nodes",
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving root tree nodes");
                return StatusCode(500, new ApiResponse<List<FlatTreeNode>>
                {
                    Success = false,
                    Message = "An error occurred while retrieving root nodes",
                    Timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Create a new tree node
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<ApiResponse<TreeNode>>> CreateNode([FromBody] TreeNode node)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new ApiResponse<TreeNode>
                    {
                        Success = false,
                        Message = "Invalid node data",
                        Timestamp = DateTime.UtcNow
                    });
                }

                var createdNode = await _treeDataService.CreateNodeAsync(node);
                
                return CreatedAtAction(nameof(GetFlatTreeData), new ApiResponse<TreeNode>
                {
                    Success = true,
                    Data = createdNode,
                    Message = "Node created successfully",
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating tree node");
                return StatusCode(500, new ApiResponse<TreeNode>
                {
                    Success = false,
                    Message = "An error occurred while creating the node",
                    Timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Update an existing tree node
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateNode(string id, [FromBody] TreeNode node)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new ApiResponse<bool>
                    {
                        Success = false,
                        Message = "Invalid node data",
                        Timestamp = DateTime.UtcNow
                    });
                }

                node.Id = id; // Ensure the ID matches the route parameter
                var updated = await _treeDataService.UpdateNodeAsync(id, node);
                
                if (!updated)
                {
                    return NotFound(new ApiResponse<bool>
                    {
                        Success = false,
                        Message = "Node not found",
                        Timestamp = DateTime.UtcNow
                    });
                }

                return Ok(new ApiResponse<bool>
                {
                    Success = true,
                    Data = true,
                    Message = "Node updated successfully",
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating tree node {NodeId}", id);
                return StatusCode(500, new ApiResponse<bool>
                {
                    Success = false,
                    Message = "An error occurred while updating the node",
                    Timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Delete a tree node (soft delete)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteNode(string id)
        {
            try
            {
                var deleted = await _treeDataService.DeleteNodeAsync(id);
                
                if (!deleted)
                {
                    return NotFound(new ApiResponse<bool>
                    {
                        Success = false,
                        Message = "Node not found",
                        Timestamp = DateTime.UtcNow
                    });
                }

                return Ok(new ApiResponse<bool>
                {
                    Success = true,
                    Data = true,
                    Message = "Node deleted successfully",
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting tree node {NodeId}", id);
                return StatusCode(500, new ApiResponse<bool>
                {
                    Success = false,
                    Message = "An error occurred while deleting the node",
                    Timestamp = DateTime.UtcNow
                });
            }
        }
    }

    // API Response wrapper
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T Data { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; }
    }
}
