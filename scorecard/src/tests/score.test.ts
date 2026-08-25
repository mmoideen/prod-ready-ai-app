import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeScore,
  gradeFor,
  stageFor,
  STAGE_EXPERIMENTAL,
  STAGE_PILOT,
  STAGE_PILOT_AT_BEST,
  STAGE_PRODUCTION_READY,
  STAGE_PRODUCTION_READY_BC_ELIGIBLE,
  type RuleEvaluation,
} from "../score.js";

function makeEval(overrides: Partial<RuleEvaluation> & Pick<RuleEvaluation, "id" | "weight" | "status">): RuleEvaluation {
  return {
    category: "Testing",
    title: "Synthetic rule",
    evidence: "synthetic evidence",
    remediation: "synthetic remediation",
    ...overrides,
  };
}

test("na rules are excluded from both the numerator and the denominator", () => {
  const result = computeScore([
    makeEval({ id: "A", weight: 50, status: "pass" }),
    makeEval({ id: "B", weight: 50, status: "na" }),
  ]);
  assert.equal(result.applicableWeight, 50);
  assert.equal(result.totalWeight, 100);
  assert.equal(result.score, 100);
});

test("score is the weighted percent of passing rules among applicable rules", () => {
  const result = computeScore([
    makeEval({ id: "A", weight: 30, status: "pass" }),
    makeEval({ id: "B", weight: 30, status: "fail" }),
    makeEval({ id: "C", weight: 40, status: "na" }),
  ]);
  assert.equal(result.applicableWeight, 60);
  assert.equal(result.score, 50);
});

test("rounding: score rounds to one decimal place", () => {
  // applicable = 3, passed = 1 -> 33.333...% rounds to 33.3
  const result = computeScore([
    makeEval({ id: "A", weight: 1, status: "pass" }),
    makeEval({ id: "B", weight: 2, status: "fail" }),
  ]);
  assert.equal(result.score, 33.3);
});

test("all rules na yields a score of 0 with no division by zero", () => {
  const result = computeScore([makeEval({ id: "A", weight: 100, status: "na" })]);
  assert.equal(result.applicableWeight, 0);
  assert.equal(result.score, 0);
  assert.equal(result.grade, "F");
});

test("grade band edges: 89.9 is B, 90 is A", () => {
  assert.equal(gradeFor(89.9), "B");
  assert.equal(gradeFor(90), "A");
});

test("grade band edges: B, C, D, F boundaries", () => {
  assert.equal(gradeFor(100), "A");
  assert.equal(gradeFor(80), "B");
  assert.equal(gradeFor(79.9), "C");
  assert.equal(gradeFor(70), "C");
  assert.equal(gradeFor(69.9), "D");
  assert.equal(gradeFor(60), "D");
  assert.equal(gradeFor(59.9), "F");
  assert.equal(gradeFor(0), "F");
});

test("stage band edges: 84.9 is pilot, 85 is production ready, 92 is business critical eligible", () => {
  assert.equal(stageFor(84.9), STAGE_PILOT);
  assert.equal(stageFor(85), STAGE_PRODUCTION_READY);
  assert.equal(stageFor(92), STAGE_PRODUCTION_READY_BC_ELIGIBLE);
});

test("stage band edges: pilot at best and experimental", () => {
  assert.equal(stageFor(91.9), STAGE_PRODUCTION_READY);
  assert.equal(stageFor(69.9), STAGE_PILOT_AT_BEST);
  assert.equal(stageFor(50), STAGE_PILOT_AT_BEST);
  assert.equal(stageFor(49.9), STAGE_EXPERIMENTAL);
  assert.equal(stageFor(0), STAGE_EXPERIMENTAL);
});

test("category subtotals aggregate correctly and preserve first-seen order", () => {
  const result = computeScore([
    makeEval({ id: "A", category: "Testing", weight: 10, status: "pass" }),
    makeEval({ id: "B", category: "Security", weight: 20, status: "fail" }),
    makeEval({ id: "C", category: "Testing", weight: 5, status: "na" }),
  ]);
  assert.deepEqual(
    result.categories.map((c) => c.name),
    ["Testing", "Security"],
  );
  const testing = result.categories.find((c) => c.name === "Testing");
  assert.ok(testing);
  assert.equal(testing.weightApplicable, 10);
  assert.equal(testing.weightPassed, 10);
  const security = result.categories.find((c) => c.name === "Security");
  assert.ok(security);
  assert.equal(security.weightApplicable, 20);
  assert.equal(security.weightPassed, 0);
});
