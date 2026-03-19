using Eigdo.Infrastructure;
using Eigdo.Worker;
using Serilog;

var builder = Host.CreateApplicationBuilder(args);

// Add environment variables
builder.Configuration.AddEnvironmentVariables();

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "eigdo-worker")
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateLogger();

builder.Services.AddSerilog();

// Infrastructure (PostgreSQL, Redis, HttpClients, services)
builder.Services.AddInfrastructure(builder.Configuration);

// Workers
builder.Services.AddHostedService<EmissionWorker>();
builder.Services.AddHostedService<StatusPollingWorker>();

var host = builder.Build();

Log.Information("eigdo Worker starting");
host.Run();
