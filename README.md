# prod-ready-ai-app

An internal tool lifecycle toolkit: a repeatable way to take internal AI tools
from prototype to production, encoded as reusable scaffolding, reusable
automation, and an enforceable standard.

> Build status: under construction. This README is finalized in Phase 7 of the
> build plan. See `docs/LIFECYCLE.md` and `docs/RUBRIC.md` for the standards that
> everything else in this repository implements.

## Parts

1. `template/`: an application skeleton a team copies to start a new internal AI
   tool with auth, RBAC, observability, evals, CI/CD, and IaC already wired.
2. `.github/workflows/` (reusable) and `actions/`: reusable automation every tool
   inherits.
3. `docs/` and `templates/`: the lifecycle model, promotion gates, and the
   document templates each stage requires.
4. `scorecard/`: a CLI and GitHub Action that scan any repository and grade it
   against the production readiness rubric.
