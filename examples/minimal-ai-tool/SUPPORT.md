# Support

Owner: {{OWNER_NAME}} (platform engineering).

## Support hours

Business hours, Monday to Friday, in the owning team's local time zone.
Outside these hours, treat the tool as best effort: no on-call paging is
configured for this proof-of-concept example.

## Escalation

1. Check `RUNBOOK.md`'s "Common failures" table first.
2. Open an issue against this repository, or contact {{OWNER_NAME}}
   directly.
3. For platform-level issues (the reusable CI/CD workflows, the shared
   `infra-modules/`, or the readiness scorecard itself), escalate to the
   Proready Lifecycle Toolkit's platform team via the toolkit repository.

## Scope note

This is the toolkit's own proof-of-concept example, kept intentionally
minimal. It is not itself a production service; the "readiness" it
demonstrates is that a plain TypeScript tool with zero runtime
dependencies can meet the toolkit's scorecard bar. See
`PRODUCTION_READINESS.md` for the full rule by rule checklist.
