# Minimal AI Tool

A deliberately small internal "ticket summarizer" service. It exists as
the proof-of-concept example for the Proready Lifecycle Toolkit: proof
that the toolkit's production readiness standards (see
`../../docs/RUBRIC.md`) are achievable in a plain TypeScript service, no
framework, zero runtime dependencies.

## What it is

A `node:http` server with three routes:

- `GET /healthz`: unauthenticated liveness and readiness check.
- `POST /api/summarize`: accepts `{ "text": "..." }` and returns a
  deterministic extractive summary (`{ "summary": "..." }`),
  authenticated by a bearer token and gated by the `summarize` RBAC
  permission.
- `GET /api/admin/stats`: returns in-memory request counts, gated by the
  `admin` RBAC permission.

Two summarization providers implement the same interface
(`src/ai/provider.ts`): a deterministic mock (`src/ai/mock.ts`, the
default) and an Azure OpenAI chat completions provider
(`src/ai/azure-openai.ts`) selected automatically when
`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and
`AZURE_OPENAI_DEPLOYMENT` are all set.

## Quickstart

```bash
npm install
npm run build
API_TOKENS="tok-viewer-fake:viewer,tok-admin-fake:admin" npm start
```

The server listens on `PORT` (default `3001`).

Health check, no auth required:

```bash
curl -s http://localhost:3001/healthz
```

Summarize a ticket. Requires a bearer token with the `summarize`
permission; both `viewer` and `admin` have it. Export a token from your
`API_TOKENS` configuration first (the values below match `.env.example`):

```bash
export VIEWER_TOKEN=tok-viewer-fake
export ADMIN_TOKEN=tok-admin-fake

curl -s http://localhost:3001/api/summarize \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "The printer on floor 3 is jammed. Facilities was notified twice this week."}'
```

Admin stats. Requires the `admin` permission; a `viewer` token gets
`403`:

```bash
curl -s http://localhost:3001/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Run the tests and the deterministic evals:

```bash
npm test
npm run eval
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | HTTP listen port. |
| `NODE_ENV` | `development` | Runtime environment name, informational only. |
| `API_TOKENS` | (none; every request unauthenticated) | Comma separated `token:role` pairs, roles are `viewer` or `admin`. See "Auth model" below. |
| `AZURE_OPENAI_ENDPOINT` | (unset; mock provider used) | Azure OpenAI resource endpoint, for example `https://your-resource.openai.azure.com`. |
| `AZURE_OPENAI_API_KEY` | (unset; mock provider used) | Azure OpenAI API key. |
| `AZURE_OPENAI_DEPLOYMENT` | (unset; mock provider used) | Azure OpenAI chat completions deployment name. |
| `AZURE_OPENAI_API_VERSION` | `2024-06-01` | Azure OpenAI REST API version. |

See `.env.example` for a copyable template with placeholder values.

## Auth model

`src/auth.ts` implements bearer token authentication: requests must send
`Authorization: Bearer <token>`, checked against the `API_TOKENS`
environment variable (comma separated `token:role` pairs). In this
reference implementation tokens live in an environment variable for
zero-dependency simplicity; **in a real deployment these tokens are
issued and rotated from a vault** (for example Azure Key Vault, wired in
`infra/bicep/main.bicep` and `infra/terraform/main.tf`), never hardcoded
or checked into a deployment manifest.

`src/rbac.ts` defines two roles and two permissions:

| Role | Permissions |
| --- | --- |
| `viewer` | `summarize` |
| `admin` | `summarize`, `admin` |

`POST /api/summarize` requires `summarize`. `GET /api/admin/stats`
requires `admin`. Missing or invalid tokens get `401`; a valid token
lacking the required permission gets `403`.

## How it scores on the scorecard

From the repository root:

```bash
node scorecard/dist/cli.js --path examples/minimal-ai-tool --min-score 85
```

This tool is built to score at or above 85 (the "Production ready"
promotion threshold in `docs/RUBRIC.md`) with margin to spare: real
tests (`src/tests/`) exercised by `.github/workflows/ci.yml`; a deploy
workflow (`.github/workflows/deploy.yml`); secret scanning (via the
reusable CI workflow's gitleaks job) and dependency updates
(`.github/dependabot.yml`); bearer token auth (`src/auth.ts`) plus RBAC
(`src/rbac.ts`); structured logging (`src/logger.ts`) plus a health
endpoint (`GET /healthz`); a deterministic eval suite (`evals/`);
infrastructure as code (`infra/`); and the full documentation and
support set (this README, `RUNBOOK.md`, `PRODUCTION_READINESS.md`,
`SUPPORT.md`).

## Architecture

```
src/
  config.ts           env parsing, defaults (PORT=3001)
  logger.ts            structured JSON logger
  rbac.ts               roles, permissions, RBAC checks
  auth.ts               bearer token middleware
  server.ts            node:http routes, request logging, graceful shutdown
  ai/
    provider.ts         SummarizeProvider interface
    mock.ts               deterministic extractive summarizer (default)
    azure-openai.ts        Azure OpenAI chat completions provider
    index.ts               provider selection
  tests/                node:test unit and end to end tests
evals/
  dataset.jsonl         deterministic eval dataset
  run.mjs               eval runner ("npm run eval")
infra/
  bicep/main.bicep      keyvault + monitoring, via infra-modules/
  terraform/             same, Terraform
```

## Owner

Owner: {{OWNER_NAME}}. See `SUPPORT.md` for support hours and
escalation.
