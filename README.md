# prod-ready-ai-app

An internal tool lifecycle toolkit: a repeatable way to take internal AI tools
from prototype to production, encoded as reusable scaffolding, reusable
automation, and an enforceable standard.

[![ci](https://github.com/{{GITHUB_USERNAME}}/prod-ready-ai-app/actions/workflows/ci.yml/badge.svg)](https://github.com/{{GITHUB_USERNAME}}/prod-ready-ai-app/actions/workflows/ci.yml)

## The problem

Internal AI tools multiply faster than standards do. A prototype gets real
users, then real data, then a real outage, and only then does anyone ask about
auth, rollback, evals, or who owns it. Writing a standards document does not
fix this. Nobody reads standards documents at 2am.

This toolkit takes the other path: it operationalizes the standard. The rules
for "production ready" live in a versioned rubric, the rubric is implemented as
a scorecard that grades any repository in seconds, the scorecard gates CI, and
a template skeleton starts every new tool already compliant. The standard is
not a wiki page. It is a failing build.

## What is in the box

| Part | Where | What it does |
| --- | --- | --- |
| Readiness scorecard | [`scorecard/`](scorecard/) | CLI and GitHub Action that scan a repository and grade it against the production readiness rubric. Gates CI below a threshold, or runs advisory. |
| Template skeleton | [`template/`](template/) | Next.js and TypeScript app a team copies to start a new internal AI tool: Entra ID auth, RBAC, OpenTelemetry, health endpoint, eval stub, CI/CD, and IaC already wired. Scores 100 out of the box. |
| Reusable automation | [`.github/workflows/`](.github/workflows/), [`actions/`](actions/) | Reusable CI (with secret scanning), deploy with graceful credential skip, an eval gate, and the readiness scan, consumable from any repo with one `uses:` line. |
| Lifecycle and templates | [`docs/`](docs/), [`templates/`](templates/) | Five lifecycle stages with evidence based promotion gates, and seven document templates (runbook, threat model, postmortem, and more) that the gates require. |
| Infrastructure modules | [`infra-modules/`](infra-modules/) | Key Vault, monitoring, and Postgres (with pgvector) in both Bicep and Terraform, with a shared parameter contract and secure defaults. |
| Working example | [`examples/minimal-ai-tool/`](examples/minimal-ai-tool/) | A zero dependency AI service proving the standard is achievable without a framework. Also scores 100. |

## The lifecycle at a glance

```
Experimental -> Pilot -> Production ready -> Business critical
     |            |             |                  |
  README      auth, tests,   scorecard >= 85,   scorecard >= 92 plus
  and owner   rollback path, runbook, UAT,      on call, postmortems,
  named       score >= 70    support handoff    tested recovery,
                                                access review
```

Full definitions and gates: [`docs/LIFECYCLE.md`](docs/LIFECYCLE.md). The two
highest stakes gates are enforced by the scorecard in CI, so promotion is
evidence based; humans spend review time on judgment, not on checking whether
a runbook file exists.

## The scorecard in action

```bash
cd scorecard && npm install
npx . --path ../examples/minimal-ai-tool --min-score 85
```

```text
# Production Readiness Scorecard

Generated for: examples/minimal-ai-tool
Rubric version: 1.0.0

## Summary

- Score: 100.0 / 100 (Grade A)
- Stage recommendation: Production ready (business critical eligible)
- Applicable weight: 100 / 100

## Category breakdown

| Category               | Passed / Applicable weight |
| ---------------------- | -------------------------- |
| Testing                | 15 / 15                    |
| CI/CD                  | 10 / 10                    |
| Security               | 15 / 15                    |
| Auth and access        | 10 / 10                    |
| Observability          | 12 / 12                    |
| Evaluations            | 10 / 10                    |
| Infrastructure as code |  8 / 8                     |
| Documentation          | 12 / 12                    |
| Support model          |  8 / 8                     |
...
```

20 rules, 9 categories, weights summing to 100. Every rule returns pass, fail,
or not applicable with evidence and a remediation hint; not applicable rules
are excluded from the denominator, so a non AI service is never penalized for
lacking evals. Exit code 1 below `--min-score`, or always 0 with `--advisory`.
JSON output (`--format json`) feeds dashboards and the `--baseline` mode
reports score deltas between runs. Full rubric: [`docs/RUBRIC.md`](docs/RUBRIC.md).

In CI, one block gates any repository:

```yaml
jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: {{GITHUB_USERNAME}}/prod-ready-ai-app/actions/reusable-readiness@main
        with:
          min-score: "85"
```

## Start a new tool

```bash
cp -R template/ ../my-new-tool
```

Then follow [`docs/HOW-TO-START-A-NEW-TOOL.md`](docs/HOW-TO-START-A-NEW-TOOL.md).
The template runs locally without any Azure tenant (a gated local dev sign in
path), and switches to real Entra ID by setting four env vars.

## Grade an existing tool

```bash
cd scorecard && npm install
npx . --path /path/to/any-repo --advisory
```

Advisory mode prints the score and every failing rule with remediation hints,
without failing anything. Teams typically run advisory first, fix the cheap
gaps, then flip on the CI gate.

## How this repository proves itself

The toolkit is graded by its own standard. Top level CI runs the scorecard's
32 tests, verifies the rubric, the manual checklist, and the implemented rules
agree exactly (one rubric, three views), scans for committed secrets, builds
and tests both apps, validates every Bicep and Terraform module, and fails if
`template/` or the example ever drop below 85. If the standard and the
scaffolding diverge, this repository's own build breaks first.

## Repository map

```
docs/            lifecycle model, rubric, how to guide, ADRs
templates/       the seven lifecycle document templates
scorecard/       the readiness scorecard CLI, rules, fixtures, tests
.github/         top level CI plus the reusable workflows (see ADR 0003)
workflows/       signpost README for the reusable workflows
actions/         composite actions: reusable-ci, eval gate, readiness
infra-modules/   bicep/ and terraform/ modules: keyvault, monitoring, postgres
template/        the application skeleton teams copy
examples/        minimal-ai-tool, the zero dependency proof
scripts/         repo hygiene: em dash ban, YAML validation, rubric sync
```

## Design principles

1. **Standards as code.** The rubric is versioned, implemented, and enforced.
   Drift between the document and the tool fails CI.
2. **Evidence based promotion.** Lifecycle gates cite scorecard output, not
   vibes. Stages above Production ready still require human attestation for
   what a scanner cannot see (on call, recovery drills, access reviews).
3. **Zero dependency enforcement.** The scorecard has no runtime dependencies
   and never executes scanned code ([ADR 0002](docs/adr/0002-zero-dependency-scorecard.md)).
   The tool that audits supply chains should not be one.
4. **Paved road, not a gate alone.** Every rule the scorecard checks is
   pre-satisfied by the template, so compliance is the default, not a chore.

## Attribution

Built by {{AUTHOR_NAME}} ([@{{GITHUB_USERNAME}}](https://github.com/{{GITHUB_USERNAME}}))
as a portfolio project demonstrating platform engineering for internal AI
tooling in an Azure environment with strong auditability expectations. Every
named owner, team, and organization in the templates and examples is a
fictional placeholder.

License: [MIT](LICENSE)
