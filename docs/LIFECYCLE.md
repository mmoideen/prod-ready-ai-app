# Internal Tool Lifecycle

Version: 1.0.0

Every internal tool in this organization is in exactly one of five stages. Each
stage defines what must be true, who signs off, and which documents are required.
Promotion between stages is evidence based: the two highest value gates are tied
directly to the readiness scorecard so that "ready" is a measurement, not an
opinion.

```
Experimental -> Pilot -> Production ready -> Business critical
                                  \
                                   -> Deprecated (any stage can move here)
```

## Stage summary

| Stage | Meaning | Gate to advance |
| --- | --- | --- |
| Experimental | A prototype exploring an idea. No support promise. | README and a named owner exist before anyone outside the author uses it. |
| Pilot | In limited real use by a small, known group. | Auth, basic tests, error handling, and a rollback path exist. Scorecard at 70 or above. |
| Production ready | Approved for broad daily use. | Scorecard at 85 or above, runbook and support model in place, UAT signed off. |
| Business critical | Failure materially harms the business. | Scorecard at 92 or above plus the manual gates: on call coverage, postmortem process, tested recovery, periodic access review. |
| Deprecated | Being retired. | Documented sunset plan, data disposition, and user communications. |

## Stage definitions

### 1. Experimental

**Meaning.** A prototype exploring whether an idea is worth pursuing. It may be
broken, insecure, and undocumented. It must never touch production data or real
user credentials.

**What must be true**

- The repository exists under the organization, not a personal account.
- No production data, no production credentials, no CJIS scoped data of any kind.
- Clearly labeled as experimental in the README.

**Sign off.** None. Anyone may create an experimental tool.

**Required documents.** None yet, but the exit gate below requires the first two.

**Gate to advance to Pilot**

- A README describes what the tool does, who it is for, and how to run it
  (scorecard rule DOC-1).
- An owner is named (scorecard rule SUP-1).
- Authentication exists in front of the tool (scorecard rule AUTH-1).
- The owner's manager approves a limited pilot group.

### 2. Pilot

**Meaning.** In limited real use by a small, known group of users who understand it
is a pilot. Feedback is being gathered. Failure is annoying but contained.

**What must be true**

- Auth in front of every entry point. Pilot users are enumerated, not "anyone with
  the link".
- Basic tests exist and run in CI (TEST-1, TEST-2, TEST-3, CICD-1).
- Errors are handled and visible: the tool logs failures and has a health endpoint
  (OBS-1, OBS-2).
- A rollback path exists and has been exercised at least once (documented in the
  draft runbook).
- Secrets live in a vault or environment configuration, never in the repository
  (SEC-2, SEC-3).
- Scorecard score is 70 or above.

**Sign off.** The owning team's engineering lead.

**Required documents.** Draft runbook ([`templates/RUNBOOK.md`](../templates/RUNBOOK.md)),
UAT plan started ([`templates/UAT_CHECKLIST.md`](../templates/UAT_CHECKLIST.md)).

**Gate to advance to Production ready**

- Readiness scorecard at or above 85 (the production threshold) in CI, enforced by
  the readiness workflow, not run by hand.
- The production readiness checklist
  ([`templates/PRODUCTION_READINESS.md`](../templates/PRODUCTION_READINESS.md)) is
  completed and reviewed. The checklist mirrors the scorecard rubric one to one, so
  the manual and automated views must agree.
- UAT checklist completed and signed off by a representative of the real user group.
- Runbook completed, including deploy, rollback, health checks, and common failures.
- Support handoff completed
  ([`templates/SUPPORT_HANDOFF.md`](../templates/SUPPORT_HANDOFF.md)): owner, support
  hours, escalation path.
- Threat model completed ([`templates/THREAT_MODEL.md`](../templates/THREAT_MODEL.md)),
  including the AI specific sections (prompt injection, data exfiltration through
  model outputs) when the tool calls a model.
- For AI tools: an eval dataset and runner exist and gate CI (EVAL-1, EVAL-2).

### 3. Production ready

**Meaning.** Approved for broad daily use across the organization. Users may rely
on it without knowing who built it. It has a support model and a paper trail.

**What must be true**

- Everything from Pilot, continuously enforced by CI: the readiness workflow runs
  the scorecard with `--min-score 85` and blocks merges below threshold.
- Runbook, support handoff, UAT sign off, and threat model are current.
- Access is role based and reviewed when the user population changes (AUTH-2).
- Infrastructure is declared as code and deployed through the pipeline, not by hand
  (IAC-1, CICD-2).
- Dependency updates are automated (SEC-4).

**Sign off.** Engineering lead plus the platform team.

**Required documents.** Completed production readiness checklist, runbook, support
handoff, UAT checklist, threat model. ADRs
([`templates/ADR.md`](../templates/ADR.md)) for significant decisions.

**Gate to advance to Business critical**

- Readiness scorecard at or above 92, sustained in CI.
- The four manual gates below are all true. The scorecard cannot measure these, so
  a human attests to each one in the promotion pull request:
  1. On call coverage exists with a defined rotation and paging path.
  2. An incident postmortem process is adopted
     ([`templates/INCIDENT_POSTMORTEM.md`](../templates/INCIDENT_POSTMORTEM.md)) and
     has been exercised, in an incident or a game day.
  3. Backups or recovery paths exist and have been tested with a recorded restore
     drill, including RTO and RPO targets.
  4. Periodic access review is scheduled (quarterly at minimum) and the first review
     is complete.

### 4. Business critical

**Meaning.** Failure materially harms the business: revenue, safety, legal
exposure, or a regulated commitment. The tool is treated like a product.

**What must be true**

- Everything from Production ready.
- On call rotation staffed, paging tested.
- Postmortems written for every user facing incident, with tracked action items.
- Recovery drills repeated on a schedule, results recorded in the runbook.
- Access reviews run on schedule, results recorded.
- Capacity and cost are monitored with alerts, not discovered.

**Sign off.** Engineering lead, platform team, and the business owner of the
affected process.

**Required documents.** All Production ready documents, kept current, plus
postmortems and access review records.

**Gate to advance.** There is no stage above Business critical. The remaining
transition is to Deprecated.

### 5. Deprecated

**Meaning.** Being retired. No new users, no new features. The remaining work is a
safe landing for existing users and their data.

**What must be true**

- A sunset plan exists with dates: announcement, read only, shutdown.
- Data disposition is decided and documented: what is deleted, what is archived,
  where, for how long, and who approved it. For regulated data, retention rules are
  cited.
- Users have been notified through a recorded channel, with a migration path if a
  replacement exists.
- The repository is archived after shutdown, and its credentials are revoked.

**Sign off.** The owner and the platform team.

**Required documents.** Sunset plan (an ADR is fine), final support handoff noting
the end of support date.

## How the scorecard ties in

The scorecard ([`docs/RUBRIC.md`](RUBRIC.md)) turns the two highest stakes gates
into CI checks:

- **Pilot to Production ready** requires `--min-score 85` passing in CI.
- **Production ready to Business critical** requires `--min-score 92` in CI plus
  the four attested manual gates.

Scores are necessary but not sufficient. A human still signs off at every gate.
The scorecard exists so that humans spend their review time on judgment, not on
checking whether a runbook file exists.
