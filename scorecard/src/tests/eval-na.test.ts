import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { buildContext } from "../context.js";
import { rules } from "../rules/index.js";
import { computeScore, evaluateAll, type RuleEvaluation } from "../score.js";

const here = dirname(fileURLToPath(import.meta.url));
const scorecardRoot = join(here, "..", "..");
const fixturesDir = join(scorecardRoot, "fixtures");

test("EVAL-1 and EVAL-2 report na for a repository with no AI signals", () => {
  const ctx = buildContext(join(fixturesDir, "failing-repo"));
  assert.equal(ctx.aiSignals, false);
  const evaluations = evaluateAll(rules, ctx);
  const eval1 = evaluations.find((e) => e.id === "EVAL-1");
  const eval2 = evaluations.find((e) => e.id === "EVAL-2");
  assert.ok(eval1);
  assert.ok(eval2);
  assert.equal(eval1.status, "na");
  assert.equal(eval2.status, "na");
});

test("na EVAL rules do not affect the score: removing them entirely yields the identical score", () => {
  const base: RuleEvaluation[] = [
    { id: "A", category: "Testing", title: "a", weight: 30, status: "pass", evidence: "", remediation: "" },
    { id: "B", category: "Security", title: "b", weight: 20, status: "fail", evidence: "", remediation: "" },
  ];
  const withNaEvalRules: RuleEvaluation[] = [
    ...base,
    { id: "EVAL-1", category: "Evaluations", title: "eval1", weight: 5, status: "na", evidence: "", remediation: "" },
    { id: "EVAL-2", category: "Evaluations", title: "eval2", weight: 5, status: "na", evidence: "", remediation: "" },
  ];

  const scoreWithoutEvalRules = computeScore(base).score;
  const scoreWithNaEvalRules = computeScore(withNaEvalRules).score;

  assert.equal(scoreWithNaEvalRules, scoreWithoutEvalRules);
  assert.equal(computeScore(withNaEvalRules).applicableWeight, computeScore(base).applicableWeight);
});
