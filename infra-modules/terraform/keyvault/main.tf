locals {
  tags = merge(var.tags, {
    environment = var.environment
    managedBy   = "prod-ready-ai-app"
  })

  # Key Vault names must be globally unique, 3-24 characters, alphanumeric and hyphens only.
  # This module truncates but does not otherwise sanitize the composed name; callers remain
  # responsible for supplying var.name / var.environment values that keep the result valid.
  vault_name = substr("kv-${var.name}-${var.environment}", 0, 24)
}

# azurerm 4.x naming note (verified against the azurerm ~> 4.0 provider schema): the RBAC toggle
# argument was renamed from enable_rbac_authorization to rbac_authorization_enabled. The old name
# still works in the 4.x series but is deprecated and scheduled for removal in provider v5.0, so
# this module sets the new argument name below while keeping the input variable named
# enable_rbac_authorization for parity with the bicep sibling module's parameter contract.
resource "azurerm_key_vault" "this" {
  name                          = local.vault_name
  location                      = var.location
  resource_group_name           = var.resource_group_name
  tenant_id                     = var.tenant_id
  sku_name                      = var.sku_name
  rbac_authorization_enabled    = var.enable_rbac_authorization
  purge_protection_enabled      = var.purge_protection_enabled
  soft_delete_retention_days    = var.soft_delete_retention_days
  public_network_access_enabled = var.public_network_access_enabled
  tags                          = local.tags

  network_acls {
    default_action = var.network_acls_default_action
    bypass         = "AzureServices"
  }
}
