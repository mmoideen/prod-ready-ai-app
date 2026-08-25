# ADR 0003: Reusable workflows live in .github/workflows, not workflows/

Date: 2026-08-24

Status: Accepted

## Context

The original design sketch placed the reusable `workflow_call` workflows in a
top level `workflows/` directory, alongside `actions/` for composite actions.
That layout reads nicely, but GitHub imposes a hard constraint: a workflow in
another repository can only be called with
`uses: owner/repo/.github/workflows/<file>@ref`. Reusable workflows outside
`.github/workflows/` are simply not callable across repositories, which would
silently break every downstream tool that adopted the standard.

Composite actions have no such constraint: `uses: owner/repo/path@ref`
resolves any path in the repository, so `actions/` works as designed.

## Decision

- Reusable workflows (`reusable-ci.yml`, `reusable-deploy.yml`) live in
  `.github/workflows/` next to this repository's own CI, because GitHub
  requires it.
- The top level `workflows/` directory contains only a README that documents
  the constraint, lists the reusable workflows, and provides copy ready
  consumption snippets, so the discoverable layout from the design sketch
  still exists as a signpost.
- Composite actions remain under `actions/<name>/action.yml` with a README
  each.

## Consequences

- Downstream repositories can actually call the workflows, which is the whole
  point.
- This repository's own CI workflows and the reusable ones share a directory.
  Naming (`reusable-` prefix) keeps them distinguishable, and the reusable
  files trigger only on `workflow_call`, so they never run here directly.
- Anyone who expected `workflows/` to contain the implementations finds the
  explanation and links one click away instead of a confusing empty directory.

## Alternatives considered

- Duplicating the workflows in both places: rejected, two copies of an
  enforcement standard always diverge, and this toolkit's core claim is that
  the standard and its enforcement stay in sync.
- A separate dedicated repository for reusable workflows: rejected for this
  toolkit's scope, it doubles the surface a small platform team maintains and
  weakens the single repository story that makes the toolkit easy to adopt.
