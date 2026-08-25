import { test } from "node:test";
import assert from "node:assert/strict";

import { authorize, can, isRole } from "../rbac.js";

test("viewer can summarize but is denied admin (allow and deny paths)", () => {
  assert.equal(can("viewer", "summarize"), true);
  assert.equal(can("viewer", "admin"), false);
});

test("admin can summarize and administer", () => {
  assert.equal(can("admin", "summarize"), true);
  assert.equal(can("admin", "admin"), true);
});

test("authorize() is an alias for can()", () => {
  assert.equal(authorize("viewer", "admin"), can("viewer", "admin"));
  assert.equal(authorize("admin", "admin"), can("admin", "admin"));
});

test("isRole() recognizes only the known roles", () => {
  assert.equal(isRole("viewer"), true);
  assert.equal(isRole("admin"), true);
  assert.equal(isRole("superuser"), false);
  assert.equal(isRole(""), false);
});
