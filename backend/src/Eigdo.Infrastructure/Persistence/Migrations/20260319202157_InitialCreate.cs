using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Eigdo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_id = table.Column<string>(type: "text", nullable: true),
                    old_values_json = table.Column<string>(type: "text", nullable: true),
                    new_values_json = table.Column<string>(type: "text", nullable: true),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_audit_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "companies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    rnc = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: true),
                    onboarding_step = table.Column<int>(type: "integer", nullable: false),
                    is_onboarding_complete = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_companies", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "dgii_provinces",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_dgii_provinces", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "dgii_unit_measures",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_dgii_unit_measures", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "plans",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    max_companies = table.Column<int>(type: "integer", nullable: false),
                    included_documents_per_month = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_plans", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    email_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    email_confirmation_token = table.Column<string>(type: "text", nullable: true),
                    email_confirmation_token_expires_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    password_reset_token = table.Column<string>(type: "text", nullable: true),
                    password_reset_token_expires_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    last_login_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "billing_accounts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stripe_customer_id = table.Column<string>(type: "text", nullable: true),
                    azul_customer_id = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_billing_accounts", x => x.id);
                    table.ForeignKey(
                        name: "f_k_billing_accounts__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "certificate_stores",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    encrypted_certificate_data = table.Column<byte[]>(type: "bytea", nullable: false),
                    encrypted_password = table.Column<string>(type: "text", nullable: false),
                    subject_name = table.Column<string>(type: "text", nullable: true),
                    issuer_name = table.Column<string>(type: "text", nullable: true),
                    serial_number = table.Column<string>(type: "text", nullable: true),
                    valid_from_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    valid_to_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_certificate_stores", x => x.id);
                    table.ForeignKey(
                        name: "f_k_certificate_stores__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "customer_mappings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_customer_id = table.Column<string>(type: "text", nullable: false),
                    qbo_display_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    rnc = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: true),
                    razon_social_dgii = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    tipo_comprobante = table.Column<int>(type: "integer", nullable: false),
                    provincia_dgii_id = table.Column<int>(type: "integer", nullable: true),
                    municipio_dgii_id = table.Column<int>(type: "integer", nullable: true),
                    excluido = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_customer_mappings", x => x.id);
                    table.ForeignKey(
                        name: "f_k_customer_mappings__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ecf_documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ecf_type = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    encf = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: true),
                    track_id = table.Column<string>(type: "text", nullable: true),
                    qbo_source_type = table.Column<int>(type: "integer", nullable: false),
                    qbo_source_id = table.Column<string>(type: "text", nullable: false),
                    qbo_doc_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    alanube_payload_json = table.Column<string>(type: "text", nullable: true),
                    alanube_response_json = table.Column<string>(type: "text", nullable: true),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    tax_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    retry_count = table.Column<int>(type: "integer", nullable: false),
                    last_retry_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    submitted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accepted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    original_ecf_document_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_ecf_documents", x => x.id);
                    table.ForeignKey(
                        name: "f_k_ecf_documents__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "f_k_ecf_documents_ecf_documents_original_ecf_document_id",
                        column: x => x.original_ecf_document_id,
                        principalTable: "ecf_documents",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "fiscal_settings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    rnc = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: true),
                    razon_social = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    nombre_comercial = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    direccion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    provincia_dgii_id = table.Column<int>(type: "integer", nullable: true),
                    municipio_dgii_id = table.Column<int>(type: "integer", nullable: true),
                    telefono = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    default_income_type = table.Column<int>(type: "integer", nullable: true),
                    default_unit_measure = table.Column<int>(type: "integer", nullable: true),
                    default_good_service_indicator = table.Column<int>(type: "integer", nullable: true),
                    tax_amount_indicator = table.Column<int>(type: "integer", nullable: true),
                    default_no_tax_code_billing_indicator = table.Column<int>(type: "integer", nullable: true),
                    certificate_configured = table.Column<bool>(type: "boolean", nullable: false),
                    certificate_expires_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_fiscal_settings", x => x.id);
                    table.ForeignKey(
                        name: "f_k_fiscal_settings__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "item_overrides",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_item_id = table.Column<string>(type: "text", nullable: false),
                    qbo_item_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    qbo_item_type = table.Column<string>(type: "text", nullable: true),
                    unit_measure_override = table.Column<int>(type: "integer", nullable: true),
                    good_service_indicator_override = table.Column<int>(type: "integer", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_item_overrides", x => x.id);
                    table.ForeignKey(
                        name: "f_k_item_overrides__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "qbo_connections",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    realm_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    access_token_encrypted = table.Column<string>(type: "text", nullable: false),
                    refresh_token_encrypted = table.Column<string>(type: "text", nullable: false),
                    access_token_expires_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    refresh_token_expires_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    last_sync_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_qbo_connections", x => x.id);
                    table.ForeignKey(
                        name: "f_k_qbo_connections__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "qbo_sync_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_type = table.Column<string>(type: "text", nullable: false),
                    entity_id = table.Column<string>(type: "text", nullable: false),
                    operation = table.Column<string>(type: "text", nullable: false),
                    payload_json = table.Column<string>(type: "text", nullable: true),
                    processed = table.Column<bool>(type: "boolean", nullable: false),
                    error = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_qbo_sync_events", x => x.id);
                    table.ForeignKey(
                        name: "f_k_qbo_sync_events__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tax_code_mappings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_tax_code_id = table.Column<string>(type: "text", nullable: false),
                    qbo_tax_code_name = table.Column<string>(type: "text", nullable: false),
                    qbo_tax_rate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    billing_indicator = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_tax_code_mappings", x => x.id);
                    table.ForeignKey(
                        name: "f_k_tax_code_mappings__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vendor_mappings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_vendor_id = table.Column<string>(type: "text", nullable: false),
                    qbo_display_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    rnc = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: true),
                    razon_social_dgii = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    tipo_comprobante = table.Column<int>(type: "integer", nullable: false),
                    provincia_dgii_id = table.Column<int>(type: "integer", nullable: true),
                    municipio_dgii_id = table.Column<int>(type: "integer", nullable: true),
                    retention_itbis_rate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: true),
                    retention_isr_rate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: true),
                    excluido = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_vendor_mappings", x => x.id);
                    table.ForeignKey(
                        name: "f_k_vendor_mappings__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dgii_municipalities",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    province_id = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_dgii_municipalities", x => x.id);
                    table.ForeignKey(
                        name: "f_k_dgii_municipalities__dgii_provinces_province_id",
                        column: x => x.province_id,
                        principalTable: "dgii_provinces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prices",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    interval = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    stripe_id = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_prices", x => x.id);
                    table.ForeignKey(
                        name: "f_k_prices_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "company_users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_company_users", x => x.id);
                    table.ForeignKey(
                        name: "f_k_company_users_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "f_k_company_users_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token = table.Column<string>(type: "text", nullable: false),
                    expires_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_revoked = table.Column<bool>(type: "boolean", nullable: false),
                    replaced_by_token = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_refresh_tokens", x => x.id);
                    table.ForeignKey(
                        name: "f_k_refresh_tokens__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "support_tickets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subject = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    priority = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_support_tickets", x => x.id);
                    table.ForeignKey(
                        name: "f_k_support_tickets__companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "f_k_support_tickets_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_transactions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    billing_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    gateway = table.Column<int>(type: "integer", nullable: false),
                    gateway_transaction_id = table.Column<string>(type: "text", nullable: true),
                    gateway_response = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_payment_transactions", x => x.id);
                    table.ForeignKey(
                        name: "f_k_payment_transactions_billing_accounts_billing_account_id",
                        column: x => x.billing_account_id,
                        principalTable: "billing_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ecf_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ecf_document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_status = table.Column<int>(type: "integer", nullable: false),
                    to_status = table.Column<int>(type: "integer", nullable: false),
                    message = table.Column<string>(type: "text", nullable: true),
                    detail_json = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_ecf_events", x => x.id);
                    table.ForeignKey(
                        name: "f_k_ecf_events_ecf_documents_ecf_document_id",
                        column: x => x.ecf_document_id,
                        principalTable: "ecf_documents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "provider_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ecf_document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    direction = table.Column<string>(type: "text", nullable: false),
                    http_method = table.Column<string>(type: "text", nullable: true),
                    url = table.Column<string>(type: "text", nullable: true),
                    request_json = table.Column<string>(type: "text", nullable: true),
                    response_json = table.Column<string>(type: "text", nullable: true),
                    http_status_code = table.Column<int>(type: "integer", nullable: true),
                    duration_ms = table.Column<long>(type: "bigint", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_provider_messages", x => x.id);
                    table.ForeignKey(
                        name: "f_k_provider_messages_ecf_documents_ecf_document_id",
                        column: x => x.ecf_document_id,
                        principalTable: "ecf_documents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_condition_mappings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    fiscal_settings_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_sales_term_id = table.Column<string>(type: "text", nullable: false),
                    qbo_sales_term_name = table.Column<string>(type: "text", nullable: false),
                    dgii_payment_type = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_payment_condition_mappings", x => x.id);
                    table.ForeignKey(
                        name: "f_k_payment_condition_mappings_fiscal_settings_fiscal_settings_~",
                        column: x => x.fiscal_settings_id,
                        principalTable: "fiscal_settings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_method_mappings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    fiscal_settings_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_payment_method_id = table.Column<string>(type: "text", nullable: false),
                    qbo_payment_method_name = table.Column<string>(type: "text", nullable: false),
                    dgii_payment_method = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_payment_method_mappings", x => x.id);
                    table.ForeignKey(
                        name: "f_k_payment_method_mappings_fiscal_settings_fiscal_settings_id",
                        column: x => x.fiscal_settings_id,
                        principalTable: "fiscal_settings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sequences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    fiscal_settings_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ecf_type = table.Column<int>(type: "integer", nullable: false),
                    range_start = table.Column<long>(type: "bigint", nullable: false),
                    range_end = table.Column<long>(type: "bigint", nullable: false),
                    current_value = table.Column<long>(type: "bigint", nullable: false),
                    due_date_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    alert_threshold = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_sequences", x => x.id);
                    table.ForeignKey(
                        name: "f_k_sequences_fiscal_settings_fiscal_settings_id",
                        column: x => x.fiscal_settings_id,
                        principalTable: "fiscal_settings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "checkout_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    price_id = table.Column<Guid>(type: "uuid", nullable: false),
                    gateway = table.Column<int>(type: "integer", nullable: false),
                    gateway_session_id = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: true),
                    expires_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_checkout_sessions", x => x.id);
                    table.ForeignKey(
                        name: "f_k_checkout_sessions__plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "f_k_checkout_sessions__prices_price_id",
                        column: x => x.price_id,
                        principalTable: "prices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "subscriptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    billing_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    price_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    start_date_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_date_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    trial_end_date_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    current_period_start_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    current_period_end_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    stripe_subscription_id = table.Column<string>(type: "text", nullable: true),
                    documents_emitted_this_period = table.Column<int>(type: "integer", nullable: false),
                    gateway = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_subscriptions", x => x.id);
                    table.ForeignKey(
                        name: "f_k_subscriptions_billing_accounts_billing_account_id",
                        column: x => x.billing_account_id,
                        principalTable: "billing_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "f_k_subscriptions_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "f_k_subscriptions_prices_price_id",
                        column: x => x.price_id,
                        principalTable: "prices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_company_id_created_at_utc",
                table: "audit_logs",
                columns: new[] { "company_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_entity_type_entity_id",
                table: "audit_logs",
                columns: new[] { "entity_type", "entity_id" });

            migrationBuilder.CreateIndex(
                name: "i_x_billing_accounts_company_id",
                table: "billing_accounts",
                column: "company_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "i_x_certificate_stores_company_id",
                table: "certificate_stores",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "i_x_checkout_sessions_plan_id",
                table: "checkout_sessions",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "i_x_checkout_sessions_price_id",
                table: "checkout_sessions",
                column: "price_id");

            migrationBuilder.CreateIndex(
                name: "i_x_company_users_user_id",
                table: "company_users",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_company_users_company_id_user_id",
                table: "company_users",
                columns: new[] { "company_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_mappings_company_id_qbo_customer_id",
                table: "customer_mappings",
                columns: new[] { "company_id", "qbo_customer_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "i_x_dgii_municipalities_province_id",
                table: "dgii_municipalities",
                column: "province_id");

            migrationBuilder.CreateIndex(
                name: "i_x_ecf_documents_original_ecf_document_id",
                table: "ecf_documents",
                column: "original_ecf_document_id");

            migrationBuilder.CreateIndex(
                name: "IX_ecf_documents_company_id_status",
                table: "ecf_documents",
                columns: new[] { "company_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_ecf_documents_encf",
                table: "ecf_documents",
                column: "encf");

            migrationBuilder.CreateIndex(
                name: "IX_ecf_documents_track_id",
                table: "ecf_documents",
                column: "track_id");

            migrationBuilder.CreateIndex(
                name: "i_x_ecf_events_ecf_document_id",
                table: "ecf_events",
                column: "ecf_document_id");

            migrationBuilder.CreateIndex(
                name: "i_x_fiscal_settings_company_id",
                table: "fiscal_settings",
                column: "company_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_overrides_company_id_qbo_item_id",
                table: "item_overrides",
                columns: new[] { "company_id", "qbo_item_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_condition_mappings_fiscal_settings_id_qbo_sales_ter~",
                table: "payment_condition_mappings",
                columns: new[] { "fiscal_settings_id", "qbo_sales_term_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_method_mappings_fiscal_settings_id_qbo_payment_meth~",
                table: "payment_method_mappings",
                columns: new[] { "fiscal_settings_id", "qbo_payment_method_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "i_x_payment_transactions_billing_account_id",
                table: "payment_transactions",
                column: "billing_account_id");

            migrationBuilder.CreateIndex(
                name: "i_x_prices_plan_id",
                table: "prices",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "i_x_provider_messages_ecf_document_id",
                table: "provider_messages",
                column: "ecf_document_id");

            migrationBuilder.CreateIndex(
                name: "i_x_qbo_connections_company_id",
                table: "qbo_connections",
                column: "company_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qbo_sync_events_company_id_processed",
                table: "qbo_sync_events",
                columns: new[] { "company_id", "processed" });

            migrationBuilder.CreateIndex(
                name: "i_x_refresh_tokens_user_id",
                table: "refresh_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_token",
                table: "refresh_tokens",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sequences_fiscal_settings_id_ecf_type_is_active",
                table: "sequences",
                columns: new[] { "fiscal_settings_id", "ecf_type", "is_active" });

            migrationBuilder.CreateIndex(
                name: "i_x_subscriptions_billing_account_id",
                table: "subscriptions",
                column: "billing_account_id");

            migrationBuilder.CreateIndex(
                name: "i_x_subscriptions_plan_id",
                table: "subscriptions",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "i_x_subscriptions_price_id",
                table: "subscriptions",
                column: "price_id");

            migrationBuilder.CreateIndex(
                name: "i_x_support_tickets_company_id",
                table: "support_tickets",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "i_x_support_tickets_user_id",
                table: "support_tickets",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_tax_code_mappings_company_id_qbo_tax_code_id",
                table: "tax_code_mappings",
                columns: new[] { "company_id", "qbo_tax_code_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vendor_mappings_company_id_qbo_vendor_id",
                table: "vendor_mappings",
                columns: new[] { "company_id", "qbo_vendor_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "certificate_stores");

            migrationBuilder.DropTable(
                name: "checkout_sessions");

            migrationBuilder.DropTable(
                name: "company_users");

            migrationBuilder.DropTable(
                name: "customer_mappings");

            migrationBuilder.DropTable(
                name: "dgii_municipalities");

            migrationBuilder.DropTable(
                name: "dgii_unit_measures");

            migrationBuilder.DropTable(
                name: "ecf_events");

            migrationBuilder.DropTable(
                name: "item_overrides");

            migrationBuilder.DropTable(
                name: "payment_condition_mappings");

            migrationBuilder.DropTable(
                name: "payment_method_mappings");

            migrationBuilder.DropTable(
                name: "payment_transactions");

            migrationBuilder.DropTable(
                name: "provider_messages");

            migrationBuilder.DropTable(
                name: "qbo_connections");

            migrationBuilder.DropTable(
                name: "qbo_sync_events");

            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropTable(
                name: "sequences");

            migrationBuilder.DropTable(
                name: "subscriptions");

            migrationBuilder.DropTable(
                name: "support_tickets");

            migrationBuilder.DropTable(
                name: "tax_code_mappings");

            migrationBuilder.DropTable(
                name: "vendor_mappings");

            migrationBuilder.DropTable(
                name: "dgii_provinces");

            migrationBuilder.DropTable(
                name: "ecf_documents");

            migrationBuilder.DropTable(
                name: "fiscal_settings");

            migrationBuilder.DropTable(
                name: "billing_accounts");

            migrationBuilder.DropTable(
                name: "prices");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "companies");

            migrationBuilder.DropTable(
                name: "plans");
        }
    }
}
