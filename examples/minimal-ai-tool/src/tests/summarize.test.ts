import { test } from "node:test";
import assert from "node:assert/strict";

import { ADMIN_TOKEN, startTestServer, stopTestServer, VIEWER_TOKEN } from "./helpers.js";

test("POST /api/summarize requires auth, honors RBAC, and returns a mock summary", async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const noToken = await fetch(`${baseUrl}/api/summarize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "The printer on floor 3 is jammed." }),
    });
    assert.equal(noToken.status, 401);

    const asViewer = await fetch(`${baseUrl}/api/summarize`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${VIEWER_TOKEN}` },
      body: JSON.stringify({
        text: "The printer on floor 3 is jammed. Facilities was already notified twice this week.",
      }),
    });
    assert.equal(asViewer.status, 200);

    const summarizeBody = (await asViewer.json()) as Record<string, unknown>;
    assert.equal(typeof summarizeBody.summary, "string");
    assert.ok(String(summarizeBody.summary).startsWith("The printer on floor 3 is jammed."));
  } finally {
    await stopTestServer(server);
  }
});

test("POST /api/summarize rejects a malformed body with 400", async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/api/summarize`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${VIEWER_TOKEN}` },
      body: JSON.stringify({ notText: 1 }),
    });
    assert.equal(response.status, 400);
  } finally {
    await stopTestServer(server);
  }
});

test("GET /api/admin/stats requires the admin permission: viewer gets 403, admin gets 200", async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    // Generate at least one prior request so totalRequests is observably > 0.
    await fetch(`${baseUrl}/healthz`);

    const asViewer = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { authorization: `Bearer ${VIEWER_TOKEN}` },
    });
    assert.equal(asViewer.status, 403);

    const asAdmin = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    assert.equal(asAdmin.status, 200);

    const statsBody = (await asAdmin.json()) as Record<string, unknown>;
    assert.equal(typeof statsBody.totalRequests, "number");
    assert.ok((statsBody.totalRequests as number) >= 1);
    assert.equal(typeof statsBody.byRoute, "object");
  } finally {
    await stopTestServer(server);
  }
});
