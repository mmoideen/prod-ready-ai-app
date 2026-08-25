import { test } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, stopTestServer } from "./helpers.js";

test("GET /healthz is unauthenticated and reports liveness", async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.status, "ok");
    assert.equal(typeof body.uptimeSeconds, "number");
    assert.equal(typeof body.version, "string");
  } finally {
    await stopTestServer(server);
  }
});

test("GET /unknown-route returns 404", async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/unknown-route`);
    assert.equal(response.status, 404);
  } finally {
    await stopTestServer(server);
  }
});
