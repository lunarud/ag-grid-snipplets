// Services/ITreeService.cs
using TreeApp.Models;

namespace TreeApp.Services
{
    public interface ITreeService
    {
        Task<IEnumerable<TreeNodeDto>> GetTreeAsync(bool includeInactive = false);
        Task<IEnumerable<TreeNodeDto>> GetFlatTreeAsync(bool includeInactive = false);
        Task<TreeNodeDto?> GetNodeWithChildrenAsync(string id);
        Task<IEnumerable<TreeNodeDto>> GetNodePathAsync(string nodeId);
        Task<TreeNodeDto> CreateNodeAsync(CreateTreeNodeRequest request);
        Task<TreeNodeDto> UpdateNodeAsync(string id, UpdateTreeNodeRequest request);
        Task DeleteNodeAsync(string id);
        Task<bool> MoveNodeAsync(MoveNodeRequest request);
        Task<IEnumerable<TreeNodeDto>> SearchNodesAsync(string searchTerm);
    }
}

// Services/TreeService.cs
using AutoMapper;
using TreeApp.Models;

namespace TreeApp.Services
{
    public class TreeService : ITreeService
    {
        private readonly ITreeRepository _repository;
        private readonly IMapper _mapper;

        public TreeService(ITreeRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<TreeNodeDto>> GetTreeAsync(bool includeInactive = false)
        {
            var allNodes = await _repository.GetAllNodesAsync();
            
            if (!includeInactive)
                allNodes = allNodes.Where(n => n.IsActive);

            var nodeDtos = _mapper.Map<List<TreeNodeDto>>(allNodes);
            
            return BuildHierarchy(nodeDtos);
        }

        public async Task<IEnumerable<TreeNodeDto>> GetFlatTreeAsync(bool includeInactive = false)
        {
            var allNodes = await _repository.GetAllNodesAsync();
            
            if (!includeInactive)
                allNodes = allNodes.Where(n => n.IsActive);

            var nodeDtos = _mapper.Map<List<TreeNodeDto>>(allNodes);
            var nodeDict = nodeDtos.ToDictionary(n => n.Id);

            // Enrich with tree properties
            foreach (var node in nodeDtos)
            {
                node.Level = CalculateLevel(node, nodeDict);
                node.Path = CalculatePath(node, nodeDict);
                node.HasChildren = nodeDtos.Any(n => n.ParentId == node.Id);
            }

            return nodeDtos.OrderBy(n => n.Path);
        }

        public async Task<TreeNodeDto?> GetNodeWithChildrenAsync(string id)
        {
            var node = await _repository.GetNodeByIdAsync(id);
            if (node == null) return null;

            var nodeDto = _mapper.Map<TreeNodeDto>(node);
            var children = await _repository.GetNodesByParentIdAsync(id);
            nodeDto.Children = _mapper.Map<List<TreeNodeDto>>(children.Where(c => c.IsActive));
            nodeDto.HasChildren = nodeDto.Children.Any();

            return nodeDto;
        }

        public async Task<IEnumerable<TreeNodeDto>> GetNodePathAsync(string nodeId)
        {
            var path = await _repository.GetNodePathAsync(nodeId);
            return _mapper.Map<List<TreeNodeDto>>(path);
        }

        public async Task<TreeNodeDto> CreateNodeAsync(CreateTreeNodeRequest request)
        {
            var node = _mapper.Map<TreeNode>(request);
            var createdNode = await _repository.CreateNodeAsync(node);
            return _mapper.Map<TreeNodeDto>(createdNode);
        }

        public async Task<TreeNodeDto> UpdateNodeAsync(string id, UpdateTreeNodeRequest request)
        {
            var existingNode = await _repository.GetNodeByIdAsync(id);
            if (existingNode == null)
                throw new ArgumentException($"Node with id {id} not found");

            _mapper.Map(request, existingNode);
            var updatedNode = await _repository.UpdateNodeAsync(existingNode);
            return _mapper.Map<TreeNodeDto>(updatedNode);
        }

        public async Task DeleteNodeAsync(string id)
        {
            await _repository.DeleteNodeAsync(id);
        }

        public async Task<bool> MoveNodeAsync(MoveNodeRequest request)
        {
            return await _repository.MoveNodeAsync(request.NodeId, request.NewParentId, request.NewSortOrder);
        }

        public async Task<IEnumerable<TreeNodeDto>> SearchNodesAsync(string searchTerm)
        {
            var nodes = await _repository.SearchNodesAsync(searchTerm);
            return _mapper.Map<List<TreeNodeDto>>(nodes.Where(n => n.IsActive));
        }

        private List<TreeNodeDto> BuildHierarchy(List<TreeNodeDto> flatNodes)
        {
            var nodeDict = flatNodes.ToDictionary(n => n.Id);
            var rootNodes = new List<TreeNodeDto>();

            foreach (var node in flatNodes)
            {
                node.Level = CalculateLevel(node, nodeDict);
                node.Path = CalculatePath(node, nodeDict);
                node.HasChildren = flatNodes.Any(n => n.ParentId == node.Id);

                if (string.IsNullOrEmpty(node.ParentId))
                {
                    rootNodes.Add(node);
                }
                else if (nodeDict.TryGetValue(node.ParentId, out var parent))
                {
                    parent.Children.Add(node);
                }
            }

            // Sort children recursively
            SortChildrenRecursively(rootNodes);
            return rootNodes;
        }

        private void SortChildrenRecursively(List<TreeNodeDto> nodes)
        {
            foreach (var node in nodes)
            {
                node.Children = node.Children.OrderBy(c => c.SortOrder).ToList();
                SortChildrenRecursively(node.Children);
            }
        }

        private int CalculateLevel(TreeNodeDto node, Dictionary<string, TreeNodeDto> nodeDict)
        {
            if (string.IsNullOrEmpty(node.ParentId)) return 0;
            
            if (nodeDict.TryGetValue(node.ParentId, out var parent))
                return CalculateLevel(parent, nodeDict) + 1;
            
            return 0;
        }

        private string CalculatePath(TreeNodeDto node, Dictionary<string, TreeNodeDto> nodeDict)
        {
            var pathParts = new List<string> { node.Name };
            var current = node;

            while (!string.IsNullOrEmpty(current.ParentId) && nodeDict.TryGetValue(current.ParentId, out var parent))
            {
                pathParts.Insert(0, parent.Name);
                current = parent;
            }

            return string.Join("/", pathParts);
        }
    }
}

// Controllers/TreeController.cs
using Microsoft.AspNetCore.Mvc;
using TreeApp.Models;
using TreeApp.Services;

namespace TreeApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TreeController : ControllerBase
    {
        private readonly ITreeService _treeService;

        public TreeController(ITreeService treeService)
        {
            _treeService = treeService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TreeNodeDto>>> GetTree(
            [FromQuery] bool hierarchical = true, 
            [FromQuery] bool includeInactive = false)
        {
            try
            {
                var result = hierarchical 
                    ? await _treeService.GetTreeAsync(includeInactive)
                    : await _treeService.GetFlatTreeAsync(includeInactive);
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TreeNodeDto>> GetNode(string id)
        {
            try
            {
                var result = await _treeService.GetNodeWithChildrenAsync(id);
                if (result == null)
                    return NotFound($"Node with id {id} not found");

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}/path")]
        public async Task<ActionResult<IEnumerable<TreeNodeDto>>> GetNodePath(string id)
        {
            try
            {
                var result = await _treeService.GetNodePathAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<TreeNodeDto>> CreateNode([FromBody] CreateTreeNodeRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var result = await _treeService.CreateNodeAsync(request);
                return CreatedAtAction(nameof(GetNode), new { id = result.Id }, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TreeNodeDto>> UpdateNode(string id, [FromBody] UpdateTreeNodeRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var result = await _treeService.UpdateNodeAsync(id, request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteNode(string id)
        {
            try
            {
                await _treeService.DeleteNodeAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("move")]
        public async Task<ActionResult> MoveNode([FromBody] MoveNodeRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var success = await _treeService.MoveNodeAsync(request);
                if (!success)
                    return BadRequest("Failed to move node. Check for circular references.");

                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<TreeNodeDto>>> SearchNodes([FromQuery] string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                    return BadRequest("Search term is required");

                var result = await _treeService.SearchNodesAsync(searchTerm);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
