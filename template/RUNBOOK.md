<!--
RUNBOOK.md for internal-tool-template.
Replace {{TOOL_NAME}}, {{OWNER_TEAM}}, {{OWNER_NAME}}, {{REPO_URL}}, {{DASHBOARD_URL}},
{{TEAM_CHANNEL}}, {{VERCEL_PROJECT}}, {{DOMAIN}} with your team's real values once
this template is copied out and deployed. Values already filled in (deploy via CI,
rollback via Vercel, health checks at /api/health) reflect this skeleton's actual
wiring and should stay accurate as you build on top of it.
-->

# Runbook for {{TOOL_NAME}}

Production operations guide. Normal flow is CI driven deployment. The break glass
and rollback procedures below are for when that path is unavailable or a bad
deploy needs to be reverted quickly.

---

## Service overview

| Item | Value |
| --- | --- |
| **Service** | {{TOOL_NAME}} (built from internal-tool-template) |
| **Owner** | {{OWNER_TEAM}} (lead: {{OWNER_NAME}}) |
| **Repository** | {{REPO_URL}} |
| **Dashboard** | {{DASHBOARD_URL}} (Application Insights, once `APPLICATIONINSIGHTS_CONNECTION_STRING` is configured) |
| **Health check** | `GET /api/health`, no authentication required |
| **Alerts / chat** | {{TEAM_CHANNEL}} |

## Architecture at a glance

```
Browser
  | HTTPS, Auth.js session cookie
  v
Next.js app (Vercel or equivalent Node.js host)
  | Microsoft Entra ID (OIDC) for real users
  | RBAC check (src/lib/rbac.ts) on /protected and /api/admin-action
  | AI summarize() call (src/lib/ai.ts) -> Azure OpenAI, or offline mock
  v
Azure: Key Vault (secrets), Application Insights (telemetry), PostgreSQL (if used)
```

## Deploy procedure

### Normal path (via CI)

1. Merge to `main`. The `deploy.yml` workflow (see `.github/workflows/`) calls
   this toolkit's reusable deploy workflow.
2. The reusable deploy workflow checks for `VERCEL_TOKEN`. If it is not
   configured as a repository secret, the workflow prints a notice and exits
   successfully without deploying, so this workflow is safe to leave enabled
   before Vercel is set up.
3. When `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are configured,
   the workflow installs the Vercel CLI, pulls environment configuration, builds,
   and deploys with `--prod`.
4. Verify: `curl https://{{DOMAIN}}/api/health` returns HTTP 200 with
   `"status": "ok"`. Spot check `/` and, signed in, `/protected`.
5. Before this step ever runs in CI, the `ci.yml`, `eval.yml`, and `readiness.yml`
   workflows must already have passed on the same commit: lint, typecheck, build,
   tests, the `npm run eval` gate, and the readiness scorecard at 85 or above. A
   deploy only happens after all of those succeed.

### Break glass (CI unavailable)

Use only when CI is down and production needs an urgent fix.

```bash
npm install -g vercel
vercel login
vercel pull --yes --environment=production --token {{VERCEL_TOKEN}}
vercel build --prod --token {{VERCEL_TOKEN}}
vercel deploy --prebuilt --prod --token {{VERCEL_TOKEN}}
```

Immediately notify {{TEAM_CHANNEL}} that a manual deployment occurred, with the
commit hash and reason. Follow up with a normal CI deploy as soon as CI recovers.

## Rollback procedure

1. In the Vercel dashboard ({{VERCEL_PROJECT}}), open Deployments and find the
   most recent deployment with a passing status from before the incident began.
   Note its deployment ID.
2. Promote it back to production:
   ```bash
   vercel promote <deployment-id> --token {{VERCEL_TOKEN}}
   ```
3. Verify the rollback: `curl https://{{DOMAIN}}/api/health` returns HTTP 200
   with `"status": "ok"`.
4. Confirm signed in behavior still works: sign in, load `/protected`, confirm
   the role badge and the AI summarize block both render.
5. Post in {{TEAM_CHANNEL}} that the rollback is complete and the incident is
   resolved or being investigated. Do not close the incident until step 3 and 4
   both pass.

## Health checks

`GET /api/health` requires no authentication and returns:

```json
{
  "status": "ok",
  "uptime": 1234.5,
  "version": "0.1.0",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

`src/lib/health.ts` builds this payload; `src/app/api/health/route.ts` is a thin
wrapper so the payload logic is unit tested directly (see `src/tests/health.test.ts`)
without needing a running server. Point uptime monitoring and the deployment
platform's health check at this route.

## Common failures and recovery

| Symptom | Likely cause | Fix | Escalate if |
| --- | --- | --- | --- |
| `/api/health` returns non-200 or times out | App crashed, or the deployment failed to start | Check the deployment platform's logs for a startup error. Roll back to the last known good deployment (see Rollback procedure above). | Health check stays down more than 10 minutes, or more than one rollback is needed in an hour. |
| Sign in redirects back to `/signin` in a loop | `AUTH_SECRET` missing or changed between deploys, invalidating sessions; or the Entra ID redirect URI does not match the deployed domain | Confirm `AUTH_SECRET` is set and stable across deployments. Confirm the Entra ID app registration's redirect URI exactly matches `https://{{DOMAIN}}/api/auth/callback/microsoft-entra-id`. | Cannot restore sign in within 30 minutes. |
| `/protected` or `/api/admin-action` returns 403 for a user who should have access | Role resolution: the user has no role claim and is not on the `RBAC_ADMIN_EMAILS` / `RBAC_EDITOR_EMAILS` allowlist, so `resolveRole()` defaults to viewer | Add the user's email to the appropriate allowlist, or fix the Entra ID app role / group claim mapping in `src/auth.ts`. This is an access change: follow the access approval process in `SUPPORT.md`. | Access model itself seems wrong for more than one user, not a one off. |
| AI summarize block always shows "offline mock mode" in production | `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY` not set in the deployment environment | Set both in the deployment platform's environment configuration and redeploy. | Credentials are set but the mock still shows; check for a typo in the endpoint or an expired key. |
| No telemetry showing up in Application Insights | `APPLICATIONINSIGHTS_CONNECTION_STRING` not set, so `src/observability/otel.ts` is exporting to the console instead | Set the connection string (see `infra/bicep/main.bicep` / `infra/terraform/main.tf` outputs) and redeploy. Console export is the correct default for local development. | Connection string is set but still nothing arrives after 15 minutes. |
| Readiness scorecard drops below 85 in CI | A recent change removed or broke one of the wired in rubric signals (a workflow, a doc, a test, the RBAC or auth wiring) | Read the scorecard's markdown report (job summary on the readiness workflow run) to see which rule regressed, then fix it. | Score cannot be recovered without reverting the change entirely. |

## Secrets rotation

Secrets live in the deployment platform's environment configuration (and, once
`infra/` is deployed, in Azure Key Vault), never in the repository.

- **AUTH_SECRET**: rotate periodically and whenever it may have leaked.
  Rotating invalidates all existing sessions immediately.
- **AUTH_MICROSOFT_ENTRA_ID_SECRET**: rotate per your tenant's client secret
  expiry policy; update the deployment environment before the old secret expires.
- **AZURE_OPENAI_API_KEY**: rotate per your Azure OpenAI resource's key rotation
  policy.

After rotating any secret, redeploy and confirm `/api/health` and a signed in
`/protected` load still succeed before considering the rotation complete.
