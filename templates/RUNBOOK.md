<!-- 
RUNBOOK.md template
Operational runbook for {{TOOL_NAME}}.
Replace {{TOOL_NAME}}, {{REPO_URL}}, {{DASHBOARD_URL}}, {{TEAM_CHANNEL}}, {{ON_CALL_PAGER}}, {{VERCEL_PROJECT}}, etc.
Deploy is normally via CI. Break glass path is last resort only.
Verify rollback worked before considering incident resolved.
On-call ref is for the first 15 minutes; deeper issues escalate to lead.
-->

# Runbook for {{TOOL_NAME}}

Production operations guide. Normal flow is CI-driven deployment. Break glass and rollback
procedures are for emergencies. Always page on-call if uncertain.

---

## Service Overview

| Item | Value |
| --- | --- |
| **Service** | {{TOOL_NAME}} |
| **Owner** | {{OWNER_TEAM}} (lead: {{OWNER_NAME}}) |
| **Support hours** | {{SUPPORT_HOURS}} (escalate outside hours via {{ON_CALL_PAGER}}) |
| **Repository** | {{REPO_URL}} |
| **Dashboard** | {{DASHBOARD_URL}} |
| **Logs** | {{LOG_QUERY_URL}} (search: `service:"{{TOOL_NAME}}"`) |
| **Alerts** | {{ALERTING_PLATFORM}} ({{ALERT_CHANNEL}}) |

---

## Architecture at a Glance

{{TOOL_NAME}} is deployed on Vercel with Azure backend.

```
Client browser
    ^
    | (HTTPS, Entra ID auth via @azure/msal-browser)
    v
Vercel (Next.js API routes + pages)
    ^
    | (connection pooling, TSL required)
    v
Azure Database for PostgreSQL (Flexible Server)

Side: Azure Key Vault (secrets: DB password, API keys, signing keys)
Side: Application Insights (traces, exceptions, custom metrics)
```

**Key components:**
- **Frontend:** Next.js pages, auth guard on {{BASE_URL}}/api/*, client-side Entra ID sign-in.
- **Backend:** Next.js API routes in pages/api/. Route guard middleware checks JWT and role.
- **Database:** Azure Postgres (flexible server). Credentials in Key Vault.
- **Observability:** Application Insights. Health checks hit /health. Structured logs via pino.
- **AI integration:** Calls {{MODEL_PROVIDER}} (e.g., Anthropic Claude, OpenAI). API key in Key Vault. Prompts in `src/prompts/`. Evals in `evals/`.

---

## Deploy Procedure

### Normal Path (via CI)

1. **Push to main branch (or merge a pull request).**
   CI workflow `.github/workflows/deploy.yml` triggers automatically.

2. **Automated tests run.**
   - `npm test`: unit and integration tests.
   - Scorecard: `npx prod-ready-scorecard --path . --min-score 85` (run from a checkout of the toolkit repository until the package is published; CI uses the reusable-readiness action either way).
   - Secret scan: gitleaks check (zero secrets committed).
   - If any step fails, deployment is blocked. Fix the issue and retry.

3. **Deploy to Vercel (automatic).**
   Vercel webhook is triggered. Deployment URL is {{VERCEL_PROJECT}}.
   - Environment variables are injected from Vercel project settings.
   - Database migrations (if any) run before app start (see Deployment settings in Vercel dashboard).
   - Health check: Vercel polls /health every 10 seconds until it passes 3x. If it fails after 5 minutes, deployment is rolled back automatically.

4. **Verify in production.**
   Once Vercel marks deployment successful:
   - Check dashboard at {{DASHBOARD_URL}}.
   - Query logs: search Application Insights for `service:"{{TOOL_NAME}}"` severity != "Error" (should see normal traffic).
   - Hit /health endpoint: expect HTTP 200 with `{ "status": "ok", "timestamp": "2024-..." }`.
   - Spot check a user-facing action (e.g., query an AI model, retrieve a document). Latency should be < 2 seconds p99.

5. **Done.** Rollback is automatic if health check fails. Otherwise, you are live.

### Break Glass Manual Path (Rare)

Use **only** if CI is down and production is broken.

**Prerequisite:** You must have `vercel` CLI installed and be authenticated to Vercel.
```bash
npm install -g vercel
vercel login
```

**Steps:**
1. **Ensure you are on the correct branch and commit.**
   ```bash
   git log -1 --oneline   # verify commit is safe
   ```

2. **Deploy directly to Vercel.**
   ```bash
   VERCEL_BYPASS_DRS=1 vercel --prod --token {{VERCEL_TOKEN_SECRET}}
   ```
   (Fetch {{VERCEL_TOKEN_SECRET}} from Key Vault: `az keyvault secret show --vault-name {{KEYVAULT_NAME}} --name vercel-deploy-token`.)

3. **Environment variables are loaded from Vercel project settings automatically. Do not pass them on the command line.**

4. **Wait for deployment to complete.** Vercel outputs a URL. Open it and check /health.

5. **Immediately notify {{TEAM_CHANNEL}} that a manual deployment occurred.** Include the commit hash and reason.

---

## Rollback Procedure

**Always verify rollback worked before ending the incident.**

### Automatic Rollback (Vercel Health Check)

If the new deployment's /health endpoint fails 3x within 5 minutes, Vercel automatically reverts to the previous successful deployment. You will receive an alert. Check the Vercel dashboard to confirm the revert happened.

### Manual Rollback (if automatic failed or you chose wrong commit)

1. **Identify the last known good deployment.**
   Go to Vercel dashboard, Deployments tab. Find the most recent one with a green checkmark and timestamp before the incident started.
   Note its **Deployment ID** (e.g., `dpl_abc123xyz`).

2. **Promote that deployment to production.**
   ```bash
   vercel promote {{DEPLOYMENT_ID}} --token {{VERCEL_TOKEN_SECRET}}
   ```

3. **Verify rollback succeeded.**
   ```bash
   curl https://{{DOMAIN}}/health
   # expect: { "status": "ok", ... }
   ```

4. **Check logs.**
   Search Application Insights: `service:"{{TOOL_NAME}}" | where timestamp > ago(5m)`.
   Should see normal traffic patterns, no exceptions.

5. **Spot check a user-facing action.**
   Execute a query or retrieve a document. Should complete in < 2 seconds.

6. **If rollback worked:** End the incident and plan a post-mortem. If not working, page the on-call lead immediately (see On-call quick reference below).

---

## Health Checks

The production readiness gate depends on the health endpoint. Keep it fast and accurate.

### /health Endpoint

**URL:** `GET https://{{DOMAIN}}/health`

**Expected response (HTTP 200):**
```json
{
  "status": "ok",
  "timestamp": "2024-10-15T14:30:00Z",
  "database": "connected",
  "externalServices": {
    "entraId": "responding",
    "modelProvider": "responding"
  }
}
```

**Check logic:**
- Postgres connection pool can acquire a connection within 1 second (SELECT 1).
- Entra ID OpenID config endpoint is reachable (typically cached, sub-500ms).
- Model provider (if used) is not actively failing (cached health status, not a real API call).
- If any check fails, return HTTP 503 with `"status": "degraded"`.

**Alert:** If /health returns non-200 for 2 minutes or more, an alert fires to {{ALERT_CHANNEL}}.

### Log Query for Ongoing Health

In Application Insights, run this query to see error rate over the last hour:

```kusto
traces
| where service == "{{TOOL_NAME}}" and timestamp > ago(1h)
| summarize ErrorCount = count(tostring(severity)) by bin(timestamp, 5m), severity
| order by timestamp desc
```

A healthy service shows mostly `Informational` and `Info` logs, no spikes in `Error` or `Critical`.

---

## Common Failures and Recovery

| Symptom | Likely Cause | Fix | Escalate if |
| --- | --- | --- | --- |
| /health returns 503, database connection fails | Postgres is down or network unreachable | Check Azure portal: navigate to Azure Database for Postgres > Connection security. Verify firewall rule allows Vercel IP 76.76.21.0/24. If rule is correct, check Postgres status in Azure portal. If down, scale-up or failover from backup (contact {{DB_OWNER}}). | Database stays down after 10 minutes or more than 1 failover per hour. |
| User queries time out or "gateway timeout" error | Model provider API is slow or overloaded | Check Application Insights for slow traces in `src/lib/ai.ts`. Review {{MODEL_PROVIDER}} status page ({{MODEL_PROVIDER_STATUS_URL}}). If provider is down, users will see "Service temporarily unavailable". Add fallback response. | Provider outage lasts > 30 minutes or SLA is breached. |
| 401 Unauthorized / "user not authenticated" after sign-in | Entra ID token validation fails, or mismatch in role claims | Check Application Insights for traces in `src/middleware/auth.ts`. Compare the role claim in the decoded token (decode at jwt.io, copy from browser DevTools console `getTokenClaims()`) with the expected role list in `src/config/roles.ts`. If mismatch, contact {{ENTRA_ID_OWNER}} to verify group membership. | User cannot sign in after 5 minutes or > 10 users report the issue. |
| Deployment hangs or never reaches "ready" state | Vercel build times out, or post-deploy health checks fail repeatedly | Check Vercel build logs: look for long install time or database migration script hanging. If migrations are slow, contact {{DB_OWNER}}. If build is slow, check for large dependencies (run `npm ls --depth=0` and look for > 50MB packages). | Build takes > 30 minutes or deployment is still not ready after 1 hour. |

---

## Secrets Rotation

Secrets are stored in Azure Key Vault and injected by Vercel at deploy time. Rotate on a schedule to limit blast radius if a secret is leaked.

### Rotation Schedule

- **Database password:** Every 90 days. Coordinate with {{DB_OWNER}}.
- **API keys (model provider, third-party APIs):** Every 60 days. Check service docs for rotation best practices.
- **Signing keys (JWT secret, etc.):** Every 180 days or if a key is suspected compromised.
- **Vercel deploy token:** Every 90 days.

### Rotation Steps (general)

1. **Generate a new secret** (e.g., new DB password in Azure portal, new API key in provider dashboard).
2. **Add the new secret to Key Vault** with a new version or parallel name (e.g., `db-password-v2`).
3. **Update Vercel environment variable** to point to the new secret. Trigger a redeployment (`git commit --allow-empty -m "Rotate secrets" && git push origin main`).
4. **After deployment succeeds and health checks pass, delete the old secret** from Key Vault.
5. **Document the rotation** in the team wiki or a ticket for audit purposes.

---

## On-Call Quick Reference (First 15 minutes)

You are on-call. An alert fired. What do you do?

1. **Acknowledge the alert.** Open {{ALERT_CHANNEL}} and {{ON_CALL_PAGER}}.

2. **Check status dashboard immediately.**
   Go to {{DASHBOARD_URL}}.
   - Is it red? (error rate > 5%, latency p99 > 5s, or downtime?)
   - Check /health endpoint: `curl https://{{DOMAIN}}/health`.
   - Expected: HTTP 200, all checks "ok". If not, service is degraded.

3. **Read the alert message carefully.** It names the failing component (database, model provider, auth, etc.). Scroll to the Common Failures table above; find your symptom.

4. **If it's a quick fix (e.g., database firewall rule, secrets sync), fix it now.** Verify /health returns 200. Confirm user traffic resumes in logs.

5. **If you are unsure, page the on-call lead immediately.** Do not guess. The lead has full access and context.
   ```bash
   # Page the lead (command depends on your paging service, e.g., PagerDuty):
   pd trigger --escalation-policy {{ESCALATION_POLICY_ID}} --title "{{TOOL_NAME}} degraded, need lead"
   ```

6. **Document the incident.** Take screenshots of alerts, errors, and timings. After the incident is over (see Runbook close below), use this data for the post-mortem (see ../INCIDENT_POSTMORTEM.md).

### Runbook Close

When the service is healthy again:
- [ ] /health endpoint returns 200.
- [ ] Error rate is normal (< 0.1%, or previous baseline).
- [ ] Latency p99 is back to normal (< 2 seconds).
- [ ] No user reports of continued issues.

If incident was customer-impacting (latency > 5 min, or any downtime):
- [ ] File a ticket for post-mortem analysis (template: ../INCIDENT_POSTMORTEM.md).
- [ ] Notify {{TEAM_CHANNEL}} that service is restored and investigation is pending.

---

## Dependencies and Owners

| Component | Owner | Escalation Path | Notes |
| --- | --- | --- | --- |
| Azure Database for PostgreSQL | {{DB_OWNER}} | {{DB_OWNER_MANAGER}} | Backups daily, retention 35 days. On-call contact: {{DB_ONCALL_NUMBER}}. |
| Vercel deployment | {{DEVOPS_TEAM}} | {{DEVOPS_LEAD}} | Webhook configured for main branch. Monitoring via Vercel dashboard. |
| Entra ID / Azure AD | {{IAM_OWNER}} | {{IAM_OWNER_MANAGER}} | OIDC config in application registration. Token validation checked every request. |
| {{MODEL_PROVIDER}} API | {{MODEL_API_OWNER}} | {{MODEL_PROVIDER_SUPPORT_URL}} | API key rotated every 60 days. Fallback to cached response if API times out. |
| Application Insights | {{MONITORING_OWNER}} | {{MONITORING_LEAD}} | Data retention: 90 days. Queries and alerts owned by {{TOOL_NAME}} team. |
| Azure Key Vault | {{KEYVAULT_OWNER}} | {{KEYVAULT_OWNER_MANAGER}} | Access via managed identity (Vercel deployment identity). Audit logs retained 365 days. |
