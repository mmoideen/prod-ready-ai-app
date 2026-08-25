# Reusable CI Action

A composite action that encapsulates common Node.js CI checks in a reusable step that can be called from any workflow.

## Purpose

This action performs the following steps in sequence:
1. Setup Node.js
2. Install dependencies (npm ci or npm install, depending on lockfile presence)
3. Conditionally run linter (if lint script exists in package.json)
4. Conditionally run typecheck (if typecheck script exists in package.json)
5. Conditionally run build (if build script exists in package.json)
6. Run tests using the specified test command

## When to use this action vs the reusable workflow

**Use this action** when you want to:
- Call CI steps as part of a larger job in your own workflow
- Mix CI checks with other custom steps
- Avoid spawning a separate workflow job
- Have fine-grained control over the job context

**Use the reusable workflow** (`reusable-ci.yml`) when you want to:
- Run all CI checks in an isolated job
- Include optional secret scanning
- Keep CI orchestration separate from your main workflow logic
- Maximize parallelization (jobs can run concurrently)

## Inputs

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| node-version | string | No | "20" | Node.js version to install and use |
| working-directory | string | No | "." | Working directory for npm commands |
| test-command | string | No | "npm test" | Test command to execute |

## Outputs

None. The action fails the workflow if any step fails.

## Example usage

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run CI checks
        uses: {{GITHUB_USERNAME}}/prod-ready-ai-app/actions/reusable-ci@main
        with:
          node-version: "20"
          working-directory: "."
          test-command: "npm test"
```

## Design notes

- This is a composite action, not a container action, so it runs directly on the runner without Docker overhead
- Composite actions cannot access job-level environment variables or secrets directly; pass them as inputs if needed
- The action detects optional scripts (lint, typecheck, build) by attempting to read them from package.json, making it robust across different project layouts
- Dependencies are installed with `npm ci` if package-lock.json exists, otherwise `npm install`
