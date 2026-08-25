output "workspace_id" {
  value       = azurerm_log_analytics_workspace.this.id
  description = "ARM resource ID of the Log Analytics Workspace."
}

output "workspace_name" {
  value       = azurerm_log_analytics_workspace.this.name
  description = "Name of the Log Analytics Workspace."
}

output "workspace_customer_id" {
  value       = azurerm_log_analytics_workspace.this.workspace_id
  description = "Log Analytics Workspace Customer ID (GUID), shown as \"Workspace ID\" in the Azure portal. Distinct from the ARM resource ID returned by the workspace_id output above."
}

output "app_insights_id" {
  value       = azurerm_application_insights.this.id
  description = "ARM resource ID of the Application Insights component."
}

output "app_insights_name" {
  value       = azurerm_application_insights.this.name
  description = "Name of the Application Insights component."
}

output "app_insights_connection_string" {
  value       = azurerm_application_insights.this.connection_string
  sensitive   = true
  description = "Connection string used by the Application Insights SDK to send telemetry. Marked sensitive; the azurerm provider itself flags this attribute as sensitive, so it must be handled via a secrets pipeline rather than plain state or CI logs."
}

output "app_insights_instrumentation_key" {
  value       = azurerm_application_insights.this.instrumentation_key
  sensitive   = true
  description = "Legacy instrumentation key for Application Insights. Marked sensitive; prefer app_insights_connection_string for new integrations."
}
