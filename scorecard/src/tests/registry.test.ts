import { test } from "node:test";
import assert from "node:assert/strict";

import { rules } from "../rules/index.js";

// The rubric enumerates 20 rule IDs across its 9 category tables (three in
// Testing, two in CI/CD, four in Security, two in Auth and access, two in
// Observability, two in Evaluations, one in Infrastructure as code, three in
// Documentation, one in Support model). Weights sum to 100.
const EXPECTED_IDS = [
  "TEST-1",
  "TEST-2",
  "TEST-3",
  "CICD-1",
  "CICD-2",
  "SEC-1",
  "SEC-2",
  "SEC-3",
  "SEC-4",
  "AUTH-1",
  "AUTH-2",
  "OBS-1",
  "OBS-2",
  "EVAL-1",
  "EVAL-2",
  "IAC-1",
  "DOC-1",
  "DOC-2",
  "DOC-3",
  "SUP-1",
];

test("registry contains exactly the 20 expected rule IDs, each exactly once", () => {
  assert.equal(rules.length, 20);
  const ids = rules.map((r) => r.id);
  assert.deepEqual([...ids].sort(), [...EXPECTED_IDS].sort());
  assert.equal(new Set(ids).size, 20, "rule IDs must be unique");
});

test("rule weights sum to exactly 100", () => {
  const total = rules.reduce((sum, r) => sum + r.weight, 0);
  assert.equal(total, 100);
});

test("every rule declares non-empty metadata and a positive weight", () => {
  for (const rule of rules) {
    assert.ok(rule.id.length > 0, "id must not be empty");
    assert.ok(rule.category.length > 0, `${rule.id} category must not be empty`);
    assert.ok(rule.title.length > 0, `${rule.id} title must not be empty`);
    assert.ok(rule.weight > 0, `${rule.id} weight must be positive`);
    assert.equal(typeof rule.evaluate, "function", `${rule.id} must implement evaluate()`);
  }
});

test("registry order matches the rubric's category grouping", () => {
  const categoriesInOrder = rules.map((r) => r.category);
  const firstIndexByCategory = new Map<string, number>();
  categoriesInOrder.forEach((category, index) => {
    if (!firstIndexByCategory.has(category)) firstIndexByCategory.set(category, index);
  });
  // Every rule of a given category must appear contiguously (no interleaving).
  let previousCategory: string | null = null;
  const seenCategories = new Set<string>();
  for (const category of categoriesInOrder) {
    if (category !== previousCategory) {
      assert.ok(!seenCategories.has(category), `category ${category} is not contiguous in registry order`);
      seenCategories.add(category);
      previousCategory = category;
    }
  }
});
