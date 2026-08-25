# ADR 0001: Start from the prod-ready-ai-app template

Date: {{DATE}}

Status: Accepted

Author: {{OWNER_NAME}}

## Context

{{TOOL_NAME}} is a new internal AI tool. Every internal tool in this organization
is expected to reach the Production ready lifecycle stage (see
`docs/LIFECYCLE.md` and `docs/RUBRIC.md` in the prod-ready-ai-app toolkit
repository), which requires authentication, role based access control,
observability, tests, CI/CD, infrastructure as code, and a documented support
model, among other rubric items, all before the tool can be trusted with broad
daily use. Building each of these from a blank repository is slow, easy to get
subtly wrong (an auth check missing on one route, a health endpoint nobody
wired up), and produces a different, inconsistent pattern for every tool the
organization operates.

## Decision

We started this repository from `template/` in the prod-ready-ai-app toolkit
repository instead of an empty `create-next-app` project. That gave us, from the
first commit: Auth.js with a Microsoft Entra ID provider and a local development
sign in path, role based access control (`src/lib/rbac.ts`) enforced on a
protected page and an API route, an OpenTelemetry bootstrap with console and
Azure Monitor exporters, a health endpoint, an AI summarize function with an
offline mock and a golden eval dataset, CI/CD workflows that call the toolkit's
reusable automation, and Bicep/Terraform entry points consuming the toolkit's
shared infrastructure modules. The readiness scorecard grades a fresh copy of
the template at or above 85 (the Production ready threshold) before any
tool-specific feature work has even started.

## Consequences

### Positive

- Every rubric category (testing, CI/CD, security, auth and access,
  observability, evaluations, infrastructure as code, documentation, support
  model) has a working example to extend rather than an empty file to fill in.
- The auth and RBAC pattern, the health endpoint shape, and the observability
  wiring are consistent with every other tool started from this template,
  which lowers the cost of an engineer moving between internal tools.
- CI, deploy, and readiness gating are inherited automatically by pointing at
  the toolkit's reusable workflows and actions, rather than hand rolled and
  drifting out of sync with the toolkit's own updates.

### Negative

- We depend on the toolkit repository (`mmoideen/prod-ready-ai-app`)
  staying available and its `main` branch staying stable, since the reusable
  workflows and the readiness action fetch it at CI run time.
- The skeleton's choices (Next.js App Router, Auth.js v5, OpenTelemetry,
  Azure/Bicep or Terraform) are now this tool's choices too. Deviating from them
  later is possible but means re-deriving the rubric compliance those choices
  provided for free.
- The template's placeholder content (sample page copy, the fixed summarize
  sample text, the `{{TOOL_NAME}}` and `{{OWNER_NAME}}` style placeholders
  across the docs) needs to be replaced with this tool's real content; leaving
  it unreplaced is misleading to anyone reading the documentation.

## Alternatives considered

### Start from `create-next-app` with no toolkit scaffolding

**Why rejected:** every rubric item (auth, RBAC, observability, evals, IaC,
docs) would need to be built and reviewed from scratch, with no guarantee it
matches the pattern any other internal tool uses. Slower to reach Production
ready, and more likely to diverge from the organization's standard.

### Copy an existing internal tool's repository as a starting point

**Why rejected:** existing tools carry tool-specific business logic, data
models, and historical decisions that are not relevant to a new tool, and
copying them risks carrying forward whatever rubric gaps that tool has not yet
closed. The template is maintained specifically to stay in sync with the
current rubric; a copied tool is not.

## Follow-up

Revisit this decision if the toolkit template's core choices (Next.js, Auth.js,
OpenTelemetry, the Bicep/Terraform module contract) change in a way
incompatible with this tool's requirements, or if this tool's needs grow
substantially different from what the template assumes (for example, a
non-Node.js runtime, or an auth provider other than Entra ID).
