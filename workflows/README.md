# Reusable Workflows

This directory serves as a signpost to the reusable GitHub Actions workflows used by this toolkit. The workflows themselves are located in `.github/workflows/` because GitHub requires reusable workflows (invoked via `workflow_call`) to reside in that directory for cross-repository consumption.

## Available Reusable Workflows

### 1. Reusable CI workflow (reusable-ci.yml)

A comprehensive CI workflow for building, testing, and scanning Node.js projects.

**File location:** `.github/workflows/reusable-ci.yml`

**Inputs:**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| node-version | string | "20" | Node.js version to use |
| working-directory | string | "." | Working directory for npm commands |
| test-command | string | "npm test" | Test command to run |
| run-secret-scan | boolean | true | Whether to run gitleaks secret scanning |

**Jobs:**
- `checks`: Runs setup-node, installs dependencies (npm ci or npm install), conditionally runs lint/typecheck/build if scripts exist in package.json, then runs the test command
- `secret-scan`: Downloads and runs a pinned gitleaks release (v8.30.1 at the time of writing) to detect secrets in git history

**Example usage:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    uses: mmoideen/prod-ready-ai-app/.github/workflows/reusable-ci.yml@main
    with:
      node-version: "20"
      working-directory: "."
      test-command: "npm test"
      run-secret-scan: true
```

**Secrets:** None used directly. Secrets are inherited by default when using `uses` (no `secrets:` block needed).

### 2. Reusable deploy workflow (reusable-deploy.yml)

A deployment workflow for deploying to Vercel or similar platforms.

**File location:** `.github/workflows/reusable-deploy.yml`

**Inputs:**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| environment | string | "preview" | Deployment environment (preview or production) |
| working-directory | string | "." | Working directory for deployment commands |

**Secrets (optional):**

| Name | Description |
| --- | --- |
| VERCEL_TOKEN | Vercel API authentication token |
| VERCEL_ORG_ID | Vercel organization ID |
| VERCEL_PROJECT_ID | Vercel project ID |

**Behavior:**
- Checks if VERCEL_TOKEN is configured. If absent, prints a notice and gracefully exits
- If present: installs Vercel CLI, pulls environment info, builds, and deploys
- Uses `--prod` flag only when environment is "production"

**Example usage:**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    uses: mmoideen/prod-ready-ai-app/.github/workflows/reusable-deploy.yml@main
    with:
      environment: "production"
      working-directory: "."
    secrets:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**Passing secrets from a caller workflow:**

When calling a reusable workflow, you can pass secrets in two ways:

1. **Inherit all secrets (recommended for trusted upstream):**

```yaml
jobs:
  deploy:
    uses: mmoideen/prod-ready-ai-app/.github/workflows/reusable-deploy.yml@main
    secrets: inherit
```

2. **Explicitly pass specific secrets:**

```yaml
jobs:
  deploy:
    uses: mmoideen/prod-ready-ai-app/.github/workflows/reusable-deploy.yml@main
    secrets:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Design notes

- Reusable workflows must live in `.github/workflows/` in the toolkit repository to be callable from other repositories via `workflow_call`
- All reusable workflows pin action versions to major tags (e.g., `actions/checkout@v5`) for stability
- Workflows detect optional features (like npm scripts) rather than failing, making them robust across different project layouts
- The secret scanning job is optional and can be disabled if not needed
- The deploy workflow gracefully skips if credentials are not configured, making it safe to use in public repositories
