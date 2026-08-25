# terraform/postgres

## Purpose

Creates an `azurerm_postgresql_flexible_server` plus an `azurerm_postgresql_flexible_server_configuration`
that allowlists the `VECTOR` extension on `azure.extensions`, so pgvector is available for
AI/RAG style workloads. Pairs with the `bicep/postgres` sibling module, which exposes an identical
parameter contract for teams that deploy the same platform with either tool.

**pgvector activation is two steps.** This module only allowlists the extension at the server
level. A database administrator or migration job must still connect to each target database and
run `CREATE EXTENSION vector;` before pgvector types and functions become usable there.

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

- `administrator_login`, `administrator_password`, `version`, `sku_name`, `storage_mb`,
  `backup_retention_days`, `geo_redundant_backup_enabled`, `zone`, and the `high_availability`
  block (with a required `mode` attribute) are all current, unrenamed argument names for
  `azurerm_postgresql_flexible_server` on azurerm ~> 4.0.
- `administrator_password` is marked `sensitive` by the azurerm provider schema itself.
- **SKU format differs from bicep.** azurerm uses a tier-prefixed SKU string:
  `<tier>_<VM size>`, for example `B_Standard_B1ms` (Burstable), `GP_Standard_D2s_v3` (General
  Purpose), `MO_Standard_E4s_v3` (Memory Optimized). The bicep sibling module instead sets the bare
  ARM SKU name (for example `Standard_B1ms`) plus a separate `tier` property. This module's default
  `B_Standard_B1ms` is the azurerm equivalent of bicep's `Standard_B1ms` with tier `Burstable`.
- **Storage unit differs from bicep.** This module's `storage_mb` is in mebibytes (MiB); the bicep
  sibling module expresses storage in gigabytes (`storageGB`). `storage_mb = 32768` here
  corresponds to bicep's `32` GB. The allowed value list enforced by this module's `validation`
  block reflects Azure's documented Flexible Server storage tiers at the time of writing and is
  **not** enforced by the azurerm provider schema itself (`storage_mb` is a plain `number` there);
  reconcile the list against current Azure documentation before relying on it in production, since
  Azure periodically adds new tiers.
- `zone` and VNet integration (`delegated_subnet_id` / `private_dns_zone_id`) and
  `public_network_access_enabled` also exist on this resource in azurerm ~> 4.0, but only `zone` is
  part of this module's contract (for parity with bicep). Callers with stricter network isolation
  requirements (recommended for CJIS/FedRAMP style production workloads) should treat VNet
  integration and disabling public network access as a follow-up hardening step, potentially via a
  future module revision or `terraform_override` at the call site.

## Inputs

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | n/a | Base resource name used to construct the server name (`psql-<name>-<environment>`, lowercased and truncated to 63 characters). |
| `location` | `string` | n/a | Azure region, for example `eastus`. Required with no default because the azurerm provider cannot derive location from a deployment scope. |
| `environment` | `string` | n/a | Deployment environment. Must be `dev`, `test`, or `prod`. |
| `tags` | `map(string)` | `{}` | Additional resource tags merged with the module's standard tags (`environment`, `managedBy`). |
| `resource_group_name` | `string` | n/a | Name of the existing resource group to deploy into. |
| `administrator_login` | `string` | n/a | Administrator login name. Immutable after creation. |
| `administrator_password` | `string` | n/a | Administrator password. Sensitive; never emitted as an output. |
| `postgres_version` | `string` | `"16"` | PostgreSQL major version. Must be `14`, `15`, or `16`. |
| `sku_name` | `string` | `"B_Standard_B1ms"` | Compute SKU in `<tier>_<VM size>` format. |
| `storage_mb` | `number` | `32768` | Provisioned storage in MiB. Must be one of the documented Flexible Server storage tiers. |
| `backup_retention_days` | `number` | `7` | Backup retention. Must be `7`-`35`. |
| `geo_redundant_backup_enabled` | `bool` | `false` | Enables geo-redundant backup storage. Immutable after creation. |
| `zone` | `string` | `null` | Availability zone for the primary instance, for example `"1"`. `null` lets Azure choose. |
| `high_availability_mode` | `string` | `null` | `null` disables HA; `ZoneRedundant` or `SameZone` enables a standby replica via a dynamic block. |

## Outputs

| Name | Sensitive | Description |
| --- | --- | --- |
| `server_id` | no | ARM resource ID of the PostgreSQL Flexible Server. |
| `server_name` | no | Name of the PostgreSQL Flexible Server. |
| `server_fqdn` | no | Fully qualified domain name used to connect to the server. |

The administrator password is never output by this module.

## Usage

```hcl
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "example" {
  name     = "rg-example-dev"
  location = "eastus"
}

module "postgres" {
  # Local path, relative to a caller under the repository root:
  source = "../../infra-modules/terraform/postgres"

  # Or a git source:
  # source = "git::https://github.com/mmoideen/prod-ready-ai-app.git//infra-modules/terraform/postgres?ref=main"

  name                   = "myapp"
  location               = azurerm_resource_group.example.location
  environment            = "dev"
  resource_group_name    = azurerm_resource_group.example.name
  administrator_login    = "psqladmin"
  administrator_password = var.postgres_admin_password
  high_availability_mode = "ZoneRedundant"

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
