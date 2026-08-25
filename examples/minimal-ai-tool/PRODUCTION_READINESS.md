# Production Readiness Checklist for minimal-ai-tool

This checklist mirrors `docs/RUBRIC.md` (rubric version 1.0.0) rule for
rule. Verify against the automated scorecard from the repository root:

```bash
node scorecard/dist/cli.js --path examples/minimal-ai-tool --min-score 85
```

## Testing (weight 15)

- [x] TEST-1 (weight 5): A real test script exists. `package.json`'s
      `test` script builds and runs `node --test` against
      `dist/tests/*.test.js`.
- [x] TEST-2 (weight 5): Test files are present. `src/tests/*.test.ts`
      covers rbac, auth, the health route, the summarize route end to
      end, and the mock provider.
- [x] TEST-3 (weight 5): CI runs the tests. `.github/workflows/ci.yml`
      calls the toolkit's reusable CI workflow, which runs `npm test`.

## CI/CD (weight 10)

- [x] CICD-1 (weight 5): A CI workflow exists. `.github/workflows/ci.yml`
      triggers on push and pull_request and runs steps.
- [x] CICD-2 (weight 5): A deploy workflow exists.
      `.github/workflows/deploy.yml` calls the toolkit's reusable deploy
      workflow.

## Security (weight 15)

- [x] SEC-1 (weight 4): Secret scanning is configured. `ci.yml` calls
      the toolkit's reusable CI workflow, which includes a gitleaks scan
      job.
- [x] SEC-2 (weight 4): No obvious secrets are committed. No `.env`
      file, no private key files, and no live credential patterns; all
      example tokens and keys are obvious placeholders.
- [x] SEC-3 (weight 3): An env example exists with no real values.
      `.env.example` exists; every value is empty or an obvious
      placeholder (`your-`, `changeme`, `fake`, or empty).
- [x] SEC-4 (weight 4): Dependency updates are configured.
      `.github/dependabot.yml` covers npm and github-actions, weekly.

## Auth and access (weight 10)

- [x] AUTH-1 (weight 5): Authentication is present. `src/auth.ts`
      validates `Authorization: Bearer <token>` against `API_TOKENS`.
- [x] AUTH-2 (weight 5): RBAC is referenced in code. `src/rbac.ts`
      defines `viewer`/`admin` roles, `summarize`/`admin` permissions,
      and `can()`/`authorize()`.

## Observability (weight 12)

- [x] OBS-1 (weight 6): Telemetry or structured logging is set up.
      `src/logger.ts` emits structured JSON (`timestamp`, `level`,
      `message`, fields, `requestId`) for every request, with duration.
- [x] OBS-2 (weight 6): A health endpoint exists. `GET /healthz` in
      `src/server.ts`, unauthenticated.

## Evaluations (weight 10, AI tools only)

- [x] EVAL-1 (weight 5): An eval dataset exists. `evals/dataset.jsonl`
      has 5 deterministic items.
- [x] EVAL-2 (weight 5): An eval runner exists and is wired up.
      `evals/run.mjs`, invoked by the `eval` npm script and
      `.github/workflows/eval.yml`.

## Infrastructure as code (weight 8)

- [x] IAC-1 (weight 8): Infrastructure is declared as code.
      `infra/bicep/main.bicep` and `infra/terraform/*.tf` consume the
      shared `infra-modules/` keyvault and monitoring modules.

## Documentation (weight 12)

- [x] DOC-1 (weight 4): A substantive README exists. `README.md` is well
      over 400 bytes with many headings.
- [x] DOC-2 (weight 4): A runbook exists. `RUNBOOK.md` covers deploy,
      rollback, health checks, and common failures.
- [x] DOC-3 (weight 4): A production readiness checklist exists. This
      file.

## Support model (weight 8)

- [x] SUP-1 (weight 8): An owner is named. `SUPPORT.md` and this
      repository's `README.md` "Owner" section both name
      `{{OWNER_NAME}}`.

## Sign-off

| Field | Value |
| --- | --- |
| Tool name | minimal-ai-tool |
| Completing engineer | {{OWNER_NAME}} |
| Scorecard score achieved | 100.0 / 100, Grade A (target: 85+) |
| Scorecard report | `node scorecard/dist/cli.js --path examples/minimal-ai-tool --min-score 85` from the repository root |
| Date completed | {{DATE}} |
