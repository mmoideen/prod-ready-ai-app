# Infrastructure

This tool provisions its Azure infrastructure by consuming the shared,
secure-by-default modules in `infra-modules/` (four directory levels up
from here: `examples/minimal-ai-tool/infra/{bicep,terraform}/` to
`infra-modules/`) rather than authoring resources from scratch. See
`../../../../infra-modules/README.md` for the full module parameter
contract.

## What is provisioned

- **Key Vault** (`infra-modules/bicep/keyvault` /
  `infra-modules/terraform/keyvault`): holds the `API_TOKENS` bearer
  tokens and the `AZURE_OPENAI_API_KEY` in a real deployment, instead of
  the plain environment variables used in this example's local
  development setup (see `src/auth.ts` and `src/ai/azure-openai.ts`).
- **Monitoring** (`infra-modules/bicep/monitoring` /
  `infra-modules/terraform/monitoring`): a Log Analytics workspace and a
  workspace-based Application Insights component, giving the structured
  JSON logs from `src/logger.ts` a diagnostic-settings target and the
  service application telemetry.

**PostgreSQL is intentionally not consumed.** This tool is stateless: it
summarizes ticket text on request and keeps no persistent state of its
own (the in-memory request counters behind `GET /api/admin/stats` reset
on restart), so there is no database to provision. See the comment in
`bicep/main.bicep` and `terraform/main.tf`.

## Relative path vs git URL sourcing

While this example lives nested inside the prod-ready-ai-app toolkit
repository, both `bicep/main.bicep` and `terraform/main.tf` reference the
shared modules by **relative path**
(`../../../../infra-modules/...`), exactly like every other consumer
inside this repository. Relative paths compile and validate directly
against the working tree, with no network access and no version pin to
manage.

Once this example (or infrastructure modeled on it) is copied out into
its own repository, the relative path no longer resolves, so the module
source must switch to one of:

- **A git URL ref** (Terraform only), for example:

  ```hcl
  module "keyvault" {
    source = "git::https://github.com/mmoideen/prod-ready-ai-app.git//infra-modules/terraform/keyvault?ref=main"
    # ...
  }
  ```

- **A vendored copy** of the module tree, updated deliberately.
- For Bicep, either vendor the module file(s), or, once the toolkit
  publishes a Bicep registry, reference a published module version
  instead of a relative path.

See `infra-modules/README.md` (in the toolkit repository) for the
authoritative module parameter contract and validation commands.

## Validation

From the repository root:

```bash
az bicep build --file examples/minimal-ai-tool/infra/bicep/main.bicep
```

From `examples/minimal-ai-tool/infra/terraform/`:

```bash
terraform init -backend=false
terraform validate
terraform fmt -check
```

`.terraform/` and `.terraform.lock.hcl` are local build artifacts (see
`.gitignore`); delete them after validating locally.
