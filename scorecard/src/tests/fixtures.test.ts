import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { buildContext } from "../context.js";
import { rules } from "../rules/index.js";
import { computeScore, evaluateAll } from "../score.js";

const here = dirname(fileURLToPath(import.meta.url));
const scorecardRoot = join(here, "..", "..");
const fixturesDir = join(scorecardRoot, "fixtures");

function describeFailures(evaluations: ReturnType<typeof evaluateAll>): string {
  return evaluations
    .filter((e) => e.status === "fail")
    .map((e) => `${e.id}: ${e.evidence}`)
    .join("; ");
}

test("passing fixture scores at least 95 via the real pipeline", () => {
  const ctx = buildContext(join(fixturesDir, "passing-repo"));
  const evaluations = evaluateAll(rules, ctx);
  const result = computeScore(evaluations);
  assert.ok(
    result.score >= 95,
    `expected passing fixture score >= 95, got ${result.score}. Failures: ${describeFailures(evaluations)}`,
  );
});

test("failing fixture scores at most 40 via the real pipeline", () => {
  const ctx = buildContext(join(fixturesDir, "failing-repo"));
  const evaluations = evaluateAll(rules, ctx);
  const result = computeScore(evaluations);
  assert.ok(result.score <= 40, `expected failing fixture score <= 40, got ${result.score}`);
});

test("failing fixture: SEC-2 fails on the presence of a committed .env file", () => {
  const ctx = buildContext(join(fixturesDir, "failing-repo"));
  const evaluations = evaluateAll(rules, ctx);
  const sec2 = evaluations.find((e) => e.id === "SEC-2");
  assert.ok(sec2);
  assert.equal(sec2.status, "fail");
  assert.match(sec2.evidence, /\.env/);
});

test("failing fixture: TEST-1 fails on the npm init placeholder test script", () => {
  const ctx = buildContext(join(fixturesDir, "failing-repo"));
  const evaluations = evaluateAll(rules, ctx);
  const test1 = evaluations.find((e) => e.id === "TEST-1");
  assert.ok(test1);
  assert.equal(test1.status, "fail");
});

test("failing fixture: TEST-3 is na because there are no workflow files at all", () => {
  const ctx = buildContext(join(fixturesDir, "failing-repo"));
  const evaluations = evaluateAll(rules, ctx);
  const test3 = evaluations.find((e) => e.id === "TEST-3");
  assert.ok(test3);
  assert.equal(test3.status, "na");
});

test("passing fixture: every rule passes (aiSignals true, all 20 rules applicable and passing)", () => {
  const ctx = buildContext(join(fixturesDir, "passing-repo"));
  assert.equal(ctx.aiSignals, true);
  const evaluations = evaluateAll(rules, ctx);
  const notPassing = evaluations.filter((e) => e.status !== "pass");
  assert.deepEqual(notPassing, [], `expected every rule to pass, got: ${describeFailures(evaluations)}`);
});
