# Pull Request

## What changed

Describe the changes in this PR, focusing on why they were made rather than just what changed.

## Checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, and `npm run eval` all pass locally
- [ ] Tests added or updated for any behavior change
- [ ] RBAC impact considered: does this change what a role can see or do? Update `src/lib/rbac.ts` and its tests if so
- [ ] Docs updated if applicable (README.md, RUNBOOK.md, PRODUCTION_READINESS.md, docs/THREAT_MODEL.md)
- [ ] No secrets committed, `.env.example` still has only placeholder values
- [ ] Readiness scorecard still passes at or above 85 if this PR touches auth, observability, evals, CI/CD, or documentation

## Notes

Add any additional context or notes here.
