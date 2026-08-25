# ADR 0001: Record architecture decisions

Date: 2026-08-24

Status: Accepted

## Context

This toolkit exists to make internal tool standards explicit and enforceable.
The standards themselves are the product, so the reasoning behind them must be
written down where reviewers and future maintainers can find it. Decisions made
in chat or in someone's head do not survive team changes.

## Decision

We record every significant architecture decision as an Architecture Decision
Record (ADR) in `docs/adr/`, numbered sequentially, using the format defined in
`templates/ADR.md` (context, decision, consequences, alternatives considered).

A decision is significant when it constrains future work: technology selection,
security posture, public interfaces, scoring semantics, or anything a downstream
team inherits by consuming this toolkit.

## Consequences

- Reviewers of this repository can audit why, not just what.
- Downstream teams copying the template skeleton inherit the same practice, since
  the skeleton ships with the ADR template and an example record.
- Superseded decisions are not deleted. A new ADR marks the old one as superseded
  so the history stays honest.

## Alternatives considered

- A single DECISIONS.md file: rejected, it grows unreadable and merge conflicts
  concentrate in one file.
- Recording decisions only in pull request descriptions: rejected, PR history is
  hard to search and invisible once a repository is forked or migrated.
