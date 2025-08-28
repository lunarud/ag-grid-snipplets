using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Text.Json.Serialization;

namespace YourApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeesController : ControllerBase
    {
        private readonly IEmployeeDataService _employeeDataService;

        public EmployeesController(IEmployeeDataService employeeDataService)
        {
            _employeeDataService = employeeDataService;
        }

        [HttpPost("serverside")]
        public async Task<IActionResult> GetServerSideData([FromBody] ServerSideRequest request)
        {
            try
            {
                var response = await _employeeDataService.GetServerSideDataAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    // Request/Response DTOs
    public class ServerSideRequest
    {
        public int StartRow { get; set; }
        public int EndRow { get; set; }
        public List<SortModel> SortModel { get; set; } = new();
        public Dictionary<string, object> FilterModel { get; set; } = new();
        public List<string> GroupKeys { get; set; } = new();
    }

    public class SortModel
    {
        public string ColId { get; set; } = string.Empty;
        public string Sort { get; set; } = string.Empty; // "asc" or "desc"
    }

    public class ServerSideResponse
    {
        public List<Dictionary<string, object>> Data { get; set; } = new();
        public int TotalRows { get; set; }
    }

    // Data Service Interface
    public interface IEmployeeDataService
    {
        Task<ServerSideResponse> GetServerSideDataAsync(ServerSideRequest request);
        Task<DataTable> GetEmployeeDataTableAsync();
    }

    // Data Service Implementation
    public class EmployeeDataService : IEmployeeDataService
    {
        private readonly IConfiguration _configuration;
        private readonly string _connectionString;

        public EmployeeDataService(IConfiguration configuration)
        {
            _configuration = configuration;
            _connectionString = _configuration.GetConnectionString("DefaultConnection") ?? "";
        }

        public async Task<ServerSideResponse> GetServerSideDataAsync(ServerSideRequest request)
        {
            var dataTable = await GetEmployeeDataTableAsync();
            
            // Apply filters
            var filteredTable = ApplyFilters(dataTable, request.FilterModel);
            
            // Apply sorting
            var sortedTable = ApplySorting(filteredTable, request.SortModel);
            
            // Get total count after filtering
            var totalRows = sortedTable.Rows.Count;
            
            // Apply paging
            var pagedData = ApplyPaging(sortedTable, request.StartRow, request.EndRow);
            
            // Convert DataTable to List of dictionaries
            var data = ConvertDataTableToList(pagedData);

            return new ServerSideResponse
            {
                Data = data,
                TotalRows = totalRows
            };
        }

        public async Task<DataTable> GetEmployeeDataTableAsync()
        {
            // Create sample DataTable - replace with your actual data source
            var dataTable = new DataTable();
            
            // Define columns
            dataTable.Columns.Add("id", typeof(int));
            dataTable.Columns.Add("name", typeof(string));
            dataTable.Columns.Add("email", typeof(string));
            dataTable.Columns.Add("department", typeof(string));
            dataTable.Columns.Add("salary", typeof(decimal));
            dataTable.Columns.Add("joinDate", typeof(DateTime));
            dataTable.Columns.Add("isActive", typeof(bool));

            // Add sample data - replace with your actual data loading logic
            await Task.Run(() =>
            {
                var random = new Random();
                var departments = new[] { "Engineering", "Sales", "Marketing", "HR", "Finance" };
                var names = new[] { "John Smith", "Jane Doe", "Bob Johnson", "Alice Brown", "Charlie Wilson", 
                                  "Diana Davis", "Frank Miller", "Grace Lee", "Henry Taylor", "Ivy Chen" };

                for (int i = 1; i <= 10000; i++) // Large dataset for testing
                {
                    var name = names[random.Next(names.Length)];
                    var email = $"{name.Replace(" ", ".").ToLower()}@company.com";
                    var department = departments[random.Next(departments.Length)];
                    var salary = random.Next(40000, 150000);
                    var joinDate = DateTime.Now.AddDays(-random.Next(1, 3650));
                    var isActive = random.Next(0, 2) == 1;

                    dataTable.Rows.Add(i, name, email, department, salary, joinDate, isActive);
                }
            });

            return dataTable;
        }

        private DataTable ApplyFilters(DataTable dataTable, Dictionary<string, object> filterModel)
        {
            if (filterModel == null || !filterModel.Any())
                return dataTable;

            var filteredTable = dataTable.Clone();

            foreach (DataRow row in dataTable.Rows)
            {
                bool includeRow = true;

                foreach (var filter in filterModel)
                {
                    var columnName = filter.Key;
                    var filterValue = filter.Value;

                    if (!dataTable.Columns.Contains(columnName))
                        continue;

                    // Simple text filter implementation
                    if (filterValue is string textFilter && !string.IsNullOrEmpty(textFilter))
                    {
                        var cellValue = row[columnName]?.ToString() ?? "";
                        if (!cellValue.Contains(textFilter, StringComparison.OrdinalIgnoreCase))
                        {
                            includeRow = false;
                            break;
                        }
                    }
                }

                if (includeRow)
                    filteredTable.ImportRow(row);
            }

            return filteredTable;
        }

        private DataTable ApplySorting(DataTable dataTable, List<SortModel> sortModel)
        {
            if (sortModel == null || !sortModel.Any())
                return dataTable;

            var sortExpressions = sortModel
                .Where(s => dataTable.Columns.Contains(s.ColId))
                .Select(s => $"{s.ColId} {(s.Sort.ToUpper() == "DESC" ? "DESC" : "ASC")}")
                .ToArray();

            if (sortExpressions.Any())
            {
                var sortedRows = dataTable.Select("", string.Join(", ", sortExpressions));
                var sortedTable = dataTable.Clone();
                
                foreach (var row in sortedRows)
                    sortedTable.ImportRow(row);
                
                return sortedTable;
            }

            return dataTable;
        }

        private DataTable ApplyPaging(DataTable dataTable, int startRow, int endRow)
        {
            var pagedTable = dataTable.Clone();
            var pageSize = endRow - startRow;
            
            for (int i = startRow; i < Math.Min(endRow, dataTable.Rows.Count); i++)
            {
                pagedTable.ImportRow(dataTable.Rows[i]);
            }

            return pagedTable;
        }

        private List<Dictionary<string, object>> ConvertDataTableToList(DataTable dataTable)
        {
            var list = new List<Dictionary<string, object>>();

            foreach (DataRow row in dataTable.Rows)
            {
                var dict = new Dictionary<string, object>();
                
                foreach (DataColumn column in dataTable.Columns)
                {
                    var value = row[column];
                    dict[column.ColumnName] = value == DBNull.Value ? null : value;
                }
                
                list.Add(dict);
            }

            return list;
        }
    }
}

// Startup.cs or Program.cs configuration
public void ConfigureServices(IServiceCollection services)
{
    services.AddControllers();
    services.AddHttpClient();
    
    // Register the data service
    services.AddScoped<IEmployeeDataService, EmployeeDataService>();
    
    // Configure CORS if needed
    services.AddCors(options =>
    {
        options.AddDefaultPolicy(builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
    });
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    if (env.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }

    app.UseRouting();
    app.UseCors();
    app.UseAuthorization();

    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
    });
}
