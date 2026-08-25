import { test } from "node:test";
import assert from "node:assert/strict";

import { can, isRole, resolveRole } from "../lib/rbac";

test("viewer can view content but is denied edit and admin actions", () => {
  const user = { role: "viewer" };
  assert.equal(can(user, "content:view"), true);
  assert.equal(can(user, "content:edit"), false);
  assert.equal(can(user, "admin:action"), false);
});

test("editor can view and edit content but is denied admin actions", () => {
  const user = { role: "editor" };
  assert.equal(can(user, "content:view"), true);
  assert.equal(can(user, "content:edit"), true);
  assert.equal(can(user, "admin:action"), false);
});

test("admin is allowed every permission", () => {
  const user = { role: "admin" };
  assert.equal(can(user, "content:view"), true);
  assert.equal(can(user, "content:edit"), true);
  assert.equal(can(user, "admin:action"), true);
});

test("an unknown role, missing role, or missing user is denied every permission", () => {
  assert.equal(can({ role: "superuser" }, "content:view"), false);
  assert.equal(can({}, "content:view"), false);
  assert.equal(can(null, "content:view"), false);
  assert.equal(can(undefined, "admin:action"), false);
});

test("isRole narrows only the three known role names", () => {
  assert.equal(isRole("viewer"), true);
  assert.equal(isRole("editor"), true);
  assert.equal(isRole("admin"), true);
  assert.equal(isRole("owner"), false);
  assert.equal(isRole(""), false);
  assert.equal(isRole(undefined), false);
  assert.equal(isRole(null), false);
});

test("resolveRole trusts a valid claim role before consulting the email allowlists", () => {
  assert.equal(resolveRole("anyone@example.test", "editor"), "editor");
});

test("resolveRole ignores an invalid claim role and falls back to the allowlists", (t) => {
  const previousAdmin = process.env.RBAC_ADMIN_EMAILS;
  process.env.RBAC_ADMIN_EMAILS = "owner@example.test";
  t.after(() => {
    if (previousAdmin === undefined) delete process.env.RBAC_ADMIN_EMAILS;
    else process.env.RBAC_ADMIN_EMAILS = previousAdmin;
  });

  assert.equal(resolveRole("Owner@example.test", "not-a-real-role"), "admin");
});

test("resolveRole matches the admin allowlist case insensitively", (t) => {
  const previousAdmin = process.env.RBAC_ADMIN_EMAILS;
  process.env.RBAC_ADMIN_EMAILS = "Owner@Example.test, second@example.test";
  t.after(() => {
    if (previousAdmin === undefined) delete process.env.RBAC_ADMIN_EMAILS;
    else process.env.RBAC_ADMIN_EMAILS = previousAdmin;
  });

  assert.equal(resolveRole("owner@example.test", null), "admin");
});

test("resolveRole falls back to the editor allowlist when not an admin", (t) => {
  const previousAdmin = process.env.RBAC_ADMIN_EMAILS;
  const previousEditor = process.env.RBAC_EDITOR_EMAILS;
  process.env.RBAC_ADMIN_EMAILS = "";
  process.env.RBAC_EDITOR_EMAILS = "editor@example.test";
  t.after(() => {
    if (previousAdmin === undefined) delete process.env.RBAC_ADMIN_EMAILS;
    else process.env.RBAC_ADMIN_EMAILS = previousAdmin;
    if (previousEditor === undefined) delete process.env.RBAC_EDITOR_EMAILS;
    else process.env.RBAC_EDITOR_EMAILS = previousEditor;
  });

  assert.equal(resolveRole("editor@example.test", undefined), "editor");
});

test("resolveRole defaults to viewer when nothing matches", () => {
  assert.equal(resolveRole("nobody@example.test", null), "viewer");
  assert.equal(resolveRole(null, undefined), "viewer");
});
