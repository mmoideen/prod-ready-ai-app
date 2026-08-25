<!--
SUPPORT.md for internal-tool-template.
Replace {{TOOL_NAME}}, {{OWNER_NAME}}, {{OWNER_EMAIL}}, {{OWNER_TEAM}},
{{ENG_LEAD_NAME}}, {{TEAM_CHANNEL}}, {{SUPPORT_TICKET_SYSTEM}} with your team's
real values once this template is copied out. This file is what scorecard rule
SUP-1 and the Pilot-to-Production-ready lifecycle gate look for: a named owner.
Keep it current, review quarterly.
-->

# Support for {{TOOL_NAME}}

## Owner

**{{OWNER_NAME}}** ({{OWNER_EMAIL}}), **{{OWNER_TEAM}}**, is the owner of record
for {{TOOL_NAME}}. The owner is accountable for the tool's roadmap, its
production readiness score, and responding to escalations that reach this level.

| Role | Name | Contact |
| --- | --- | --- |
| Owner | {{OWNER_NAME}} | {{OWNER_EMAIL}} |
| Engineering lead | {{ENG_LEAD_NAME}} | {{ENG_LEAD_EMAIL}} |
| Team channel | {{OWNER_TEAM}} | {{TEAM_CHANNEL}} |

## How to get help

1. Check `RUNBOOK.md` first, in particular the Common failures and recovery
   table. Most operational issues are covered there.
2. Open a ticket in {{SUPPORT_TICKET_SYSTEM}}, or post in {{TEAM_CHANNEL}} for
   anything urgent.
3. If the issue is a production outage or a security concern, page via
   {{TEAM_CHANNEL}} directly rather than waiting on a ticket queue.

## Severity and response

| Severity | Definition | First response |
| --- | --- | --- |
| Critical | Tool is down for all users, or a security incident is suspected. | As soon as possible, same day. |
| High | A core feature (sign in, the protected page, the AI summarize function) is broken for some users. | Within one business day. |
| Normal | Anything else: a bug, a question, a small enhancement request. | Best effort, triaged weekly. |

## Access model

Access is role based (`src/lib/rbac.ts`): **viewer** (read only),
**editor** (can edit), **admin** (can also perform the admin only action exposed
at `/api/admin-action`). Roles are assigned from an Entra ID role or group claim
where configured, falling back to the `RBAC_ADMIN_EMAILS` /
`RBAC_EDITOR_EMAILS` allowlists, and otherwise default to viewer. To request a
role change, contact {{OWNER_NAME}} or post in {{TEAM_CHANNEL}}; the owner
approves and makes the change. Review the allowlists and any Entra ID group
membership quarterly, or whenever the user population changes materially.

## Known issues

None yet. This template ships with no known issues; record them here as they are
found, with a workaround and a link to the fix in progress.

## Related documents

- `RUNBOOK.md`: deploy, rollback, health checks, common failures.
- `PRODUCTION_READINESS.md`: the readiness checklist for this tool.
- `docs/THREAT_MODEL.md`: security analysis, including the AI specific risks.
