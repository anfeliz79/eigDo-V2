using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Eigdo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportMessagesAndAlanubeConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "f_k_support_tickets__companies_company_id",
                table: "support_tickets");

            migrationBuilder.DropForeignKey(
                name: "f_k_support_tickets_users_user_id",
                table: "support_tickets");

            migrationBuilder.AddColumn<string>(
                name: "system_role",
                table: "users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "user_id",
                table: "support_tickets",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "support_tickets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "priority",
                table: "support_tickets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "company_id",
                table: "support_tickets",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "contact_email",
                table: "support_tickets",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contact_name",
                table: "support_tickets",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "alanube_api_key",
                table: "fiscal_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "alanube_environment",
                table: "fiscal_settings",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "support_ticket_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ticket_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    message = table.Column<string>(type: "text", nullable: false),
                    is_staff_reply = table.Column<bool>(type: "boolean", nullable: false),
                    sender_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    sender_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_support_ticket_messages", x => x.id);
                    table.ForeignKey(
                        name: "f_k_support_ticket_messages_support_tickets_ticket_id",
                        column: x => x.ticket_id,
                        principalTable: "support_tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "f_k_support_ticket_messages_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "i_x_support_ticket_messages_ticket_id",
                table: "support_ticket_messages",
                column: "ticket_id");

            migrationBuilder.CreateIndex(
                name: "i_x_support_ticket_messages_user_id",
                table: "support_ticket_messages",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "f_k_support_tickets__companies_company_id",
                table: "support_tickets",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "f_k_support_tickets_users_user_id",
                table: "support_tickets",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "f_k_support_tickets__companies_company_id",
                table: "support_tickets");

            migrationBuilder.DropForeignKey(
                name: "f_k_support_tickets_users_user_id",
                table: "support_tickets");

            migrationBuilder.DropTable(
                name: "support_ticket_messages");

            migrationBuilder.DropColumn(
                name: "system_role",
                table: "users");

            migrationBuilder.DropColumn(
                name: "contact_email",
                table: "support_tickets");

            migrationBuilder.DropColumn(
                name: "contact_name",
                table: "support_tickets");

            migrationBuilder.DropColumn(
                name: "alanube_api_key",
                table: "fiscal_settings");

            migrationBuilder.DropColumn(
                name: "alanube_environment",
                table: "fiscal_settings");

            migrationBuilder.AlterColumn<Guid>(
                name: "user_id",
                table: "support_tickets",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "support_tickets",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "priority",
                table: "support_tickets",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "company_id",
                table: "support_tickets",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "f_k_support_tickets__companies_company_id",
                table: "support_tickets",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "f_k_support_tickets_users_user_id",
                table: "support_tickets",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
