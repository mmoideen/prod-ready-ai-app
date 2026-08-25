# PostgreSQL Flexible Server module (Bicep)

Provisions an Azure Database for PostgreSQL Flexible Server, with the `pgvector` extension
allow-listed so a DBA can enable it on the target database. A matching Terraform module
lives at `infra-modules/terraform/postgres` with an identical parameter contract.

File: `infra-modules/bicep/postgres/main.bicep`
Pinned apiVersion: `Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview`

`2023-06-01-preview` was chosen deliberately over the newer `2023-12-01-preview`: despite
the name, neither is a GA apiVersion (both carry the `-preview` suffix), and `2023-06-01-preview`
is the version this module's author could confirm the exact resource shape for (`sku`,
`properties.storage`, `properties.backup`, `properties.highAvailability`, and the
`configurations` child resource) with high confidence, matching widely used, known-good
public examples. Re-pin to a later stable/GA apiVersion once it has been confirmed with
`az bicep build` and, ideally, `az deployment group what-if`.

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | string | (required) | Base resource name. Combined with a prefix and the environment to form the server name. |
| `location` | string | `resourceGroup().location` | Azure region for the server. |
| `environment` | string | (required) | One of `dev`, `test`, `prod`. Drives the automatic `environment` tag and the name suffix. |
| `tags` | object | `{}` | Caller-supplied tags. Merged with the automatic `environment` and `managedBy` tags; the automatic tags win on key collisions. |
| `administratorLogin` | string | (required) | PostgreSQL administrator login name. |
| `administratorLoginPassword` | string (`@secure()`) | (required) | PostgreSQL administrator login password. Never pass a literal value in source; supply it from Key Vault or a pipeline secret. |
| `postgresVersion` | string | `16` | Allowed: `14`, `15`, `16`. Maps to the server's `version` property. |
| `skuName` | string | `Standard_B1ms` | Compute SKU name. |
| `skuTier` | string | `Burstable` | Allowed: `Burstable`, `GeneralPurpose`, `MemoryOptimized`. |
| `storageSizeGB` | int | `32` | Provisioned storage size in GB. |
| `backupRetentionDays` | int | `7` (min `7`, max `35`) | Backup retention window. |
| `geoRedundantBackup` | string | `Disabled` | Allowed: `Enabled`, `Disabled`. |
| `highAvailabilityMode` | string | `Disabled` | Allowed: `Disabled`, `ZoneRedundant`, `SameZone`. |

## Outputs

| Name | Description |
|---|---|
| `serverId` | Resource ID of the flexible server. |
| `serverName` | Deployed server name (after truncation, see Naming below). |
| `serverFqdn` | `properties.fullyQualifiedDomainName`, used to connect to the server. |

The administrator password is never emitted as an output.

## Naming

Pattern: `psql-<name>-<environment>`, lower-cased with `toLower()`, truncated to 63
characters with `take()` (the flexible server hard length ceiling), with a small guard that
trims a trailing hyphen left by truncation. Keep `name` reasonably short so the pattern does
not truncate ambiguously.

## pgvector

This module provisions a child `Microsoft.DBforPostgreSQL/flexibleServers/configurations`
resource named `azure.extensions` with `value: VECTOR`. That only allow-lists the extension
at the server level; it does not install it into any database. After deployment, a DBA still
needs to connect to the target database and run:

```sql
CREATE EXTENSION vector;
```

## Security posture

- **Password stays out of outputs**: `administratorLoginPassword` is `@secure()` and is never
  reflected in an output, deployment history redacts secure parameters, but treat it as
  sensitive end to end regardless (Key Vault reference or pipeline secret, not a literal).
- **Backups**: `backupRetentionDays` defaults to 7 days (the minimum) and can go up to 35;
  `geoRedundantBackup` defaults to `Disabled` to avoid unplanned cross-region data residency,
  enable it deliberately once the compliance boundary allows it.
- **High availability**: `highAvailabilityMode` defaults to `Disabled` to keep the baseline
  low-cost. Set it to `ZoneRedundant` for production once the target region and cost are
  confirmed.
- **Entra ID authentication (recommended)**: this module provisions password authentication
  only, to keep the parameter contract free of an external identity dependency. For
  CJIS/FedRAMP-aligned production use, layer Microsoft Entra authentication on top by adding
  an Active Directory administrator assignment and setting `authConfig.activeDirectoryAuth`
  to `Enabled`; that requires a directory object ID that this reusable module intentionally
  does not take as a parameter. See the inline `authConfig` comment in `main.bicep`.
- **Diagnostics**: as with the other modules, wire the server's diagnostic settings to the
  `monitoring` module's `workspaceId` output from the consuming template rather than from
  inside this module.

## Usage example

```bicep
// envs/prod/main.bicep
@secure()
param dbAdminPassword string

module postgres '../../infra-modules/bicep/postgres/main.bicep' = {
  name: 'deploy-postgres'
  params: {
    name: 'ai-app'
    environment: 'prod'
    administratorLogin: 'pgadmin'
    administratorLoginPassword: dbAdminPassword
    highAvailabilityMode: 'ZoneRedundant'
  }
}

output postgresFqdn string = postgres.outputs.serverFqdn
```

## Validation

```bash
az bicep build --file infra-modules/bicep/postgres/main.bicep
```

CI runs this command (and the equivalent for every module) on GitHub-hosted runners. This
file was compiled locally with Bicep CLI 0.46.1 during authoring and produced zero errors
and zero warnings; CI is still the source of truth going forward.
