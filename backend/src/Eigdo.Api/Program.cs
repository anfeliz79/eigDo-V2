using System.Text;
using Eigdo.Infrastructure;
using Eigdo.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add environment variables
builder.Configuration.AddEnvironmentVariables();

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "eigdo-api")
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// Infrastructure (PostgreSQL, Redis, HttpClients)
builder.Services.AddInfrastructure(builder.Configuration);

// Application services
builder.Services.AddScoped<Eigdo.Application.Services.AuthService>();
builder.Services.AddScoped<Eigdo.Application.Services.OnboardingService>();
builder.Services.AddScoped<Eigdo.Application.Services.FiscalSettingsService>();
builder.Services.AddScoped<Eigdo.Application.Services.CustomerMappingService>();
builder.Services.AddScoped<Eigdo.Application.Services.VendorMappingService>();
builder.Services.AddScoped<Eigdo.Application.Services.TaxMappingService>();
builder.Services.AddScoped<Eigdo.Application.Services.ItemOverrideService>();

// Authentication
var jwtSecret = builder.Configuration.GetValue<string>("JWT_SECRET") ?? "development_secret_key_change_in_production_64chars_minimum!!!!!!!!";
var jwtIssuer = builder.Configuration.GetValue<string>("JWT_ISSUER") ?? "eigdo";
var jwtAudience = builder.Configuration.GetValue<string>("JWT_AUDIENCE") ?? "eigdo-clients";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

// CORS
var allowedOrigins = builder.Configuration.GetValue<string>("ALLOWED_ORIGINS")?.Split(',', StringSplitOptions.RemoveEmptyEntries)
    ?? new[] { "http://localhost:3000", "http://localhost:3001", "http://localhost:3002" };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "eigdo API",
        Version = "v1",
        Description = "API for eigdo SaaS — QuickBooks Online to Dominican Republic e-CF (Facturación Electrónica)"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// Health Checks
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetValue<string>("DATABASE_CONNECTION")
        ?? builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Host=localhost;Database=eigdo_dev", name: "postgresql")
    .AddRedis(builder.Configuration.GetValue<string>("REDIS_CONNECTION") ?? "localhost:6379", name: "redis");

var app = builder.Build();

// Middleware pipeline
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoints
app.MapHealthChecks("/health");

app.MapControllers();

// Auto-migrate in development
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<EigdoDbContext>();
    await db.Database.MigrateAsync();
}

Log.Information("eigdo API starting on {Urls}", string.Join(", ", app.Urls));

app.Run();
