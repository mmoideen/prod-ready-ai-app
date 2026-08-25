# Runbook

Operational runbook for the minimal-ai-tool ticket summarizer.

## Deploy

1. CI (`.github/workflows/ci.yml`) runs on every push and pull request
   against `main`, building, type checking, and testing the service via
   the toolkit's reusable CI workflow.
2. `.github/workflows/deploy.yml` calls the toolkit's reusable deploy
   workflow with `secrets: inherit` on every push to `main`. Configure
   the deployment target's secrets (for example `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, or your platform's equivalents)
   at the repository level; the workflow no-ops gracefully if they are
   absent.
3. For a container or VM based deployment: `npm ci && npm run build`,
   then run `node dist/server.js` with `PORT`, `API_TOKENS`, and
   (optionally) the `AZURE_OPENAI_*` variables set from your vault, never
   from a committed file.
4. After every deploy, confirm health per "Health checks" below before
   directing traffic to the new instance.

## Rollback

1. Re-run `.github/workflows/deploy.yml` against the last known good
   commit on `main` (or redeploy the previous successful build artifact
   from your deployment platform's dashboard).
2. Confirm `GET /healthz` returns `200` on the rolled back version.
3. If the rollback was triggered by an Azure OpenAI outage or a
   misconfigured `AZURE_OPENAI_*` variable, clearing those three
   variables falls the service back to the deterministic mock provider
   (`src/ai/mock.ts`) with no code change, which keeps
   `POST /api/summarize` available while the provider issue is
   investigated.

## Health checks

`GET /healthz` is unauthenticated and returns `200` with a small JSON
body (`status`, `uptimeSeconds`, `version`) whenever the process is up.
It does not call the Azure OpenAI provider, so it cannot false-negative
on an upstream AI outage. Point your platform's liveness and readiness
probes at this route.

```bash
curl -s http://localhost:3001/healthz
```

## Common failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `/api/summarize` returns `401` | Missing or invalid `Authorization: Bearer <token>` header | Confirm the token is present on the caller's request and matches a `token:role` pair in `API_TOKENS`. |
| `/api/summarize` or `/api/admin/stats` returns `403` | Token is valid but its role lacks the required permission (see `src/rbac.ts`) | Issue a token with the `admin` role for `/api/admin/stats`; `viewer` is sufficient for `/api/summarize`. |
| `/api/summarize` returns `400` | Request body is missing, not JSON, or has no non-empty `text` field | Send `{"text": "..."}` with a `Content-Type: application/json` header. |
| `/api/summarize` returns `500` when Azure OpenAI is configured | Azure OpenAI endpoint, key, or deployment is wrong, or the deployment is throttled or down | Check the logged `error` field in the structured JSON logs; temporarily unset one of the three `AZURE_OPENAI_*` variables to fall back to the mock provider. |
| Server will not start | `PORT` already in use, or an unhandled exception during `loadConfig()` | Check the structured startup log line; confirm no other process owns the configured port. |
| `npm test` fails after a source change | Compiled output in `dist/` is stale, or a route contract changed | `npm run build` runs automatically as part of `npm test`; check the failing assertion against the route contract in `README.md`. |
| Process does not exit on deploy or restart | `SIGTERM` handler waiting on an in-flight request | The graceful shutdown handler in `src/server.ts` force-exits 10 seconds after `SIGTERM`/`SIGINT`; investigate slow handlers if this triggers often. |

## Owner

See `SUPPORT.md`.
