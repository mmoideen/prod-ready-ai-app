# Monitoring module (Bicep)

Provisions the shared observability backend for a workload: a Log Analytics workspace and a
workspace-based Application Insights component. This is the diagnostics target other
modules (and the workloads that consume them) send logs, metrics, and traces to. A matching
Terraform module lives at `infra-modules/terraform/monitoring` with an identical parameter
contract.

File: `infra-modules/bicep/monitoring/main.bicep`
Pinned apiVersions: `Microsoft.OperationalInsights/workspaces@2023-09-01` (stable GA),
`Microsoft.Insights/components@2020-02-02` (stable GA; still the correct apiVersion for
workspace-based Application Insights, the `WorkspaceResourceId` and `IngestionMode`
properties on this apiVersion are what switch it from classic to workspace-based mode).

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | string | (required) | Base resource name. Combined with a prefix and the environment to form the workspace and Application Insights names. |
| `location` | string | `resourceGroup().location` | Azure region for both resources. |
| `environment` | string | (required) | One of `dev`, `test`, `prod`. Drives the automatic `environment` tag and the name suffix. |
| `tags` | object | `{}` | Caller-supplied tags. Merged with the automatic `environment` and `managedBy` tags; the automatic tags win on key collisions. |
| `retentionInDays` | int | `30` (min `30`, max `730`) | Log Analytics data retention window. |

## Outputs

| Name | Description |
|---|---|
| `workspaceId` | Resource ID of the Log Analytics workspace. |
| `workspaceName` | Name of the Log Analytics workspace. |
| `workspaceCustomerId` | Workspace `customerId` (GUID), used by agents/SDKs that authenticate directly against the workspace. |
| `appInsightsId` | Resource ID of the Application Insights component. |
| `appInsightsName` | Name of the Application Insights component. |
| `appInsightsConnectionString` | Application Insights connection string. Not a secret credential, but still configuration data: deliver it through app settings or environment variables, never commit it to source control. |
| `appInsightsInstrumentationKey` | Legacy instrumentation key. Prefer the connection string for new integrations. |

## Naming

Workspace: `log-<name>-<environment>`, Application Insights: `appi-<name>-<environment>`,
both lower-cased and truncated to 63 characters with `take()` (Log Analytics workspace
names are capped at 63 characters; Application Insights names have a much higher ceiling,
but the same truncation is applied for a consistent, predictable naming convention across
the module set).

## Security posture

- **Workspace-based Application Insights**: telemetry is stored in the Log Analytics
  workspace rather than a separate classic Application Insights store, so there is a single
  place to apply retention, access control, and query.
- **Diagnostics target for the rest of the toolkit**: the `workspaceId` output is the
  intended `workspaceId` argument for `Microsoft.Insights/diagnosticSettings` resources on
  the `keyvault` and `postgres` modules, and on any application resources the consuming
  template deploys. This module does not create those diagnostic settings itself, so it
  stays decoupled from what it monitors and keeps its own parameter contract minimal.
- **Retention**: defaults to 30 days; raise `retentionInDays` for environments with longer
  audit or compliance retention requirements (up to 730 days).

## Usage example

```bicep
// envs/prod/main.bicep
module monitoring '../../infra-modules/bicep/monitoring/main.bicep' = {
  name: 'deploy-monitoring'
  params: {
    name: 'ai-app'
    environment: 'prod'
    retentionInDays: 90
  }
}

output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString
```

## Validation

```bash
az bicep build --file infra-modules/bicep/monitoring/main.bicep
```

CI runs this command (and the equivalent for every module) on GitHub-hosted runners. This
file was compiled locally with Bicep CLI 0.46.1 during authoring and produced zero errors
and zero warnings; CI is still the source of truth going forward.
