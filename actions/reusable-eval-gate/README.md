# Reusable Eval Gate Action

A composite action that runs an evaluation command and enforces a pass/fail gate based on exit code.

## Purpose

This action invokes an evaluation runner (typically for AI tools) and fails the job if the evaluation does not pass. The contract is simple: the eval runner script decides pass/fail by exit code (0 = pass, non-zero = fail), and this action is the CI gate that enforces it.

## Design Contract

- The evaluation runner is responsible for all logic: dataset loading, model invocation, scoring, threshold comparison
- The eval runner exits with code 0 to pass or non-zero to fail
- This action runs the command, captures the exit code, and fails the workflow if non-zero
- The eval runner writes its own output to stdout/stderr; this action does not parse it

## Inputs

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| eval-command | string | No | "npm run eval" | Evaluation command to run. Exit code 0 passes, non-zero fails. |
| working-directory | string | No | "." | Working directory in which to run the eval command |

## Outputs

None. The action fails the workflow with an error message if the eval command returns non-zero.

## Example usage

```yaml
name: Eval gate

on:
  push:
    branches: [main]
  pull_request:

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run evaluation gate
        uses: {{GITHUB_USERNAME}}/prod-ready-ai-app/actions/reusable-eval-gate@main
        with:
          eval-command: "npm run eval"
          working-directory: "."
```

## Typical eval runner structure

An eval runner script should:
1. Load the evaluation dataset from `evals/` (e.g., `evals/dataset.json`)
2. Instantiate the model or AI system being tested
3. Run each test case through the system
4. Score the outputs against golden answers
5. Sum scores and compare to a configured threshold
6. Exit 0 if score >= threshold, exit 1 otherwise
7. Write a summary of the run to stdout (included in CI logs)

Example package.json:

```json
{
  "scripts": {
    "eval": "node evals/runner.js"
  }
}
```

Example evals/runner.js (stub):

```javascript
import { readFileSync } from 'fs';

const dataset = JSON.parse(readFileSync('evals/dataset.json', 'utf8'));
const threshold = 0.85;

let passed = 0;
let failed = 0;

for (const item of dataset) {
  const score = await runTest(item);
  if (score >= threshold) {
    passed++;
  } else {
    failed++;
  }
}

const passRate = passed / (passed + failed);
console.log(`Evaluation: ${passed} passed, ${failed} failed (${(passRate * 100).toFixed(1)}%)`);

process.exit(passRate >= threshold ? 0 : 1);
```

## Error output

If the eval command fails, the action prints an error message that includes:
- The exit code
- A note to check the workflow logs
- The working directory where the eval runner is located
