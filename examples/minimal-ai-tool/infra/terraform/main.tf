# examples/minimal-ai-tool: infrastructure entry point (Terraform)
# Wires the shared keyvault and monitoring modules from infra-modules/terraform via
# relative module sources. See ../README.md for the relative path vs git URL
# sourcing note.

# Key Vault: holds API_TOKENS (in a real deployment) and, when the Azure OpenAI
# provider is in use, AZURE_OPENAI_API_KEY. See src/auth.ts and
# src/ai/azure-openai.ts for why these stay out of plain environment variables in
# production.
module "keyvault" {
  source = "../../../../infra-modules/terraform/keyvault"

  name                = var.app_name
  location            = var.location
  environment         = var.environment
  resource_group_name = var.resource_group_name
  tenant_id           = var.tenant_id
  tags                = var.tags
}

# Monitoring: Log Analytics workspace + workspace-based Application Insights, the
# diagnostic-settings target and telemetry backend for the structured JSON logs
# src/logger.ts writes on every request.
module "monitoring" {
  source = "../../../../infra-modules/terraform/monitoring"

  name                = var.app_name
  location            = var.location
  environment         = var.environment
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

# infra-modules/terraform/postgres is intentionally NOT consumed here. This tool is
# stateless: it summarizes ticket text on request and keeps no persistent state of
# its own (the in-memory request counters behind GET /api/admin/stats reset on
# restart), so there is no database to provision. See ../README.md.

output "key_vault_uri" {
  value       = module.keyvault.key_vault_uri
  description = "URI used by clients and the Azure SDKs to address the Key Vault."
}

output "app_insights_connection_string" {
  value       = module.monitoring.app_insights_connection_string
  description = "Application Insights connection string. Pass through app settings or environment variables at deploy time; never commit it to source control."
  sensitive   = true
}

output "workspace_id" {
  value       = module.monitoring.workspace_id
  description = "Resource ID of the Log Analytics workspace, for wiring diagnostic settings."
}
