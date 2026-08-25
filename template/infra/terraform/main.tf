# =====================================================================================
# template/infra/terraform/main.tf
# Purpose: Environment entry point for internal-tool-template. Wires the shared
# infra-modules (Key Vault, Monitoring, PostgreSQL) with sensible dev defaults.
#
# While this file lives inside the prod-ready-ai-app toolkit repository, module
# sources below are relative paths into ../../../infra-modules/terraform/. After
# copying template/ out to a new repository, switch module sources to the git URL
# form, see ../README.md for the exact snippet.
# =====================================================================================

provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "this" {
  name     = "rg-${var.base_name}-${var.environment}"
  location = var.location
  tags     = var.tags
}

module "keyvault" {
  source = "../../../infra-modules/terraform/keyvault"

  name                = var.base_name
  location            = var.location
  environment         = var.environment
  tags                = var.tags
  resource_group_name = azurerm_resource_group.this.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
}

module "monitoring" {
  source = "../../../infra-modules/terraform/monitoring"

  name                = var.base_name
  location            = var.location
  environment         = var.environment
  tags                = var.tags
  resource_group_name = azurerm_resource_group.this.name
}

module "postgres" {
  source = "../../../infra-modules/terraform/postgres"

  name                   = var.base_name
  location               = var.location
  environment            = var.environment
  tags                   = var.tags
  resource_group_name    = azurerm_resource_group.this.name
  administrator_login    = var.postgres_admin_login
  administrator_password = var.postgres_admin_password
}

output "key_vault_uri" {
  value       = module.keyvault.key_vault_uri
  description = "Key Vault URI for app configuration."
}

output "app_insights_connection_string" {
  value       = module.monitoring.app_insights_connection_string
  description = "Application Insights connection string. Wire into APPLICATIONINSIGHTS_CONNECTION_STRING."
  sensitive   = true
}

output "postgres_server_fqdn" {
  value       = module.postgres.server_fqdn
  description = "PostgreSQL server fully qualified domain name."
}
