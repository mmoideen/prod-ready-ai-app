locals {
  tags = merge(var.tags, {
    environment = var.environment
    managedBy   = "prod-ready-ai-app"
  })

  # PostgreSQL Flexible Server names must be lowercase, 3-63 characters, alphanumeric and hyphens.
  server_name = substr(lower("psql-${var.name}-${var.environment}"), 0, 63)
}

# azurerm 4.x accuracy notes (verified against the azurerm ~> 4.0 provider schema):
# administrator_login, administrator_password, version, sku_name, storage_mb,
# backup_retention_days, geo_redundant_backup_enabled, zone, and the high_availability block with
# a required "mode" attribute are all current, unchanged argument names for
# azurerm_postgresql_flexible_server in the 4.x series.
resource "azurerm_postgresql_flexible_server" "this" {
  name                         = local.server_name
  location                     = var.location
  resource_group_name          = var.resource_group_name
  version                      = var.postgres_version
  administrator_login          = var.administrator_login
  administrator_password       = var.administrator_password
  sku_name                     = var.sku_name
  storage_mb                   = var.storage_mb
  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup_enabled
  zone                         = var.zone
  tags                         = local.tags

  dynamic "high_availability" {
    for_each = var.high_availability_mode == null ? [] : [var.high_availability_mode]

    content {
      mode = high_availability.value
    }
  }
}

# Allowlists the pgvector extension at the server level (azure.extensions). This only makes the
# VECTOR extension available for use; a database administrator or migration job must still connect
# to each target database and run "CREATE EXTENSION vector;" before pgvector types and functions
# become usable there.
resource "azurerm_postgresql_flexible_server_configuration" "vector_extension" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "VECTOR"
}
