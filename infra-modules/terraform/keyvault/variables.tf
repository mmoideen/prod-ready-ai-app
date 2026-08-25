# Shared contract (parity with the bicep/keyvault sibling module): name, location, environment,
# tags. resource_group_name is added to the terraform contract because azurerm resources have no
# implicit deployment scope; the bicep module derives its scope from the deployment instead.

variable "name" {
  type        = string
  description = "Base resource name used to construct the Key Vault name (\"kv-<name>-<environment>\", truncated to 24 characters)."
}

variable "location" {
  type        = string
  description = "Azure region where the Key Vault will be created, for example \"eastus\". Required with no default: unlike the bicep sibling module, the azurerm provider cannot derive a location from the deployment scope, so callers must supply one explicitly."
}

variable "environment" {
  type        = string
  description = "Deployment environment used for naming and tagging."

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be one of: dev, test, prod."
  }
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Additional resource tags merged with the module's standard tags (environment, managedBy)."
}

variable "resource_group_name" {
  type        = string
  description = "Name of the existing resource group in which to create the Key Vault. Required because azurerm resources have no implicit scope; the bicep sibling module derives its scope from the deployment instead."
}

variable "tenant_id" {
  type        = string
  description = "Azure Active Directory tenant ID used by the Key Vault for authentication. Callers typically pass data.azurerm_client_config.current.tenant_id."
}

variable "enable_rbac_authorization" {
  type        = bool
  default     = true
  description = "Enables Azure RBAC for Key Vault data-plane authorization instead of access policies. Module variable name kept as enable_rbac_authorization for parity with the bicep sibling contract; internally this maps to the azurerm resource argument rbac_authorization_enabled, see main.tf for details."
}

variable "purge_protection_enabled" {
  type        = bool
  default     = true
  description = "Enables purge protection so the vault and its contents cannot be permanently deleted before the soft-delete retention period elapses. Secure default for CJIS/FedRAMP style workloads; once enabled it cannot be disabled again on the same vault."
}

variable "soft_delete_retention_days" {
  type        = number
  default     = 90
  description = "Number of days that soft-deleted vaults and objects are retained before permanent deletion. Must be between 7 and 90."

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "soft_delete_retention_days must be between 7 and 90."
  }
}

variable "sku_name" {
  type        = string
  default     = "standard"
  description = "Key Vault pricing tier. Must be standard or premium (premium adds HSM-backed keys)."

  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "sku_name must be one of: standard, premium."
  }
}

variable "public_network_access_enabled" {
  type        = bool
  default     = true
  description = "Allows the Key Vault to be reachable over the public internet, subject to network_acls_default_action and the network_acls block. Production environments should set this to false and use Private Endpoints instead."
}

variable "network_acls_default_action" {
  type        = string
  default     = "Deny"
  description = "Default network ACL action applied when no ip_rules or virtual_network_subnet_ids rule matches. Must be Allow or Deny; Deny is the secure default and is paired with a bypass of AzureServices so trusted Azure services still work."

  validation {
    condition     = contains(["Allow", "Deny"], var.network_acls_default_action)
    error_message = "network_acls_default_action must be one of: Allow, Deny."
  }
}
