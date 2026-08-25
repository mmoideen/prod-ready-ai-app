# Key Vault module (Bicep)

Provisions an Azure Key Vault with secure defaults appropriate for CJIS / FedRAMP style
environments: Azure RBAC data-plane authorization, purge protection, and a deny-by-default
network ACL. A matching Terraform module lives at `infra-modules/terraform/keyvault` with an
identical parameter contract.

File: `infra-modules/bicep/keyvault/main.bicep`
Pinned apiVersion: `2023-07-01` (stable GA)

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | string | (required) | Base resource name. Combined with a prefix and the environment to form the vault name. |
| `location` | string | `resourceGroup().location` | Azure region for the vault. |
| `environment` | string | (required) | One of `dev`, `test`, `prod`. Drives the automatic `environment` tag and the name suffix. |
| `tags` | object | `{}` | Caller-supplied tags. Merged with the automatic `environment` and `managedBy` tags; the automatic tags win on key collisions. |
| `tenantId` | string | `subscription().tenantId` | Microsoft Entra tenant that owns the vault. |
| `enableRbacAuthorization` | bool | `true` | Use Azure RBAC role assignments for data-plane access instead of vault access policies. |
| `enablePurgeProtection` | bool | `true` | Blocks permanent purge of a deleted vault before the retention window elapses. Irreversible once enabled. |
| `softDeleteRetentionInDays` | int | `90` (min `7`, max `90`) | Recovery window for deleted vault objects. |
| `skuName` | string | `standard` | Allowed: `standard`, `premium`. `premium` adds HSM-backed keys. |
| `publicNetworkAccess` | string | `Enabled` | Allowed: `Enabled`, `Disabled`. Production should use `Disabled` plus a Private Endpoint. |
| `networkAclsDefaultAction` | string | `Deny` | Allowed: `Allow`, `Deny`. Bypass is fixed to `AzureServices`. |

## Outputs

| Name | Description |
|---|---|
| `keyVaultId` | Resource ID of the vault. |
| `keyVaultName` | Deployed vault name (after truncation, see Naming below). |
| `keyVaultUri` | `properties.vaultUri`, for example `https://<name>.vault.azure.net/`. |

## Naming

Pattern: `kv-<name>-<environment>`, lower-cased, truncated to 24 characters with `take()`
(Key Vault's hard length ceiling), with a small guard that trims a trailing hyphen left by
truncation. Keep `name` short (15 characters or fewer is a safe rule of thumb) so the
pattern does not truncate ambiguously, and remember vault names must be globally unique
across Azure, not just within the subscription.

## Security posture

- **RBAC over access policies**: `enableRbacAuthorization` defaults to `true` so permissions
  are granted (and audited) through Azure role assignments, not an unaudited policy list on
  the vault itself.
- **Purge protection on by default**: protects against both accidental and malicious
  permanent deletion. This cannot be turned off again once a vault has it enabled, so treat
  it as a one-way decision.
- **Deny-by-default networking**: `networkAclsDefaultAction` defaults to `Deny` with
  `bypass: AzureServices`. For production, also set `publicNetworkAccess` to `Disabled` and
  add a Private Endpoint; this module does not create the Private Endpoint or the VNet it
  attaches to, that is left to the consuming template so this module stays reusable across
  network topologies.
- **TLS**: Key Vault enforces TLS 1.2+ at the platform level. Unlike storage accounts, the
  `Microsoft.KeyVault/vaults` resource has no `minimumTlsVersion` property to set, so none is
  exposed here.
- **Diagnostics**: this module intentionally does not create a `Microsoft.Insights/diagnosticSettings`
  resource, to keep the parameter contract identical to the Terraform module. Wire vault
  diagnostics to the `monitoring` module's `workspaceId` output from the consuming template.

## Usage example

```bicep
// envs/prod/main.bicep
module keyvault '../../infra-modules/bicep/keyvault/main.bicep' = {
  name: 'deploy-keyvault'
  params: {
    name: 'ai-app'
    environment: 'prod'
    tags: {
      costCenter: 'platform-eng'
    }
    publicNetworkAccess: 'Disabled' // production: pair with a Private Endpoint
  }
}

output keyVaultUri string = keyvault.outputs.keyVaultUri
```

## Validation

```bash
az bicep build --file infra-modules/bicep/keyvault/main.bicep
```

CI runs this command (and the equivalent for every module) on GitHub-hosted runners. This
file was compiled locally with Bicep CLI 0.46.1 during authoring and produced zero errors
and zero warnings; CI is still the source of truth going forward.
