# Reusable Readiness Action

A composite action that runs the production readiness scorecard and reports the result to the GitHub Actions step summary.

## Purpose

This action integrates the production readiness scorecard CLI into your CI workflows. It:
1. Checks out the prod-ready-ai-app toolkit repository
2. Builds the scorecard CLI
3. Runs the scorecard against your repository
4. Reports the result in markdown to the GitHub step summary
5. Fails the job if the score is below the configured threshold (unless in advisory mode)

## Inputs

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| path | string | No | "." | Path to scan for readiness (usually the repository root) |
| min-score | string | No | "85" | Minimum readiness score required to pass. Use 85 for Production ready gate, 92 for Business critical. |
| advisory | string | No | "false" | If "true", below-threshold scores are reported but do not fail the job. Useful for initial integration. |
| toolkit-repo | string | No | "mmoideen/prod-ready-ai-app" | Toolkit repository to fetch the scorecard from (owner/repo format) |
| toolkit-ref | string | No | "main" | Git ref (branch, tag, commit) of the toolkit to use |

## Outputs

None. The action produces a markdown report written to the GitHub step summary and logs.

## Exit behavior

- Exits 0 (success) if the score meets or exceeds min-score
- Exits 0 (success) with advisory message if score is below min-score and advisory mode is enabled
- Exits 1 (failure) if the score is below min-score and advisory mode is disabled

## Example usage

For a downstream repository that wants to enforce production readiness:

```yaml
name: Readiness gate

on:
  push:
    branches: [main]
  pull_request:

jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v5

      - name: Check production readiness
        uses: mmoideen/prod-ready-ai-app/actions/reusable-readiness@main
        with:
          path: "."
          min-score: "85"
          advisory: "false"
          toolkit-repo: "mmoideen/prod-ready-ai-app"
          toolkit-ref: "main"
```

## Integration notes

- The action clones the toolkit repository into the runner's temp directory (outside your workspace), so the toolkit's own files, including its intentionally failing test fixtures, never contaminate the scan of your repository
- The toolkit clone is unauthenticated, which works for the public toolkit repository; fork it and adjust toolkit-repo if you host a private copy
- The scorecard report is printed to the job log and appended to the GitHub Actions step summary (visible on the workflow run page); a copy is written to $RUNNER_TEMP/readiness-report.md for the duration of the job
- The toolkit repository must be public or the workflow runner must have access to it (e.g., via a private GitHub token in the runner)
- Use advisory mode ("true") during initial integration to assess readiness without blocking merges
- Switch to enforcement mode ("false") once the team is ready to maintain the score

## Typical workflow integration

1. Add the action to your CI workflow for PR checks
2. Set advisory: "true" initially to observe scores
3. Address low-scoring areas
4. Switch advisory: "false" to enforce the gate
5. Monitor the step summary to see detailed feedback on each rule

## Troubleshooting

If the scorecard build fails, ensure the toolkit repository has a built scorecard CLI at `scorecard/dist/cli.js`. This requires:
```bash
cd scorecard
npm ci
npm run build
```

The action will print an error message directing you to build the scorecard if `dist/` is missing.
