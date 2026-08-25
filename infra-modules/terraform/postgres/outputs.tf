# Note: administrator_password is deliberately never exposed as an output of this module.

output "server_id" {
  value       = azurerm_postgresql_flexible_server.this.id
  description = "ARM resource ID of the PostgreSQL Flexible Server."
}

output "server_name" {
  value       = azurerm_postgresql_flexible_server.this.name
  description = "Name of the PostgreSQL Flexible Server (lowercased and possibly truncated to 63 characters by this module)."
}

output "server_fqdn" {
  value       = azurerm_postgresql_flexible_server.this.fqdn
  description = "Fully qualified domain name used to connect to the PostgreSQL Flexible Server."
}
