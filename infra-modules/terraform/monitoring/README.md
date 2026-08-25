# terraform/monitoring

## Purpose

Creates an `azurerm_log_analytics_workspace` and a workspace-based `azurerm_application_insights`
component, wired together so all telemetry lands in a single queryable workspace. Pairs with the
`bicep/monitoring` sibling module, which exposes an identical parameter contract for teams that
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

- `azurerm_log_analytics_workspace` uses the argument name `sku` (not `sku_name`, which most other
  azurerm resources use). This module hardcodes `sku = "PerGB2018"` as required by the deliverable
  spec; confirmed current for azurerm ~> 4.0.
- `azurerm_application_insights.workspace_id` must reference the Log Analytics Workspace's ARM
  resource ID (`azurerm_log_analytics_workspace.this.id`) to opt into workspace-based Application
  Insights, which is the current, non-legacy resource model. This is distinct from the workspace
  resource's own `workspace_id` attribute, which is the Customer ID GUID, exposed by this module as
  the `workspace_customer_id` output. See `main.tf` for the exact wiring.
- `connection_string` and `instrumentation_key` are marked `sensitive` by the azurerm provider
  schema itself; Terraform requires module outputs derived from them to also set
  `sensitive = true`, which this module does.

## Inputs

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | n/a | Base resource name used to construct the workspace name (`log-<name>-<environment>`) and the Application Insights name (`appi-<name>-<environment>`). |
| `location` | `string` | n/a | Azure region, for example `eastus`. Required with no default because the azurerm provider cannot derive location from a deployment scope. |
| `environment` | `string` | n/a | Deployment environment. Must be `dev`, `test`, or `prod`. |
| `tags` | `map(string)` | `{}` | Additional resource tags merged with the module's standard tags (`environment`, `managedBy`). |
| `resource_group_name` | `string` | n/a | Name of the existing resource group to deploy into. |
| `retention_in_days` | `number` | `30` | Log Analytics Workspace data retention. Must be `30`-`730`. |

## Outputs

| Name | Sensitive | Description |
| --- | --- | --- |
| `workspace_id` | no | ARM resource ID of the Log Analytics Workspace. |
| `workspace_name` | no | Name of the Log Analytics Workspace. |
| `workspace_customer_id` | no | Log Analytics Workspace Customer ID (GUID); shown as "Workspace ID" in the Azure portal. |
| `app_insights_id` | no | ARM resource ID of the Application Insights component. |
| `app_insights_name` | no | Name of the Application Insights component. |
| `app_insights_connection_string` | yes | Application Insights connection string. |
| `app_insights_instrumentation_key` | yes | Legacy Application Insights instrumentation key. |

## Usage

```hcl
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "example" {
  name     = "rg-example-dev"
  location = "eastus"
}

module "monitoring" {
  # Local path, relative to a caller under the repository root:
  source = "../../infra-modules/terraform/monitoring"

  # Or a git source:
  # source = "git::https://github.com/mmoideen/prod-ready-ai-app.git//infra-modules/terraform/monitoring?ref=main"

  name                = "myapp"
  location            = azurerm_resource_group.example.location
  environment         = "dev"
  resource_group_name = azurerm_resource_group.example.name

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
