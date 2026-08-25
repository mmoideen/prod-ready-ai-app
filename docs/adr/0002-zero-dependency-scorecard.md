# ADR 0002: The scorecard has zero runtime dependencies

Date: 2026-08-24

Status: Accepted

## Context

The readiness scorecard is the enforcement point for the organization's
production standards. It runs in CI on every pull request of every downstream
tool, and it is executed via `npx` by engineers who have never seen its code.
Anything in its dependency tree becomes part of the supply chain of every
repository that adopts the standard. The target environment operates under
CJIS and FedRAMP style expectations, where the provenance of tooling matters
as much as the provenance of application code.

## Decision

The scorecard ships with zero runtime dependencies. Argument parsing is hand
rolled, reports are rendered with template literals, tests use `node:test` and
`node:assert`, and the only devDependencies are `typescript` and
`@types/node`. Workflow files are inspected with string and regex heuristics
instead of a YAML parser, which the rubric documents as intentional: rules
detect signals, they do not interpret pipelines.

A second consequence of the same posture: the scorecard never executes code
from the repositories it scans. It only reads files, with a depth cap and a
per file size cap, so it is safe to run against untrusted branches in CI.

## Consequences

- `npx` from a clean checkout is fast and cannot be broken by an upstream
  package incident, typosquat, or install script.
- The audit surface for a security review of the standard's enforcement tool
  is exactly this repository.
- Heuristic detection can misread exotic workflow layouts. Rules compensate by
  preferring "not applicable" over false failures, and the rubric documents
  every heuristic so a failing team can see exactly what was searched for.
- Contributors cannot reach for convenience libraries; the rule engine's
  helper module carries the shared utilities instead.

## Alternatives considered

- Commander plus a YAML parser plus a test framework: rejected, roughly forty
  transitive packages to audit for a tool whose whole job is enforcing
  security hygiene.
- Bundling dependencies with a bundler: rejected, hides the dependency tree
  rather than eliminating it, and complicates provenance review.
