# Shared contract (parity with the bicep/postgres sibling module): name, location, environment,
# tags. resource_group_name is added to the terraform contract because azurerm resources have no
# implicit deployment scope; the bicep module derives its scope from the deployment instead.

variable "name" {
  type        = string
  description = "Base resource name used to construct the PostgreSQL Flexible Server name (\"psql-<name>-<environment>\", lowercased and truncated to 63 characters)."
}

variable "location" {
  type        = string
  description = "Azure region where the server will be created, for example \"eastus\". Required with no default: unlike the bicep sibling module, the azurerm provider cannot derive a location from the deployment scope, so callers must supply one explicitly."
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
  description = "Name of the existing resource group in which to create the server. Required because azurerm resources have no implicit scope; the bicep sibling module derives its scope from the deployment instead."
}

variable "administrator_login" {
  type        = string
  description = "Administrator login name for the PostgreSQL Flexible Server. Cannot be changed after the server is created."
}

variable "administrator_password" {
  type        = string
  sensitive   = true
  description = "Administrator login password for the PostgreSQL Flexible Server. The azurerm provider also marks this attribute sensitive. Never emitted as a module output; supply it via a secrets pipeline (for example a Key Vault reference), not a plain .tfvars file."
}

variable "postgres_version" {
  type        = string
  default     = "16"
  description = "PostgreSQL major version. Must be one of 14, 15, 16."

  validation {
    condition     = contains(["14", "15", "16"], var.postgres_version)
    error_message = "postgres_version must be one of: 14, 15, 16."
  }
}

variable "sku_name" {
  type        = string
  default     = "B_Standard_B1ms"
  description = "Compute SKU in azurerm's tier-prefixed format \"<tier>_<VM size>\", for example B_Standard_B1ms (Burstable), GP_Standard_D2s_v3 (General Purpose), or MO_Standard_E4s_v3 (Memory Optimized). The bicep sibling module instead uses the bare ARM SKU name (for example \"Standard_B1ms\") plus a separate tier property; this module's default B_Standard_B1ms is the azurerm equivalent of bicep's Standard_B1ms with tier Burstable."
}

variable "storage_mb" {
  type        = number
  default     = 32768
  description = "Provisioned storage in mebibytes (MiB). Note the unit difference from the bicep sibling module, which expresses storage in gigabytes (storageGB); 32768 MiB here corresponds to bicep's 32 GB. Must be one of the storage tiers documented for Azure Database for PostgreSQL Flexible Server."

  validation {
    condition = contains([
      32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, 33553408
    ], var.storage_mb)
    error_message = "storage_mb must be one of the documented Flexible Server storage tiers (MiB): 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, 33553408. This list is not enforced by the azurerm provider schema itself (storage_mb is a plain number there); reconcile it against current Azure documentation before relying on it, since Azure periodically adds tiers."
  }
}

variable "backup_retention_days" {
  type        = number
  default     = 7
  description = "Number of days backups are retained. Must be between 7 and 35."

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "backup_retention_days must be between 7 and 35."
  }
}

variable "geo_redundant_backup_enabled" {
  type        = bool
  default     = false
  description = "Enables geo-redundant backup storage. Cannot be changed after the server is created."
}

variable "zone" {
  type        = string
  default     = null
  description = "Availability zone for the primary server instance, for example \"1\", \"2\", or \"3\". Optional; leave null to let Azure choose a zone automatically."
}

variable "high_availability_mode" {
  type        = string
  default     = null
  description = "High availability mode for the server. Leave null to disable HA (default), or set to ZoneRedundant or SameZone to provision a standby replica via a dynamic high_availability block in main.tf."

  validation {
    condition     = var.high_availability_mode == null || contains(["ZoneRedundant", "SameZone"], var.high_availability_mode)
    error_message = "high_availability_mode must be null, ZoneRedundant, or SameZone."
  }
}
