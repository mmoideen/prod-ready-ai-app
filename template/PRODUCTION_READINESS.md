<!--
PRODUCTION_READINESS.md checklist for internal-tool-template.
This manual checklist mirrors the automated readiness scorecard rule for rule.
Both implement rubric version 1.0.0 (see docs/RUBRIC.md in the toolkit repository).
Boxes below reflect this template's actual state as shipped. Re-run the scorecard
after any change and keep this file in sync with the real result; do not check a
box the scorecard does not also confirm.
Replace {{TEAM_CHANNEL}}, {{PROJECT_NAME}}, {{ENGINEER_NAME}}, {{LEAD_NAME}},
{{DATE}}, {{SCORE}}, {{SCORECARD_REPORT_URL}}, {{PLATFORM_TEAM_MEMBER}} once this
template is copied out and you run the scorecard against your own repository.
-->

# Production Readiness Checklist for {{PROJECT_NAME}}

This checklist confirms readiness across all dimensions measured by the production
readiness scorecard. The scorecard and this checklist are two views of the same 20 rule
rubric (version 1.0.0). Your completion of this checklist predicts your scorecard score.

## How to use this checklist

1. Go through each section and check the boxes as evidence gathers.
2. Run the automated scorecard to confirm:
   ```bash
   node scorecard/dist/cli.js --path . --min-score 85
   ```
   (or, once this repository is standalone, follow the toolkit's published CLI
   usage instructions).
3. The scorecard report must agree with your honest completion of this checklist.
   If they diverge, investigate which rule is not objectively met.
4. Target: reach 85 points to be production ready. Gaps below that are roadmap items.
5. After completion, share the report with {{TEAM_CHANNEL}} and fill the sign-off block below.

---

## Testing (weight 15)

- [x] TEST-1 (weight 5): A real test script exists. `package.json` `scripts.test` runs `tsx --test src/tests/*.test.ts`, not the npm placeholder.
- [x] TEST-2 (weight 5): Test files are present. `src/tests/rbac.test.ts` and `src/tests/health.test.ts` exist.
- [x] TEST-3 (weight 5): CI runs the tests. `.github/workflows/ci.yml` calls the toolkit's `reusable-ci.yml`, which runs `npm test`.

---

## CI/CD (weight 10)

- [x] CICD-1 (weight 5): A CI workflow exists. `.github/workflows/ci.yml` and `.github/workflows/eval.yml` both trigger on `push` and `pull_request`.
- [x] CICD-2 (weight 5): A deploy workflow exists. `.github/workflows/deploy.yml` calls the toolkit's `reusable-deploy.yml`.

---

## Security (weight 15)

- [x] SEC-1 (weight 4): Secret scanning is configured. `.github/workflows/ci.yml` calls the toolkit's `reusable-ci.yml`, whose `secret-scan` job runs gitleaks.
- [x] SEC-2 (weight 4): No obvious secrets are committed. No `.env` file is committed, only `.env.example`; no private key files; no live credential patterns in source.
- [x] SEC-3 (weight 3): An env example exists with no real values. Every value in `.env.example` is empty.
- [x] SEC-4 (weight 4): Dependency updates are configured. `.github/dependabot.yml` covers npm (weekly) and github-actions (weekly).

---

## Auth and access (weight 10)

- [x] AUTH-1 (weight 5): Authentication is present. `next-auth` v5 is configured in `src/auth.ts` with a Microsoft Entra ID provider (from env) and a gated local development credentials provider.
- [x] AUTH-2 (weight 5): RBAC is referenced in code or docs. `src/lib/rbac.ts` defines roles, permissions, and `can()`; enforced on `/protected` and `POST /api/admin-action`; documented in README.md and SUPPORT.md.

---

## Observability (weight 12)

- [x] OBS-1 (weight 6): Telemetry or structured logging is set up. `src/observability/otel.ts` configures an OpenTelemetry NodeSDK, wired through `src/instrumentation.ts`.
- [x] OBS-2 (weight 6): A health endpoint exists. `src/app/api/health/route.ts` (`GET /api/health`), no authentication required.

---

## Evaluations (weight 10; AI tools only)

Applies because this repository has AI signals (the `openai` dependency and the `evals/` directory).

- [x] EVAL-1 (weight 5): An eval dataset exists. `evals/dataset.jsonl` has 3 golden items.
- [x] EVAL-2 (weight 5): An eval runner exists and is wired up. `evals/run.mjs`, wired to `npm run eval` in `package.json`, also called by `.github/workflows/eval.yml`.

---

## Infrastructure as code (weight 8)

- [x] IAC-1 (weight 8): Infrastructure is declared as code. `infra/bicep/main.bicep` and `infra/terraform/*.tf`, both consuming the toolkit's shared `infra-modules/`.

---

## Documentation (weight 12)

- [x] DOC-1 (weight 4): A substantive README exists. `README.md`, well over 400 bytes, with many headings, covering the quickstart, both auth paths, and how the scorecard grades this repository.
- [x] DOC-2 (weight 4): A runbook exists. `RUNBOOK.md` covers deploy, rollback, health checks, and common failures.
- [x] DOC-3 (weight 4): A production readiness checklist exists. This file.

---

## Support model (weight 8)

- [x] SUP-1 (weight 8): An owner is named. `SUPPORT.md` names an owner (`{{OWNER_NAME}}`, `{{OWNER_TEAM}}`); README.md also has an Owner section.

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
