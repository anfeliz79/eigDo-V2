using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Eigdo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQboEmailPhoneToMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "qbo_email",
                table: "vendor_mappings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "qbo_phone",
                table: "vendor_mappings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "qbo_email",
                table: "customer_mappings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "qbo_phone",
                table: "customer_mappings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "qbo_email",
                table: "vendor_mappings");

            migrationBuilder.DropColumn(
                name: "qbo_phone",
                table: "vendor_mappings");

            migrationBuilder.DropColumn(
                name: "qbo_email",
                table: "customer_mappings");

            migrationBuilder.DropColumn(
                name: "qbo_phone",
                table: "customer_mappings");
        }
    }
}
