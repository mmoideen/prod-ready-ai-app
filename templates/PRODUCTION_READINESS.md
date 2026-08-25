<!-- 
PRODUCTION_READINESS.md checklist template
This manual checklist mirrors the automated readiness scorecard rule for rule.
Both implement rubric version 1.0.0 (see ../docs/RUBRIC.md).
Fill in the date completed, then run the scorecard (from a checkout of the toolkit repository until the package is published): npx prod-ready-scorecard --path . --min-score 85
Copy the final score into the sign-off block at the end.
Replace {{TEAM_CHANNEL}} with your actual Slack/Teams channel.
Replace {{PROJECT_NAME}} with your tool name.
Replace {{DATE}} with the completion date (YYYY-MM-DD format).
-->

# Production Readiness Checklist for {{PROJECT_NAME}}

This checklist confirms readiness across all dimensions measured by the production
readiness scorecard. The scorecard and this checklist are two views of the same 20 rule
rubric (version 1.0.0). Your completion of this checklist predicts your scorecard score.

## How to use this checklist

1. Go through each section and check the boxes as evidence gathers.
2. Run the automated scorecard to confirm:
   ```bash
   npx prod-ready-scorecard --path . --min-score 85
   ```
3. The scorecard report must agree with your honest completion of this checklist.
   If they diverge, investigate which rule is not objectively met.
4. Target: reach 85 points to be production ready. Gaps below that are roadmap items.
5. After completion, share the report with {{TEAM_CHANNEL}} and fill the sign-off block below.

---

## Testing (weight 15)

- [ ] TEST-1 (weight 5): A real test script exists and is not the npm placeholder. Check `package.json` or Python config for a test command that actually runs tests, not empty or `echo true`.
- [ ] TEST-2 (weight 5): Test files are present. At least one file exists matching `*.test.*`, `*.spec.*`, `test_*.py`, or under a `test`, `tests`, or `__tests__` directory.
- [ ] TEST-3 (weight 5): CI runs the tests. A `.github/workflows/` file invokes the test command (`npm test`, `pytest`, etc.) on every push or pull request.

---

## CI/CD (weight 10)

- [ ] CICD-1 (weight 5): A CI workflow exists. At least one `.github/workflows/` file triggers on `push` or `pull_request` and runs build, lint, or test steps.
- [ ] CICD-2 (weight 5): A deploy workflow exists. A workflow file references a deployment step (Vercel, Azure Web Apps, container registry push, or a named deploy workflow).

---

## Security (weight 15)

- [ ] SEC-1 (weight 4): Secret scanning is configured. A `.gitleaks.toml` exists or a CI workflow step references gitleaks, trufflehog, detect-secrets, or GitHub secret scanning.
- [ ] SEC-2 (weight 4): No obvious secrets are committed. Verify no `.env` file (except `.env.example` or `.env.template`), no private key files (`*.pem`, `*.p12`, `id_rsa`), and no live credential patterns in source.
- [ ] SEC-3 (weight 3): An env example exists with no real values. `.env.example` or `.env.template` exists, every value is empty or contains placeholder text like `example`, `changeme`, `your-`, `placeholder`, or `<...>`.
- [ ] SEC-4 (weight 4): Dependency updates are configured. `.github/dependabot.yml` or Renovate config exists and will open PRs for outdated packages.

---

## Auth and access (weight 10)

- [ ] AUTH-1 (weight 5): Authentication is present. Code or config declares an auth provider: `next-auth` / `@auth/core` with a provider, `@azure/msal-node` / `@azure/msal-browser`, `passport`, an OIDC library, or middleware that validates a bearer token or API key.
- [ ] AUTH-2 (weight 5): RBAC is referenced in code or docs. Files or identifiers matching `rbac`, `roles`, `permissions`, `authorize`, `can(` exist in code, or the README or a security doc names the access model.

---

## Observability (weight 12)

- [ ] OBS-1 (weight 6): Telemetry or structured logging is set up. OpenTelemetry packages (`@opentelemetry/*`) or files (`otel.ts`, `instrumentation.ts`) exist, or a structured logger (`pino`, `winston`, `structlog`) is configured, or Application Insights is integrated.
- [ ] OBS-2 (weight 6): A health endpoint exists. A route or handler for `/health`, `/healthz`, `/livez`, or `/readyz` exists in code, or is declared in the app router layout.

---

## Evaluations (weight 10; AI tools only)

Applies only if the repository shows AI signals: an AI SDK dependency (`openai`, `@anthropic-ai/sdk`, `@azure/openai`, `ai`, `langchain`, `llamaindex`, `ollama`), a `prompts/` directory, or an `evals/` directory. If no AI signals exist, both rules are not applicable.

- [ ] EVAL-1 (weight 5): An eval dataset exists. A dataset file under `evals/` (JSON, JSONL, CSV, or YAML) with at least one test item is present.
- [ ] EVAL-2 (weight 5): An eval runner exists and is wired up. A runner script under `evals/` is invocable via `npm run eval`, a documented command, or a CI workflow step.

---

## Infrastructure as code (weight 8)

- [ ] IAC-1 (weight 8): Infrastructure is declared as code. Bicep files (`*.bicep`) or Terraform files (`*.tf`) exist, typically under an `infra/` directory. Do not hard code resource creation steps.

---

## Documentation (weight 12)

- [ ] DOC-1 (weight 4): A substantive README exists. `README.md` is at least 400 bytes, contains at least two headings, and explains what the tool does and how to run it.
- [ ] DOC-2 (weight 4): A runbook exists. `RUNBOOK.md`, `docs/RUNBOOK.md`, or `docs/runbook.md` includes deploy and rollback procedures.
- [ ] DOC-3 (weight 4): A production readiness checklist exists. This file (`PRODUCTION_READINESS.md` or `docs/PRODUCTION_READINESS.md`) is present and filled in honestly.

---

## Support model (weight 8)

- [ ] SUP-1 (weight 8): An owner is named. A `SUPPORT.md`, `SUPPORT_HANDOFF.md`, CODEOWNERS file, or the README names an owner or team responsible for the tool.

---

## Sign-off

Use this section after confirming the automated scorecard passes at 85 or above.

| Field | Value |
| --- | --- |
| Tool name | {{PROJECT_NAME}} |
| Completing engineer | {{ENGINEER_NAME}} |
| Engineering lead | {{LEAD_NAME}} |
| Scorecard score achieved | {{SCORE}} (target: 85+) |
| Scorecard report | {{SCORECARD_REPORT_URL}} |
| Date completed | {{DATE}} |

Signed by:
- Completing engineer: {{ENGINEER_NAME}} (date: {{DATE}})
- Engineering lead: {{LEAD_NAME}} (date: {{DATE}})
- Platform team representative: {{PLATFORM_TEAM_MEMBER}} (date: {{DATE}})
