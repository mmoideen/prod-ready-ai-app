# infra-modules

Reusable, secure-by-default Azure infrastructure modules for the prod-ready-ai-app
platform engineering toolkit. The module set is authored twice, once per IaC tool, with an
**identical parameter contract** so a downstream consumer can pick either implementation
without changing how the module is called:

- `infra-modules/bicep/`: Bicep modules (this subtree)
- `infra-modules/terraform/`: Terraform modules (authored separately, same modules and
  parameter contract, standard `main.tf` / `variables.tf` / `outputs.tf` layout per module)

Both toolchains currently ship the same three modules:

| Module | Bicep path | Terraform path | Resource(s) |
|---|---|---|---|
| Key Vault | `bicep/keyvault/main.bicep` | `terraform/keyvault/` | `Microsoft.KeyVault/vaults` |
| Monitoring | `bicep/monitoring/main.bicep` | `terraform/monitoring/` | `Microsoft.OperationalInsights/workspaces`, `Microsoft.Insights/components` |
| PostgreSQL | `bicep/postgres/main.bicep` | `terraform/postgres/` | `Microsoft.DBforPostgreSQL/flexibleServers` (+ `configurations` child) |

## Shared parameter contract

Every module, in both languages, accepts the same four base parameters:

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | string | (required) | Base resource name. Each module derives its actual Azure resource name from this plus a resource-type prefix and the environment. |
| `location` | string | resource group location | Azure region. |
| `environment` | string | (required) | One of `dev`, `test`, `prod`. |
| `tags` | object/map | `{}` | Caller-supplied tags. |

Every module merges the caller-supplied `tags` with two automatic tags, and the automatic
values always win on a key collision:

```text
{
  environment: <the environment parameter>
  managedBy:   "prod-ready-ai-app"
}
```

Beyond these four, each module adds its own parameters (documented in that module's own
README): Key Vault adds `tenantId`, `enableRbacAuthorization`, `enablePurgeProtection`,
`softDeleteRetentionInDays`, `skuName`, `publicNetworkAccess`, `networkAclsDefaultAction`.
Monitoring adds `retentionInDays`. PostgreSQL adds `administratorLogin`,
`administratorLoginPassword`, `postgresVersion`, `skuName`, `skuTier`, `storageSizeGB`,
`backupRetentionDays`, `geoRedundantBackup`, `highAvailabilityMode`.

## How a downstream tool consumes these modules

**Bicep**: copy an environment template (for example from `templates/`) and reference a
module by relative path from wherever that template lives, for example:

```bicep
module keyvault '../../infra-modules/bicep/keyvault/main.bicep' = {
  name: 'deploy-keyvault'
  params: {
    name: 'ai-app'
    environment: 'prod'
  }
}
```

**Terraform**: reference a module by relative path within this repository, or by Git URL
once the repository is published, for example:

```hcl
module "keyvault" {
  source      = "../../infra-modules/terraform/keyvault"
  # source    = "git::https://example.com/prod-ready-ai-app.git//infra-modules/terraform/keyvault?ref=main"
  name        = "ai-app"
  environment = "prod"
}
```

## Validation commands

CI validates every module on GitHub-hosted runners (`az` and `terraform` are provisioned in
the runner image, not assumed to be present on a contributor's machine). Run the same
commands locally before opening a pull request:

```bash
# Bicep, run once per module
az bicep build --file infra-modules/bicep/keyvault/main.bicep
az bicep build --file infra-modules/bicep/monitoring/main.bicep
az bicep build --file infra-modules/bicep/postgres/main.bicep

# Terraform, run once per module directory
terraform -chdir=infra-modules/terraform/keyvault init -backend=false
terraform -chdir=infra-modules/terraform/keyvault validate
terraform fmt -check -recursive infra-modules/terraform
```

Note on how these Bicep files were authored: they were written to compile cleanly on the
first `az bicep build` rather than developed against a live compiler, by pinning known-good
stable apiVersions and keeping syntax conservative. State this assumption explicitly if you
are the one wiring up CI: the very first `az bicep build` run in the pipeline is this
module set's first true compilation gate, treat any failure there as a real bug report, not
a flaky check.

## Security posture

Defaults across all three modules assume a CJIS / FedRAMP style baseline where "secure by
default, opt out deliberately" is the right posture:

- **Identity-first access**: Key Vault defaults to RBAC authorization (`enableRbacAuthorization: true`)
  instead of vault access policies.
- **Irreversible protections on by default**: Key Vault purge protection defaults on.
- **Deny-by-default networking**: Key Vault's network ACL defaults to `Deny` with an
  `AzureServices` bypass.
- **Conservative backup/HA choices for PostgreSQL**: geo-redundant backup and zone-redundant
  HA both default to off, so the baseline module does not silently opt an environment into
  cross-region data placement or a larger cost footprint; turn them on deliberately.
- **No secrets in outputs**: the PostgreSQL module never outputs the administrator password.

What to flip for a real production deployment, on top of these defaults:

1. **Private endpoints everywhere reasonable**: set Key Vault's `publicNetworkAccess` to
   `Disabled` and attach a Private Endpoint from the consuming template (this module set
   deliberately does not create the Private Endpoint or VNet itself, to stay reusable across
   network topologies).
2. **Disable public access on PostgreSQL** at the network layer (VNet-integrated flexible
   server or a Private Endpoint, plus the equivalent firewall/`publicNetworkAccess` posture)
   from the consuming template; this module's parameter contract intentionally does not take
   a networking mode parameter, so this is wired at the consumption layer.
3. **Entra ID authentication on PostgreSQL**: the module provisions password authentication
   only. Layer Microsoft Entra authentication on top in production (an Active Directory
   administrator assignment, then `authConfig.activeDirectoryAuth: 'Enabled'`) instead of
   relying on the password administrator day to day.
4. **Wire diagnostics**: none of the three modules create `Microsoft.Insights/diagnosticSettings`
   resources for themselves. Use the `monitoring` module's `workspaceId` output as the target
   for diagnostic settings on the Key Vault and PostgreSQL server (and on any application
   resources) from the consuming template.

## Module READMEs

- `bicep/keyvault/README.md`
- `bicep/monitoring/README.md`
- `bicep/postgres/README.md`

Each covers that module's parameters, outputs, a copy-ready usage example, and its
validation command.
