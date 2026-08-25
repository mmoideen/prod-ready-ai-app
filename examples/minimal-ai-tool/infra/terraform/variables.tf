variable "app_name" {
  type        = string
  default     = "minimal-ai-tool"
  description = "Base resource name used to derive the Key Vault, Log Analytics, and Application Insights names."
}

variable "location" {
  type        = string
  default     = "eastus"
  description = "Azure region for all resources."
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Deployment environment: dev, test, or prod."

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be one of: dev, test, prod."
  }
}

variable "resource_group_name" {
  type        = string
  default     = "rg-minimal-ai-tool-dev"
  description = "Name of the existing resource group in which to create resources."
}

variable "tenant_id" {
  type        = string
  default     = "00000000-0000-0000-0000-000000000000"
  description = "Azure Active Directory tenant ID used by the Key Vault. Placeholder default; override per environment, for example with data.azurerm_client_config.current.tenant_id."
}

variable "tags" {
  type = map(string)
  default = {
    owner = "{{OWNER_NAME}}"
    app   = "minimal-ai-tool"
  }
  description = "Additional resource tags applied to every resource created by this template."
}
