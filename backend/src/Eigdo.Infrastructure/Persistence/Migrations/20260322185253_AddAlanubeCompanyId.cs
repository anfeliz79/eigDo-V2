using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Eigdo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAlanubeCompanyId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "alanube_company_id",
                table: "companies",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "alanube_company_id",
                table: "companies");
        }
    }
}
