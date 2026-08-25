terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

# This module intentionally contains no provider block. Reusable modules should not configure
# providers; the calling root module is responsible for the azurerm provider configuration
# (including features {} and any authentication), per standard Terraform module design.
