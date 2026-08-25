# Shared contract (parity with the bicep/monitoring sibling module): name, location, environment,
# tags. resource_group_name is added to the terraform contract because azurerm resources have no
# implicit deployment scope; the bicep module derives its scope from the deployment instead.

variable "name" {
  type        = string
  description = "Base resource name used to construct the Log Analytics Workspace name (\"log-<name>-<environment>\") and the Application Insights name (\"appi-<name>-<environment>\")."
}

variable "location" {
  type        = string
  description = "Azure region where resources will be created, for example \"eastus\". Required with no default: unlike the bicep sibling module, the azurerm provider cannot derive a location from the deployment scope, so callers must supply one explicitly."
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
  description = "Name of the existing resource group in which to create the workspace and Application Insights component. Required because azurerm resources have no implicit scope; the bicep sibling module derives its scope from the deployment instead."
}

variable "retention_in_days" {
  type        = number
  default     = 30
  description = "Number of days the Log Analytics Workspace retains ingested data. Must be between 30 and 730."

  validation {
    condition     = var.retention_in_days >= 30 && var.retention_in_days <= 730
    error_message = "retention_in_days must be between 30 and 730."
  }
}
