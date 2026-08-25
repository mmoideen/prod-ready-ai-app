variable "base_name" {
  type        = string
  default     = "internal-tool-template"
  description = "Base resource name shared by every resource this template deploys."
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

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Additional resource tags applied to every resource this template deploys."
}

variable "postgres_admin_login" {
  type        = string
  default     = "appadmin"
  description = "PostgreSQL administrator login name."
}

variable "postgres_admin_password" {
  type        = string
  sensitive   = true
  description = "PostgreSQL administrator login password. Supply at deploy time, for example TF_VAR_postgres_admin_password from a pipeline secret. Never commit a real value or a .tfvars file containing one."
}
