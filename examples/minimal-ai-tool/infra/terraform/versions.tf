# examples/minimal-ai-tool: infrastructure entry point (Terraform)
# This is the root module, so (unlike infra-modules/terraform/*, which
# deliberately contain no provider block) it is responsible for the azurerm
# provider configuration. See ../README.md for the relative path vs git URL
# sourcing note.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}
