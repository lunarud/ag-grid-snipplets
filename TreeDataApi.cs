using MongoDB.Driver;
using TreeDataApi.Services;

namespace TreeDataApi
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container
            ConfigureServices(builder.Services, builder.Configuration);

            var app = builder.Build();

            // Configure the HTTP request pipeline
            ConfigurePipeline(app);

            app.Run();
        }

        private static void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            // Add MongoDB
            services.AddSingleton<IMongoClient>(serviceProvider =>
            {
                var connectionString = configuration.GetConnectionString("MongoDB");
                return new MongoClient(connectionString);
            });

            services.AddSingleton<IMongoDatabase>(serviceProvider =>
            {
                var client = serviceProvider.GetService<IMongoClient>();
                var databaseName = configuration.GetValue<string>("DatabaseSettings:DatabaseName");
                return client.GetDatabase(databaseName);
            });

            // Add application services
            services.AddScoped<ITreeDataService, TreeDataService>();

            // Add controllers
            services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                    options.JsonSerializerOptions.WriteIndented = true;
                });

            // Add API documentation
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen();

            // Add CORS for Angular app
            services.AddCors(options =>
            {
                options.AddPolicy("AllowAngularApp",
                    builder =>
                    {
                        builder
                            .WithOrigins("http://localhost:4200", "https://localhost:4200") // Angular dev server
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .AllowCredentials();
                    });
            });

            // Add logging
            services.AddLogging(builder =>
            {
                builder.AddConsole();
                builder.AddDebug();
            });

            // Add health checks
            services.AddHealthChecks()
                .AddMongoDb(configuration.GetConnectionString("MongoDB"), name: "mongodb");
        }

        private static void ConfigurePipeline(WebApplication app)
        {
            // Configure the HTTP request pipeline
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
                app.UseDeveloperExceptionPage();
            }

            app.UseHttpsRedirection();

            // Use CORS
            app.UseCors("AllowAngularApp");

            app.UseAuthorization();

            // Map controllers
            app.MapControllers();

            // Map health checks
            app.MapHealthChecks("/health");

            // Add a simple root endpoint
            app.MapGet("/", () => new
            {
                Application = "Tree Data API",
                Version = "1.0.0",
                Status = "Running",
                Timestamp = DateTime.UtcNow
            });
        }
    }
}

// appsettings.json configuration example
/*
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "MongoDB": "mongodb://localhost:27017"
  },
  "DatabaseSettings": {
    "DatabaseName": "TreeDataDB",
    "CollectionName": "tree_nodes"
  },
  "AllowedHosts": "*"
}
*/
