<!-- 
SUPPORT_HANDOFF.md template
Support model handoff from dev team to ops/support team.
Fill in owner, support hours, escalation, known issues, access model.
This document is signed off when a tool reaches Production ready stage.
Update this quarterly or when ownership changes.
-->

# Support Handoff for {{TOOL_NAME}}

Operational support model and escalation path. Signed when {{TOOL_NAME}} reaches Production ready.

---

## Owner and Team

| Role | Name | Contact | Notes |
| --- | --- | --- | --- |
| **Product owner** | {{OWNER_NAME}} | {{OWNER_EMAIL}} | Owns roadmap and feature decisions. Approves breaking changes. |
| **Engineering lead** | {{ENG_LEAD_NAME}} | {{ENG_LEAD_EMAIL}} | On-call escalation point for L2/L3 issues. Approves deployments. |
| **On-call rotation** | {{ONCALL_SCHEDULE_LINK}} | {{ONCALL_PAGER_URL}} | Rotates every week. Page via {{ONCALL_PAGER}}. |
| **Support team** | {{SUPPORT_TEAM_NAME}} | {{SUPPORT_CHANNEL}} | First responder for user issues. Triages to L2. |
| **Platform team** | {{PLATFORM_TEAM}} | {{PLATFORM_CHANNEL}} | Owns infrastructure, CI/CD, security scanning. Escalation for platform-level issues. |

---

## Support Hours and Response Expectations

| Severity | Definition | Support Hours | First Response SLA | Resolve by SLA | Escalate if |
| --- | --- | --- | --- | --- | --- |
| **Critical** | Production outage. No users can access the tool, or a core workflow is completely broken. Data loss risk or security incident. | 24x7 via {{ONCALL_PAGER}} | 15 minutes | 4 hours or incident ongoing | Not resolved after 2 hours or incident involves CJIS data / compliance breach. |
| **High** | Major feature broken, frequent crashes, or severe performance degradation (latency > 10 seconds p99). Workaround exists but difficult. | {{BUSINESS_HOURS}} + on-call after hours | 1 hour (business hours), 30 min (after hours) | 24 hours | Not resolved after 4 hours. |
| **Medium** | Feature works but with limitations, or one user cannot complete a task (workaround available). No data loss. | {{BUSINESS_HOURS}} only | 4 hours | 5 business days | Open after 2 weeks. Escalate to product owner for prioritization. |
| **Low** | Cosmetic issue, typo, minor UI polish. Feature works. | {{BUSINESS_HOURS}} only | Best effort (no SLA) | As resources allow | N/A (backlog item). |

**Severity guide:** If you are unsure, ask the user what they cannot do. If a business workflow is blocked, it is Critical or High.

---

## Escalation Path

**Level 1 (Support team):** {{SUPPORT_TEAM_NAME}}
- Receive user reports via {{SUPPORT_TICKET_SYSTEM}} (e.g., Jira Service Desk, Azure DevOps, email).
- Triage: is the issue known (see Known Issues table)? If yes, provide workaround. If no, proceed to L2.
- Follow runbook first (see ../RUNBOOK.md, Common Failures section).
- Escalate to L2 if issue is not in runbook or known issues, or if you are unsure.

**Level 2 (Engineering lead):** {{ENG_LEAD_NAME}} (backup: {{ENG_LEAD_BACKUP}})
- On-call engineer or engineering lead when L1 escalates.
- Has access to logs, dashboard, database (via {{LOGGING_PLATFORM}}, {{DASHBOARD_URL}}).
- Can review code, trigger manual deployments, rotate secrets.
- Resolves or provides a fix / workaround. Communicates status to L1.
- Escalate to L3 if issue requires infrastructure changes, platform team involvement, or security review.

**Level 3 (Platform team):** {{PLATFORM_TEAM}}
- Owns infrastructure, CI/CD, security, and shared services.
- Can add firewall rules, scale databases, modify Key Vault access policies, or coordinate org-wide changes.
- Escalate to L3 for: database failover, network issues, Key Vault permission changes, CJIS/FedRAMP compliance questions, and security incidents.
- Contact: {{PLATFORM_CHANNEL}}, page via {{PLATFORM_ONCALL_PAGER}}.

**Example escalation flow:**
1. User reports "I cannot see any data when I log in." Ticket created by support.
2. L1 (support) checks Known Issues. Not there. Checks runbook: "401 Unauthorized" is there. Runbook says to contact {{ENTRA_ID_OWNER}}. L1 pages the on-call engineer (L2).
3. L2 (on-call) checks Entra ID token validation logic. Finds a role claim mismatch. Contacts {{ENTRA_ID_OWNER}} (L3).
4. L3 ({{ENTRA_ID_OWNER}}) confirms user was not added to the required Entra ID security group. Adds user. User can now log in.
5. L1 confirms with user. Issue closed.

---

## Known Issues and Workarounds

Document issues that users or support teams encounter frequently. Update this table as new issues are discovered.

| Issue | Symptom | Workaround | Permanent Fix | Opened | Closed | Recurring |
| --- | --- | --- | --- | --- | --- | --- |
| Slow document retrieval on first load | After uploading a document, the first query takes 10+ seconds. Subsequent queries are fast. | Queries are asynchronous. Wait for response. Reload page if stuck. | Pre-index documents on upload. Planned for v2.0 in {{PLANNED_FIX_DATE}}. | {{DATE_OPENED}} | Open | No, only first load. |
| Intermittent 502 gateway timeout | Requests fail with HTTP 502 after running fine. Retry usually succeeds. | Retry the request (browser refresh or "Try again" button). | Increase Vercel function timeout or optimize slow query. See ticket {{TICKET_ID}}. | {{DATE_OPENED}} | {{DATE_CLOSED}} | Yes, occurs every 3-4 days. Escalate if > 5 per hour. |
| Export to PDF is blank | User exports chat to PDF, file is empty or malformed. | Workaround: copy-paste chat to Word or Markdown instead. | Implement PDF export properly. In progress, due {{DUE_DATE}}. | {{DATE_OPENED}} | Open | No. |

---

## Access Model

Who can use {{TOOL_NAME}}, and who approves access.

**User groups:**
- **Pilot users (Pilot stage):** {{PILOT_USER_GROUP}}. Enumerated list. Access managed by {{ACCESS_APPROVER}}.
- **Production users (Production ready stage):** {{PRODUCTION_USER_GROUP}} (e.g., "All employees in department X and Y", "Any employee with Entra ID role Sales Manager or above"). Access via Entra ID security group: {{ENTRA_ID_GROUP_NAME}}.
- **Power users / admins (Business critical stage):** {{ADMIN_GROUP}} (e.g., {{ADMIN_TEAM}}). Can configure settings, manage users, see audit logs. Entra ID role: {{ADMIN_ROLE}}.

**Access approval process:**
1. User or their manager requests access via {{ACCESS_REQUEST_SYSTEM}} (e.g., "Request access to {{TOOL_NAME}}" in ServiceNow or email {{ACCESS_APPROVER}}).
2. {{ACCESS_APPROVER}} verifies user is in the approved group (department, role, etc.). If yes, adds user to Entra ID security group.
3. User logs in within 1 hour. Access is effective immediately (Entra ID token refresh on next sign-in).
4. Access review: quarterly, {{REVIEW_SCHEDULE}} ({{REVIEW_DUE_DATE}}). {{ACCESS_APPROVER}} audits the security group membership. Removes users who have changed roles or left the company. Files a record in {{AUDIT_LOG_LOCATION}}.

**RBAC (role-based access control):**

Within {{TOOL_NAME}}, roles are defined in `src/config/roles.ts`:
- **Viewer:** Read-only access. Can view documents and chat history. Cannot upload or delete.
- **Editor:** Full access. Can upload documents, ask questions, delete own chats.
- **Admin:** Can manage users, configure settings, see audit logs, delete any chat.

Roles are assigned via Entra ID security groups or custom claims. See README.md and THREAT_MODEL.md for details.

---

## Maintenance Windows

Planned maintenance is scheduled to minimize user impact. Users are notified in advance.

**Maintenance window:** {{MAINTENANCE_WINDOW}} (e.g., "Sundays 2 AM to 4 AM UTC")
- Announced: 2 weeks before.
- Tool may be unavailable during this window.
- {{TEAM_CHANNEL}} and {{USER_NOTIFICATION_METHOD}} receive notice.

**Database maintenance (backups, scaling):** Scheduled outside business hours, usually 1 AM to 6 AM UTC. Brief (< 5 minutes).

**Quarterly infrastructure refresh (security patching, certificate renewal):** Announced 1 month in advance. Coordinated with platform team.

---

## Links

| Resource | URL | Purpose |
| --- | --- | --- |
| **Runbook** | {{RUNBOOK_PATH}} (or `../RUNBOOK.md`) | Deploy, rollback, health checks, on-call reference. Start here for operational issues. |
| **Dashboard** | {{DASHBOARD_URL}} | Real-time metrics, error rates, latency, uptime. Check this first when user reports an issue. |
| **Logs** | {{LOGGING_PLATFORM_SEARCH_URL}} | Application logs, structured traces, errors. Search by service, timestamp, or message. |
| **Repository** | {{REPO_URL}} | Source code, CI/CD workflows, issue tracker. |
| **Ticket queue** | {{SUPPORT_TICKET_URL}} | User support tickets (Jira, Azure DevOps, Zendesk, etc.). |
| **On-call schedule** | {{ONCALL_SCHEDULE_URL}} | Who is on-call this week and next. |
| **Escalation contacts** | {{CONTACTS_SPREADSHEET_URL}} | Names, phone, email for L1, L2, L3, and dependencies. Keep current. |
| **Production readiness checklist** | {{READINESS_CHECKLIST_PATH}} (or `../PRODUCTION_READINESS.md`) | Rubric compliance and scorecard verification. |
| **Threat model** | {{THREAT_MODEL_PATH}} (or `../THREAT_MODEL.md`) | Security analysis, AI-specific threats, mitigations. |
| **UAT results** | {{UAT_RESULTS_URL}} | Pilot sign-off and test evidence. |

---

## Handoff Sign-off

Use this section when ownership changes or when transitioning from development to operations.

| Field | Value |
| --- | --- |
| **Date of handoff** | {{HANDOFF_DATE}} |
| **Handing off from** | {{FROM_TEAM}} / {{FROM_NAME}} |
| **Handing off to** | {{TO_TEAM}} / {{TO_NAME}} |
| **Primary contact (L1 support)** | {{SUPPORT_TEAM_NAME}} (contact: {{SUPPORT_CHANNEL}}) |
| **Engineering lead (L2)** | {{ENG_LEAD_NAME}} |
| **On-call rotation active** | Yes [ ] No [ ] (if no, when will it start?) |
| **Runbook tested** | Yes [ ] No [ ] (if no, plan a dry-run deployment before going live) |
| **Dashboard access confirmed** | Yes [ ] No [ ] (support and engineering lead should have access) |
| **Key Vault access verified** | Yes [ ] No [ ] (verify via `az keyvault list-keys` for each resource) |
| **Escalation contacts updated** | Yes [ ] No [ ] (phone numbers, emails, pager handles current?) |

**Sign-off by:**

- **Development lead (handing off):** {{DEV_LEAD_SIGNATURE}} on {{DEV_LEAD_DATE}}
- **Operations/support lead (receiving):** {{OPS_LEAD_SIGNATURE}} on {{OPS_LEAD_DATE}}
- **Platform team lead (witness):** {{PLATFORM_LEAD_SIGNATURE}} on {{PLATFORM_LEAD_DATE}}

**Notes on handoff:** {{HANDOFF_NOTES}}
(e.g., "API quota increases may be needed if user base grows. Model provider API costs ~$X/month. One known issue with PDF export is in workarounds. Production deployment SOP requires approval from {{APPROVAL_ROLE}}.")
