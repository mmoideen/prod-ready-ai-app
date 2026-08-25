<!-- 
ADR.md template
Architecture decision record: one file per significant decision.
Store all ADRs in docs/adr/ with filenames adr-0001-title.md, adr-0002-title.md, etc.
Update status to "Accepted" after review and team agreement.
If superseded, change status to "Superseded by ADR-NNNN".
Keep entries tight and fact-based.
-->

# ADR-{{NUMBER}}: {{TITLE}}

**Date:** {{DATE}} (YYYY-MM-DD format)
**Status:** Proposed | Accepted | Superseded by ADR-{{SUPERSEDED_BY}}
**Author:** {{AUTHOR_NAME}}

---

## Context

Explain the problem or question that prompted this decision. What forces or constraints apply?

Example: "Our AI model calls the provider API synchronously, blocking the user request. P99 latency is 8 seconds. Users are frustrated by delays. We need to decouple the API call from the response."

---

## Decision

State the decision concisely. What did we choose to do?

Example: "We will queue all model API calls to Azure Service Bus. A background worker (Node.js worker on Vercel cron or Azure Function) will process the queue, call the provider API, and write results to the database. The user will poll a status endpoint to check if the response is ready."

---

## Consequences

### Positive

- User requests complete in < 100 ms (just queue, not waiting for model).
- Model latency is decoupled from user experience.
- Failures in the model API do not block the user request (graceful degradation).
- We can scale the worker independently of the web server.

### Negative

- Added complexity: queue infrastructure, background worker, polling UI.
- Users no longer see instant results. Latency is now 2-10 seconds (queue wait + API + database).
- Requires changes to API contract: responses are now asynchronous.
- New component to monitor and operate (worker failures, queue deadletter, database writes).

---

## Alternatives Considered

### Option 1: Increase provider API rate limits
**Why rejected:** We already use the maximum tier. Rate limits are not the bottleneck; the API itself is slow (3-5 seconds per call). Paying more does not solve the latency problem.

### Option 2: Cache model responses aggressively
**Why rejected:** Model outputs are user-specific (personalized prompts, role-based data retrieval). Cache hit rate would be < 5%. Not worth the complexity.

### Option 3: Use a faster model provider
**Why rejected:** Model quality is a requirement. Switching to a faster but lower-quality provider was rejected by product owner. Current provider is best available for our use case.

### Option 4: Accept slow requests but make UI responsive (show loading state, allow user to navigate away and return later)
**Why rejected:** Tried this in pilot UAT. Users still felt frustrated. Async queue + polling provides better UX.

---

## References

- Ticket: {{TICKET_URL}} (e.g., JIRA-1234)
- PR: {{PR_URL}} (once implementation is under review)
- RFC (if applicable): {{RFC_URL}}
- Related ADR: {{RELATED_ADR}} (e.g., "ADR-002: Azure Service Bus design")
- Provider API docs: {{PROVIDER_DOCS_URL}}

---

## Follow-up

This decision should be revisited if:
- Model provider API latency improves significantly (< 1 second p99).
- User feedback on async latency remains negative after launch.
- Queue infrastructure becomes a reliability bottleneck.

Next review date: {{REVIEW_DATE}} (e.g., 2024-12-31)
