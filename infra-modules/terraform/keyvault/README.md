# terraform/keyvault

## Purpose

Creates an `azurerm_key_vault` with secure defaults appropriate for CJIS / FedRAMP style
workloads: RBAC authorization, purge protection, a 90 day soft-delete retention window, and a
deny-by-default network ACL with a bypass for trusted Azure services. Pairs with the
`bicep/keyvault` sibling module, which exposes an identical parameter contract for teams that
deploy the same platform with either tool.

## Requirements

| Name | Version |
| --- | --- |
| Terraform | >= 1.5.0 |
| azurerm provider | ~> 4.0 |

This module contains no `provider` block. The calling root module must configure the `azurerm`
provider (including `features {}` and authentication); this is the standard, composable pattern
for reusable Terraform modules and lets callers control provider aliasing, subscription targeting,
and credentials centrally.

## azurerm 4.x notes

- The Key Vault RBAC toggle is set using the `rbac_authorization_enabled` resource argument, not
  the older `enable_rbac_authorization` argument. Both exist on the azurerm ~> 4.0 provider schema,
  but `enable_rbac_authorization` is deprecated (removal planned for provider v5.0). This module's
  own input variable is still named `enable_rbac_authorization` to keep parity with the bicep
  sibling module's parameter contract; it is simply mapped to the current resource argument
  internally. See `main.tf`.
- `public_network_access_enabled` and `purge_protection_enabled` are current, unrenamed argument
  names on azurerm ~> 4.0.

## Inputs

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | n/a | Base resource name used to construct the Key Vault name (`kv-<name>-<environment>`, truncated to 24 characters). |
| `location` | `string` | n/a | Azure region, for example `eastus`. Required with no default because the azurerm provider cannot derive location from a deployment scope. |
| `environment` | `string` | n/a | Deployment environment. Must be `dev`, `test`, or `prod`. |
| `tags` | `map(string)` | `{}` | Additional resource tags merged with the module's standard tags (`environment`, `managedBy`). |
| `resource_group_name` | `string` | n/a | Name of the existing resource group to deploy into. |
| `tenant_id` | `string` | n/a | Azure AD tenant ID. Callers typically pass `data.azurerm_client_config.current.tenant_id`. |
| `enable_rbac_authorization` | `bool` | `true` | Enables Azure RBAC for data-plane authorization instead of access policies. |
| `purge_protection_enabled` | `bool` | `true` | Enables purge protection. Cannot be disabled once enabled on a given vault. |
| `soft_delete_retention_days` | `number` | `90` | Soft-delete retention window. Must be `7`-`90`. |
| `sku_name` | `string` | `"standard"` | Key Vault SKU. Must be `standard` or `premium`. |
| `public_network_access_enabled` | `bool` | `true` | Allows public network reachability, subject to the network ACL. Production should set this to `false` and use Private Endpoints. |
| `network_acls_default_action` | `string` | `"Deny"` | Default network ACL action. Must be `Allow` or `Deny`; the `network_acls` block always bypasses `AzureServices`. |

## Outputs

| Name | Sensitive | Description |
| --- | --- | --- |
| `key_vault_id` | no | ARM resource ID of the Key Vault. |
| `key_vault_name` | no | Name of the Key Vault. |
| `key_vault_uri` | no | Vault URI (`vault_uri`) used by clients and Azure SDKs. |

## Usage

```hcl
provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "example" {
  name     = "rg-example-dev"
  location = "eastus"
}

module "keyvault" {
  # Local path, relative to a caller under the repository root:
  source = "../../infra-modules/terraform/keyvault"

  # Or a git source:
  # source = "git::https://github.com/mmoideen/prod-ready-ai-app.git//infra-modules/terraform/keyvault?ref=main"

  name                = "myapp"
  location            = azurerm_resource_group.example.location
  environment         = "dev"
  resource_group_name = azurerm_resource_group.example.name
  tenant_id           = data.azurerm_client_config.current.tenant_id

  tags = {
    project = "prod-ready-ai-app"
  }
}
```

## Validation

Run from within this module directory:

```bash
terraform init -backend=false
terraform validate
terraform fmt -check
```
