locals {
  tags = merge(var.tags, {
    environment = var.environment
    managedBy   = "prod-ready-ai-app"
  })

  workspace_name    = "log-${var.name}-${var.environment}"
  app_insights_name = "appi-${var.name}-${var.environment}"
}

# azurerm 4.x naming note (verified against the azurerm ~> 4.0 provider schema): the Log Analytics
# Workspace pricing tier argument is named "sku" on this resource, not "sku_name" as used by most
# other azurerm resources. This is intentional and confirmed current for azurerm ~> 4.0.
resource "azurerm_log_analytics_workspace" "this" {
  name                = local.workspace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.retention_in_days
  tags                = local.tags
}

# Workspace-based Application Insights. workspace_id below must reference the Log Analytics
# Workspace's ARM resource ID (azurerm_log_analytics_workspace.this.id), not the workspace's own
# "workspace_id" attribute, which is the Customer ID GUID exposed separately by this module as the
# workspace_customer_id output.
resource "azurerm_application_insights" "this" {
  name                = local.app_insights_name
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.this.id
  application_type    = "web"
  tags                = local.tags
}
