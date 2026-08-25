# Infrastructure for internal-tool-template

Two equivalent entry points, one per IaC dialect, both wiring the toolkit's shared
`infra-modules/` (Key Vault, Monitoring, PostgreSQL) with dev friendly defaults:

- `bicep/main.bicep`
- `terraform/main.tf` (+ `variables.tf`, `versions.tf`)

Pick one dialect per project. Both provision the same three resources: a Key Vault
(RBAC authorization, purge protection on), a Log Analytics workspace with
workspace-based Application Insights, and a PostgreSQL Flexible Server.

## Module sources: relative path today, published form after you copy this out

Right now, `template/` lives inside the `prod-ready-ai-app` toolkit repository, so
both entry points reference the shared modules by **relative path**:

```
template/infra/bicep/main.bicep       -> ../../../infra-modules/bicep/<module>/main.bicep
template/infra/terraform/main.tf      -> ../../../infra-modules/terraform/<module>
```

That works because `infra-modules/` sits three directories up from
`template/infra/bicep/` (and from `template/infra/terraform/`) in this repository.

**Once you copy `template/` out to the root of a new repository, the relative paths
break**, because `infra-modules/` no longer exists three levels up. Switch the
module sources to one of the forms below.

### Terraform: use a git URL source

Terraform natively supports fetching a module from a subdirectory of a remote git
repository. Change every `source = "../../../infra-modules/terraform/<module>"` to:

```hcl
module "keyvault" {
  source = "git::https://github.com/{{GITHUB_USERNAME}}/prod-ready-ai-app.git//infra-modules/terraform/keyvault?ref=main"
  # ...same inputs as before
}
```

Repeat for the `monitoring` and `postgres` modules, changing only the path after the
double slash. Pin `?ref=main` to a tag or commit SHA once the toolkit publishes
releases, so infrastructure changes are not pulled in silently.

### Bicep: vendor the modules, or publish them to a registry

Bicep has no equivalent to Terraform's `git::` source. It resolves local paths, or
`br:` references to an OCI-backed Bicep/container registry (or a Template Spec).
There are two supported ways to keep consuming `infra-modules/bicep/` after copying
`template/` out:

**Option A: publish to an Azure Container Registry as a Bicep registry module**
(recommended once more than one team consumes the modules), then reference it as:

```bicep
module keyvault 'br:myregistry.azurecr.io/bicep/modules/keyvault:v1' = {
  name: 'deploy-keyvault'
  params: {
    name: baseName
    environment: environment
  }
}
```

Publish with `az bicep publish --file infra-modules/bicep/keyvault/main.bicep --target br:myregistry.azurecr.io/bicep/modules/keyvault:v1`
from the toolkit repository, then repeat per module and bump the tag on every
change you want consumers to pick up.

**Option B: vendor (copy or git submodule) `infra-modules/bicep/` into the new
repository** and keep the relative module paths unchanged. Simpler to start with,
at the cost of manually re-syncing when the toolkit's modules change.

## Dev defaults in this template

- `environment` defaults to `dev`.
- PostgreSQL: `Standard_B1ms` / Burstable tier, 32 GB storage, geo-redundant backup
  and zone-redundant HA both off (see `infra-modules/README.md` for what to flip
  before a real production deployment).
- `postgresAdminPassword` (bicep, `@secure()`) / `postgres_admin_password`
  (terraform, `sensitive = true`) have no default. Supply a real value at deploy
  time only, never commit one.

## Validation commands

Run these locally before opening a pull request; the readiness workflow does not
validate infrastructure syntax, so this is on you and code review.

```bash
# Bicep
az bicep build --file infra/bicep/main.bicep

# Terraform
cd infra/terraform
terraform init -backend=false
terraform validate
terraform fmt -check
```

## Outputs

Both entry points expose the same three outputs: `keyVaultUri` /
`key_vault_uri`, `appInsightsConnectionString` / `app_insights_connection_string`
(sensitive), and `postgresServerFqdn` / `postgres_server_fqdn`. Wire the Key Vault
URI and the Application Insights connection string into the app's deployment
environment: the latter is exactly what `APPLICATIONINSIGHTS_CONNECTION_STRING`
expects (see `.env.example` and `src/observability/otel.ts`).
