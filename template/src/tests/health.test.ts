import { test } from "node:test";
import assert from "node:assert/strict";

import { getHealthPayload } from "../lib/health";

test("health payload reports ok status with an uptime, version, and timestamp", () => {
  const payload = getHealthPayload();

  assert.equal(payload.status, "ok");
  assert.equal(typeof payload.uptime, "number");
  assert.ok(payload.uptime >= 0);
  assert.equal(typeof payload.version, "string");
  assert.ok(payload.version.length > 0);
  assert.equal(typeof payload.timestamp, "string");
  assert.ok(!Number.isNaN(Date.parse(payload.timestamp)));
});
