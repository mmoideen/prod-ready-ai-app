<!-- 
INCIDENT_POSTMORTEM.md template
Blameless postmortem for a user-facing incident in {{TOOL_NAME}}.
Fill in incident ID, dates, severity, duration, services affected.
Timeline uses absolute timestamps (UTC ISO 8601 format, e.g., 2024-10-15T14:30:00Z).
Describe what happened, why, and what we will do differently next time.
Names appear only as roles (on-call engineer, deployer, etc.), never individuals.
Store postmortems in docs/postmortems/postmortem-{{INCIDENT_ID}}.md.
Archive a link in the support handoff or runbook under "Incidents" section.
-->

# Postmortem: {{INCIDENT_ID}}

Blameless postmortem for an incident in {{TOOL_NAME}}.

<!--
Severity guide (also used in escalation):
- Critical: Production outage, no users can access tool, data loss risk, security breach.
- High: Core workflow broken, frequent crashes, severe performance degradation (latency > 10 sec p99).
- Medium: Feature limited, workaround exists, one user blocked.
- Low: Cosmetic issue or minor bug.
-->

---

## Incident Summary

| Field | Value |
| --- | --- |
| **Incident ID** | {{INCIDENT_ID}} (e.g., INC-2024-10-15-001) |
| **Date** | {{INCIDENT_DATE}} (YYYY-MM-DD) |
| **Severity** | Critical | High | Medium | Low |
| **Services affected** | {{AFFECTED_SERVICES}} (e.g., "Document upload, chat queries") |
| **Duration** | {{INCIDENT_START}} to {{INCIDENT_END}} (UTC), total {{DURATION_MINUTES}} minutes |
| **Detection method** | {{DETECTION_METHOD}} (e.g., "Alert firing in Application Insights", "User report") |
| **Lead investigator** | {{INVESTIGATOR_ROLE}} (role, not name; e.g., "On-call engineer", "Support lead") |
| **Postmortem author** | {{AUTHOR_ROLE}} (role; e.g., "Engineering lead") |
| **Postmortem date** | {{POSTMORTEM_DATE}} (within 48 hours of incident) |

---

## User Impact

Describe in plain language what users experienced. No jargon.

Example: "Between 14:30 and 14:45 UTC, all users of {{TOOL_NAME}} received 'Service unavailable' errors when trying to upload documents. The chat feature and query interface were unaffected. Approximately 23 active users were impacted. Uploads attempted during this window were lost; users had to retry manually after recovery."

**Affected users:** {{AFFECTED_USER_COUNT}} users, {{AFFECTED_ORG_UNITS}} departments/teams.

**Business impact:** {{BUSINESS_IMPACT}} (e.g., "Delayed processing of 150 compliance documents. One user missed a compliance filing deadline but was granted an extension.")

---

## Timeline

Use absolute timestamps in UTC ISO 8601 format (e.g., 2024-10-15T14:30:00Z).
Every timestamp should include the timezone (Z = UTC).

| Time (UTC) | Event | Source | Details |
| --- | --- | --- | --- |
| 2024-10-15T14:30:00Z | Alert: /health endpoint failing | Application Insights | HTTP 503 responses, database connection timeout. |
| 2024-10-15T14:31:00Z | On-call engineer acknowledged alert | PagerDuty | Checked dashboard. Confirmed service is down. |
| 2024-10-15T14:32:00Z | On-call engineer checked Postgres status | Azure portal | Found Postgres instance in "restarting" state. Failover in progress. |
| 2024-10-15T14:38:00Z | Postgres failover completed | Azure notifications | Service began accepting connections. |
| 2024-10-15T14:42:00Z | /health endpoint returned 200 OK | Health check script | Database connection pool was reestablished. |
| 2024-10-15T14:45:00Z | Error rate returned to baseline | Application Insights | Confirmed incident resolved. |
| 2024-10-15T16:00:00Z | {{TIMELINE_EVENT}} | {{SOURCE}} | {{DETAILS}} |

---

## Root Cause Analysis

Identify contributing factors, not a single scapegoat. Focus on systems and processes, not individuals.

### What happened (sequence of events):

Example: "1. On 2024-10-15 at 14:30 UTC, Azure Postgres instance experienced an automatic failover. The failover was triggered by a storage alert (capacity at 95%). The instance was scaled up in size 24 hours prior but had not been restarted, so the new size was not taking effect. 2. During failover, existing database connections were dropped. 3. The application's connection pool did not handle dropped connections gracefully. It retried with an exponential backoff, but retries were too slow. 4. User requests queued up and timed out. 5. Eventually the connection pool was restored when the failover completed."

### Contributing factors:

- **Factor 1:** Storage scaling was applied but instance was not restarted. Azure requires a restart for the new storage capacity to take effect.
- **Factor 2:** Database connection pool retry logic had a minimum backoff of 2 seconds. During failover (which takes 5 minutes), the pool remained disconnected.
- **Factor 3:** No alert for storage capacity reaching 90% (only alert at 95%). Earlier warning would have allowed a proactive restart.
- **Factor 4:** Automatic failover was not covered by an on-call rotation for database issues (was only monitored by application alerts). Database team was not paged directly.

### Root cause (synthesis):

The incident was not caused by a single error, but by the combination of: (1) a missed restart after infrastructure scaling, (2) insufficient observability in database failover, and (3) insufficient retry logic in the connection pool during transient failures. Each factor alone would not have caused an outage; together they did.

---

## What Went Well

Describe the positive aspects of the incident response. What did the team do right?

- On-call engineer acknowledged the alert within 1 minute and began investigating immediately.
- Engineer consulted the runbook (RUNBOOK.md, Common Failures section) and quickly identified the database as the problem.
- Service automatically rolled back the Vercel deployment when /health failed, preventing a bad deployment from causing further problems.
- Communication was clear: {{TEAM_CHANNEL}} was updated every 5 minutes with status.
- Recovery was fast (15 minutes total). Users could resume work immediately after Postgres failover completed.

---

## What Went Poorly

Describe gaps in processes, monitoring, or knowledge.

- The database scaling change (24 hours before the incident) was not accompanied by a restart. The person who scaled the instance did not know that Azure requires a restart to apply new storage. (Gap: documentation and runbook did not cover this.)
- No alert for storage capacity at 90%. The first warning was at 95%, which is too late (only 5% of headroom). (Gap: alert thresholds were not reviewed after database size changed.)
- No paging of the database team when failover occurred. Only the application on-call was paged. The database team found out after the incident from Slack messages. (Gap: alert routing did not include database on-call.)
- Connection pool retry logic had a 2-second minimum backoff. During a 5-minute failover, this was too aggressive (thousands of retries, exhausting the pool). (Gap: code review did not consider failover scenarios.)

---

## Where We Got Lucky

Describe conditions that could have made the incident worse, but did not.

- Failover completed relatively quickly (5 minutes). If the failover had hung (common in poorly configured instances), the outage could have lasted 30+ minutes.
- The incident occurred at 14:30 UTC, during business hours. An engineer was already on-call. If it had occurred at 02:00 UTC on a weekend, time-to-respond would have been 10+ minutes.
- No data was lost. Postgres failover maintains data consistency (we use synchronous replication). If data had been lost, RTO/RPO would have delayed recovery further.
- User load at the time was moderate (100 concurrent users). If the incident had occurred during peak load (500+ users), the connection pool exhaustion would have been worse.

---

## Action Items

Commitments to prevent recurrence, detect similar issues faster, or mitigate impact.

| Item | Type | Owner | Ticket | Due Date |
| --- | --- | --- | --- | --- |
| Document Azure Postgres scaling procedure: restart required after scale up | Process | {{DEVOPS_ROLE}} | {{TICKET_URL}} | {{DUE_DATE}} |
| Add alert for storage capacity > 85% (was 95%) | Detect | {{MONITORING_ROLE}} | {{TICKET_URL}} | {{DUE_DATE}} |
| Add database on-call to alert routing for Postgres alerts | Detect | {{PLATFORM_ROLE}} | {{TICKET_URL}} | {{DUE_DATE}} |
| Implement exponential backoff with longer minimum (5s, not 2s) in database connection pool | Prevent | {{ENG_ROLE}} | {{TICKET_URL}} | {{DUE_DATE}} |
| Test Postgres failover in staging: confirm recovery time, validate connection pool behavior, document findings | Prevent | {{ENG_LEAD_ROLE}} | {{TICKET_URL}} | {{DUE_DATE}} |
| Add "Scaling the database" section to RUNBOOK.md with Azure-specific restart requirement | Process | {{ENG_ROLE}} | {{TICKET_URL}} | {{DUE_DATE}} |
| Schedule quarterly drill: simulate failover, measure recovery time, ensure on-call path is correct | Process | {{DEVOPS_ROLE}} | {{TICKET_URL}} | {{DUE_DATE}} |

**Action item types:**
- **Prevent:** Stops the root cause from occurring again.
- **Detect:** Catches a similar failure faster with alerts, logs, or monitoring.
- **Mitigate:** Reduces user impact if the problem happens again (e.g., faster recovery, fallback behavior).
- **Process:** Documents knowledge or improves runbook/training so the team does not forget.

---

## Review and Sign-off

Postmortem review ensures completeness and agreement on action items.

| Role | Name | Date | Notes |
| --- | --- | --- | --- |
| Lead investigator | {{INVESTIGATOR_ROLE}} | {{REVIEW_DATE}} | Confirms timeline and root cause. |
| Engineering lead | {{ENG_LEAD_ROLE}} | {{REVIEW_DATE}} | Approves action items and assigns owners. |
| Platform team lead | {{PLATFORM_ROLE}} | {{REVIEW_DATE}} | Confirms ownership of infrastructure items. |
| {{CUSTOMER_REP_ROLE}} (if major customer impact) | {{CUSTOMER_REP_NAME}} | {{REVIEW_DATE}} | Confirms user impact description is accurate. |

**Blamelessness statement:** This postmortem is blameless. All names appear as roles only (on-call engineer, deployer, etc.), never individuals. Blame focuses on systems and processes, not people. The goal is to learn and improve, not to assign fault.

---

## Appendix: Additional Logs or Evidence

Attach or link to:
- Vercel deployment logs (if deployment triggered the incident)
- Application Insights trace logs (full stack traces, queries, errors)
- Azure Postgres metrics (CPU, storage, connection count, failover logs)
- Pagerduty incident timeline and acknowledgments
- Slack transcript of incident response ({{SLACK_THREAD_URL}})

Example query in Application Insights:
```kusto
traces
| where timestamp between (2024-10-15T14:25Z .. 2024-10-15T14:50Z)
| where service == "{{TOOL_NAME}}" and severity in ("Error", "Critical")
| order by timestamp asc
```

Paste results here or save to a file:

{{LOGS_EVIDENCE}}
