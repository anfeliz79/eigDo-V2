using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Eigdo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQboTaxIdToMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "qbo_tax_id",
                table: "vendor_mappings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "qbo_tax_id",
                table: "customer_mappings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "qbo_tax_id",
                table: "vendor_mappings");

            migrationBuilder.DropColumn(
                name: "qbo_tax_id",
                table: "customer_mappings");
        }
    }
}
