# internal-tool-template

This is the application skeleton the prod-ready-ai-app platform engineering toolkit
hands to a team starting a new internal AI tool. It is a small, real Next.js and
TypeScript app, not a mockup: authentication, role based access control,
observability, an AI summarize function with offline evals, CI/CD, and
infrastructure as code are wired in from the first commit, so the production
readiness scorecard grades a fresh copy of this repository at or above the
Production ready threshold (85 out of 100). See "How the scorecard grades this
repository" below.

## What this template gives you

- **Next.js 15 App Router, TypeScript strict mode.** `src/app/` for routes,
  `src/lib/` for framework free logic, `src/tests/` for unit tests.
- **Auth.js (next-auth v5)** with a Microsoft Entra ID provider configured from
  environment variables, plus a "Local development" credentials provider so the
  whole app is exercisable with no tenant. See "Auth: two paths" below.
- **Role based access control** (`src/lib/rbac.ts`): three roles (viewer, editor,
  admin), enforced server side on the `/protected` page and on
  `POST /api/admin-action` (401 signed out, 403 without the permission).
- **A health endpoint** at `/api/health`, no authentication required, returning
  status, uptime, and version as JSON.
- **OpenTelemetry** (`src/observability/otel.ts`, wired through
  `src/instrumentation.ts`): spans export to the console by default, and to Azure
  Monitor instead when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set. Every
  OpenTelemetry import is dynamic and guarded by
  `process.env.NEXT_RUNTIME === "nodejs"`, so these packages never reach the edge
  bundle and never break `next build`.
- **An AI summarize function** (`src/lib/ai.ts`): a client factory that returns a
  real Azure OpenAI backed client when `AZURE_OPENAI_ENDPOINT` and
  `AZURE_OPENAI_API_KEY` are set, and a deterministic offline mock with the same
  interface otherwise, so the app, its tests, and its evals all work with zero
  external configuration.
- **Evals** (`evals/`): a golden dataset (`dataset.jsonl`) and a runner
  (`run.mjs`, wired to `npm run eval`) that scores `summarize()` against
  deterministic checks and exits non zero below the pass threshold.
- **CI/CD** (`.github/workflows/`): `ci.yml`, `eval.yml`, `deploy.yml`, and
  `readiness.yml` all call this toolkit's reusable automation. They are inert
  while this file sits inside the toolkit repository (GitHub only runs root
  level workflows) and activate once you copy `template/` out. See the comment
  at the top of each workflow file.
- **Infrastructure as code** (`infra/`): a Bicep entry point and a Terraform
  entry point, both consuming the toolkit's shared `infra-modules/` (Key Vault,
  Monitoring, PostgreSQL). See `infra/README.md`.

This is intentionally a skeleton, not a feature rich product: the goal is to prove
the wiring works, not to ship business logic. Replace the sample page content and
the `summarize()` prompt with your tool's real behavior.

## Quickstart

```bash
npm install
cp .env.example .env.local
# edit .env.local: set AUTH_SECRET and AUTH_LOCAL_DEV=true for local development
npm run dev
```

Open http://localhost:3000, sign in with the local development path, then visit
`/protected`. `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, and
`npm run eval` all run with no further configuration.

Generate a real `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

## Auth: two paths

### Local development (no tenant required)

Set in `.env.local`:

```
AUTH_SECRET=<any random string, see openssl command above>
AUTH_LOCAL_DEV=true
```

This registers a "Local development" credentials provider on `/signin` that signs
in a fake user with a role you choose (viewer, editor, or admin), so you can
exercise every part of the app, including RBAC, without a real Microsoft Entra ID
tenant. It is only ever registered when both of these are true:
`NODE_ENV !== "production"` **and** `AUTH_LOCAL_DEV === "true"`. The `NODE_ENV`
check is not configurable, so this path cannot become active in a production
deployment even if `AUTH_LOCAL_DEV=true` leaks into a production environment by
mistake.

### Microsoft Entra ID (real tenant)

1. Register an app in Entra ID (Azure Active Directory), App registrations > New
   registration. Add a web redirect URI:
   `<your-deployment-url>/api/auth/callback/microsoft-entra-id` (for local
   development: `http://localhost:3000/api/auth/callback/microsoft-entra-id`).
2. Create a client secret under Certificates & secrets.
3. Set in `.env.local` (or your deployment's environment configuration):

   ```
   AUTH_MICROSOFT_ENTRA_ID_ID=<application (client) ID>
   AUTH_MICROSOFT_ENTRA_ID_SECRET=<client secret value>
   AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
   ```

4. The Entra ID provider is only registered when both the ID and secret are
   present, so the app degrades gracefully (the sign in button is simply not
   shown) when they are not configured.

### Role assignment

`src/lib/rbac.ts` resolves a role in this order: (1) an explicit role claim from
the identity provider (the role chosen at local dev sign in, or an Entra ID app
role / group claim you map in `src/auth.ts`), (2) the `RBAC_ADMIN_EMAILS` /
`RBAC_EDITOR_EMAILS` allowlists, (3) otherwise `viewer`. Replace step 2 with your
tenant's real Entra ID app role or group claim mapping once you have one; the env
allowlist exists so the template has a working, testable role assignment path
with zero external configuration.

## How the scorecard grades this repository

Run the readiness scorecard from the toolkit repository root:

```bash
node scorecard/dist/cli.js --path template --min-score 85
```

Or, once this template is copied out to its own repository, the `readiness.yml`
workflow (see above) runs the same check on every push and pull request via the
`reusable-readiness` action, gating merges below a score of 85, the Production
ready threshold defined in `docs/RUBRIC.md` and `docs/LIFECYCLE.md`. The 20 rule
checklist mirroring the scorecard rubric is filled in at
`PRODUCTION_READINESS.md`.

Every wiring choice in this template exists to satisfy one or more rubric rules:
Auth.js and RBAC for the auth and access category, OpenTelemetry and the health
route for observability, the evals dataset and runner for the evaluations
category (only applicable because this is an AI tool), the Bicep/Terraform entry
points for infrastructure as code, and this README plus `RUNBOOK.md`,
`PRODUCTION_READINESS.md`, and `SUPPORT.md` for documentation and support.

## Owner

{{OWNER_NAME}} ({{OWNER_TEAM}}) owns this copy of the template until a team
renames it and takes it over. See `SUPPORT.md` for the full support model,
escalation path, and access model.

## Project layout

```
src/app/            Routes: /, /signin, /protected, /api/health,
                     /api/admin-action, /api/auth/[...nextauth]
src/lib/             Framework free logic: rbac.ts, ai.ts, health.ts, version.ts
src/observability/   OpenTelemetry bootstrap
src/tests/           node:test unit tests, run via tsx
evals/               Golden dataset and eval runner for summarize()
infra/               Bicep and Terraform entry points
.github/workflows/   CI, eval gate, deploy, and readiness workflows (see note above)
docs/                Threat model and architecture decision records
```
