output "key_vault_id" {
  value       = azurerm_key_vault.this.id
  description = "ARM resource ID of the Key Vault."
}

output "key_vault_name" {
  value       = azurerm_key_vault.this.name
  description = "Name of the Key Vault (may have been truncated to 24 characters by this module)."
}

output "key_vault_uri" {
  value       = azurerm_key_vault.this.vault_uri
  description = "URI used by clients and the Azure SDKs to address the Key Vault, for example https://kv-example-dev.vault.azure.net/."
}
