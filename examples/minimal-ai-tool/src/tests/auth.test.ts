import { test } from "node:test";
import assert from "node:assert/strict";

import { authenticate } from "../auth.js";
import { ADMIN_TOKEN, testConfig, VIEWER_TOKEN } from "./helpers.js";

test("rejects a missing Authorization header (deny path)", () => {
  const result = authenticate({}, testConfig());
  assert.equal(result.authenticated, false);
  assert.equal(result.role, null);
});

test("rejects a non-Bearer scheme (deny path)", () => {
  const result = authenticate({ authorization: "Basic dXNlcjpwYXNz" }, testConfig());
  assert.equal(result.authenticated, false);
  assert.equal(result.role, null);
});

test("rejects a token that is not configured (deny path)", () => {
  const result = authenticate({ authorization: "Bearer tok-not-configured" }, testConfig());
  assert.equal(result.authenticated, false);
  assert.equal(result.role, null);
});

test("accepts a configured viewer token (allow path)", () => {
  const result = authenticate({ authorization: `Bearer ${VIEWER_TOKEN}` }, testConfig());
  assert.equal(result.authenticated, true);
  assert.equal(result.role, "viewer");
});

test("accepts a configured admin token (allow path)", () => {
  const result = authenticate({ authorization: `Bearer ${ADMIN_TOKEN}` }, testConfig());
  assert.equal(result.authenticated, true);
  assert.equal(result.role, "admin");
});
