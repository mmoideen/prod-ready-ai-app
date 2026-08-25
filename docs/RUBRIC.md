# Production Readiness Rubric

Version: 1.0.0

This rubric defines what "production ready" means for an internal AI tool in this
organization. It is implemented rule for rule by the readiness scorecard CLI in
[`scorecard/`](../scorecard/), and mirrored one to one by the manual checklist in
[`templates/PRODUCTION_READINESS.md`](../templates/PRODUCTION_READINESS.md). If you
change any of the three, change all three in the same pull request. CI enforces that
the rule sets stay in sync.

## How scoring works

- Every rule returns one of three results: **pass**, **fail**, or **not applicable**.
- Every rule has a weight. Weights across all rules sum to 100.
- The score is the weighted percentage of passing rules among applicable rules:

  ```
  score = 100 * (sum of weights of passing rules) / (sum of weights of applicable rules)
  ```

- Not applicable rules are excluded from both the numerator and the denominator, so a
  repository is never penalized for a category that does not apply to its stack.
- The score maps to a letter grade and a lifecycle stage recommendation (below).

### Grades

| Grade | Score |
| --- | --- |
| A | 90 to 100 |
| B | 80 to 89 |
| C | 70 to 79 |
| D | 60 to 69 |
| F | below 60 |

### Lifecycle stage recommendation

The scorecard recommends the highest stage the evidence supports. Stages above
Production ready always require the manual gates in
[`docs/LIFECYCLE.md`](LIFECYCLE.md) in addition to the score.

| Score | Recommendation |
| --- | --- |
| 92 to 100 | Production ready. Eligible for Business critical review if the manual gates in LIFECYCLE.md are met. |
| 85 to 91 | Production ready. This is the promotion threshold. |
| 70 to 84 | Pilot. Close the failing rules to reach Production ready. |
| 50 to 69 | Pilot at best. Significant gaps remain. |
| below 50 | Experimental. Not ready for real users. |

The default CI gate is `--min-score 85`, the Production ready threshold.

## Rule catalog

19 rules across 9 categories. Weights sum to 100.

### Testing (weight 15)

| ID | Rule | Weight | Passes when | Not applicable when |
| --- | --- | --- | --- | --- |
| TEST-1 | A real test script exists | 5 | `package.json` has a `test` script that is not empty and not the npm placeholder, or a Python project declares pytest, tox, or nox configuration | Never |
| TEST-2 | Test files are present | 5 | At least one test file exists (`*.test.*`, `*.spec.*`, `test_*.py`, or files under a `test`, `tests`, or `__tests__` directory), excluding `node_modules` | Never |
| TEST-3 | CI runs the tests | 5 | A workflow under `.github/workflows/` invokes the test command (`npm test`, `pnpm test`, `yarn test`, `vitest`, `jest`, `pytest`, `node --test`, or a reusable CI workflow known to run tests) | No CI workflows exist (then CICD-1 fails instead and this rule reports not applicable) |

Remediation: add a test runner, write at least one meaningful test for the core
behavior, and call the test command from CI.

### CI/CD (weight 10)

| ID | Rule | Weight | Passes when | Not applicable when |
| --- | --- | --- | --- | --- |
| CICD-1 | A CI workflow exists | 5 | At least one workflow under `.github/workflows/` triggers on `push` or `pull_request` and runs build, lint, or test steps | Never |
| CICD-2 | A deploy workflow exists | 5 | A workflow references a deployment step (Vercel, Azure Web Apps, container registry push, or a reusable deploy workflow), or a deploy workflow file exists by name (`deploy`, `cd`, `release`) | Never |

Remediation: adopt the reusable workflows in this toolkit
(`reusable-ci.yml`, `reusable-deploy.yml`) instead of writing bespoke pipelines.

### Security (weight 15)

| ID | Rule | Weight | Passes when | Not applicable when |
| --- | --- | --- | --- | --- |
| SEC-1 | Secret scanning is configured | 4 | A workflow or config references a secret scanner (gitleaks, trufflehog, detect-secrets, or GitHub secret scanning via the reusable CI workflow), or a `.gitleaks.toml` exists | Never |
| SEC-2 | No obvious secrets are committed | 4 | No committed `.env` file (other than `.env.example` or `.env.template`), no committed private key material (`*.pem`, `id_rsa`, `*.p12`, `*.pfx`), and no source lines matching well known live credential shapes (private key headers, `AKIA` style AWS access key IDs, GitHub `ghp_` tokens, generic `API_KEY=` assignments with long literal values) | Never |
| SEC-3 | An env example exists with no real values | 3 | `.env.example` (or `.env.template`) exists, and every value in it is empty or an obvious placeholder (contains `example`, `changeme`, `your-`, `placeholder`, `xxx`, or `<...>` markers, or is empty) | Never |
| SEC-4 | Dependency updates are configured | 4 | `.github/dependabot.yml` or a Renovate configuration exists | Never |

Remediation: copy `.env.example` and `dependabot.yml` from the template skeleton,
enable the secret scan step in the reusable CI workflow, and purge any committed
secret from history before promotion.

### Auth and access (weight 10)

| ID | Rule | Weight | Passes when | Not applicable when |
| --- | --- | --- | --- | --- |
| AUTH-1 | Authentication is present | 5 | Auth configuration or dependencies are detectable: `next-auth` / `@auth/core` with a configured provider, `@azure/msal-node` or `@azure/msal-browser`, `passport`, an OIDC client library, or middleware that validates a bearer token or API key. Docs describing the auth model count as supporting evidence but code or config must exist | Never |
| AUTH-2 | RBAC is referenced in code or docs | 5 | A role or permission model appears in code (files or identifiers matching `rbac`, `roles`, `permissions`, `authorize`, `can(`) or a documented access model exists in the README or a security doc | Never |

Remediation: use the template skeleton's Entra ID provider and RBAC policy module.
Every internal tool must name who can access it and what each role can do.

### Observability (weight 12)

| ID | Rule | Weight | Passes when | Not applicable when |
| --- | --- | --- | --- | --- |
| OBS-1 | Telemetry or structured logging is set up | 6 | OpenTelemetry packages or setup files are present (`@opentelemetry/*`, `otel.ts`, `instrumentation.ts`), or a structured logger is configured (`pino`, `winston`, `structlog`), or an Application Insights integration exists | Never |
| OBS-2 | A health endpoint exists | 6 | A route or handler for `/health`, `/healthz`, `/livez`, or `/readyz` exists in code, or an equivalent path is declared in the app router file layout | Never |

Remediation: copy `src/observability/otel.ts` and the health route from the template
skeleton. Operations cannot support what it cannot see.

### Evaluations (weight 10, AI tools only)

Applies only when the repository shows AI signals: an AI SDK dependency
(`openai`, `@anthropic-ai/sdk`, `@azure/openai`, `ai`, `langchain`, `@langchain/*`,
`llamaindex`, `ollama`), a `prompts/` directory, or an `evals/` directory. Without AI
signals both rules report not applicable.

| ID | Rule | Weight | Passes when | Not applicable when |
| --- | --- | --- | --- | --- |
| EVAL-1 | An eval dataset exists | 5 | A dataset file exists under `evals/` (JSON, JSONL, CSV, or YAML) with at least one item | Repository has no AI signals |
| EVAL-2 | An eval runner exists and is wired up | 5 | A runner script exists under `evals/` and is invocable (an `eval` script in `package.json`, a documented command, or a workflow step that runs it) | Repository has no AI signals |

Remediation: start from the template skeleton's `evals/` stub: one golden dataset
item and a runner that exits non zero below threshold. Grow the dataset with every
regression found in production.

### Infrastructure as code (weight 8)

| ID | Rule | Weight | Passes when | Not applicable when |
| --- | --- | --- | --- | --- |
| IAC-1 | Infrastructure is declared as code | 8 | Bicep files (`*.bicep`) or Terraform files (`*.tf`) exist, typically under `infra/` | Never |

Remediation: consume the shared modules in `infra-modules/` (keyvault, monitoring,
postgres) rather than authoring resources from scratch.

### Documentation (weight 12)

| ID | Rule | Weight | Passes when | Not applicable when |
| --- | --- | --- | --- | --- |
| DOC-1 | A substantive README exists | 4 | `README.md` exists, is at least 400 bytes, and contains at least two headings | Never |
| DOC-2 | A runbook exists | 4 | A runbook file exists (`RUNBOOK.md`, `docs/RUNBOOK.md`, or `docs/runbook.md`) with deploy and rollback content | Never |
| DOC-3 | A production readiness checklist exists | 4 | A `PRODUCTION_READINESS.md` (root or `docs/`) exists | Never |

Remediation: copy the templates from `templates/` and fill in the placeholders. The
checklist mirrors this rubric, so completing it honestly predicts your score.

### Support model (weight 8)

| ID | Rule | Weight | Passes when | Not applicable when |
| --- | --- | --- | --- | --- |
| SUP-1 | An owner is named | 8 | A `SUPPORT.md` or `SUPPORT_HANDOFF.md` names an owner or team, or a `CODEOWNERS` file exists, or the README contains an explicit owner or maintainer section | Never |

Remediation: fill in `templates/SUPPORT_HANDOFF.md`. A tool nobody owns is already
deprecated, it just does not know it yet.

## Weight summary

| Category | Weight |
| --- | --- |
| Testing | 15 |
| CI/CD | 10 |
| Security | 15 |
| Auth and access | 10 |
| Observability | 12 |
| Evaluations | 10 |
| Infrastructure as code | 8 |
| Documentation | 12 |
| Support model | 8 |
| **Total** | **100** |

## Design notes

- Rules detect signals by file presence and content patterns. They are heuristics,
  deliberately resilient across TypeScript and Python stacks. A rule that cannot
  find its signal for the detected stack reports not applicable instead of failing.
- The scorecard never executes code from the repository it scans. It only reads
  files. This keeps the scan safe to run on untrusted branches in CI.
- The rubric is versioned. Rule additions or weight changes bump the minor version,
  breaking changes to rule IDs bump the major version, and the scorecard reports the
  rubric version in every report.
