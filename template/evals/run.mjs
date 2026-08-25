#!/usr/bin/env node
// evals/run.mjs
//
// Runs the golden dataset in evals/dataset.jsonl against src/lib/ai.ts's
// summarize() function, scores each result with deterministic checks, prints
// a report, and exits non zero when the pass rate is below PASS_THRESHOLD.
//
// This always runs in offline mock mode in CI and local dev (no
// AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY are set there), so the checks
// below are written to always pass against the mock client's deterministic
// behavior: the first 24 words of the whitespace collapsed input, with "..."
// appended when the input is longer than that.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { summarize } from "../src/lib/ai.ts";

const PASS_THRESHOLD = 1; // fraction of items that must pass, default 100%

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, "dataset.jsonl");

function loadDataset() {
  const raw = readFileSync(datasetPath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function checkItem(item, result) {
  const failures = [];
  const summary = result.summary ?? "";

  const minLength = item.criteria?.minLength ?? 1;
  if (summary.length < minLength) {
    failures.push(`summary length ${summary.length} is below minLength ${minLength}`);
  }

  const mustIncludeWord = item.criteria?.mustIncludeWord;
  if (mustIncludeWord && !summary.toLowerCase().includes(String(mustIncludeWord).toLowerCase())) {
    failures.push(`summary does not include required word "${mustIncludeWord}"`);
  }

  const maxWords = item.criteria?.maxWords;
  if (typeof maxWords === "number") {
    const wordCount = summary.split(/\s+/).filter(Boolean).length;
    if (wordCount > maxWords) {
      failures.push(`summary has ${wordCount} words, exceeds maxWords ${maxWords}`);
    }
  }

  return failures;
}

async function main() {
  const dataset = loadDataset();
  if (dataset.length === 0) {
    console.error("evals/dataset.jsonl has no items");
    process.exit(1);
    return;
  }

  let passCount = 0;
  const rows = [];

  for (const item of dataset) {
    const result = await summarize(item.input);
    const failures = checkItem(item, result);
    const passed = failures.length === 0;
    if (passed) passCount += 1;
    rows.push({ id: item.id, passed, failures, summary: result.summary, usedMock: result.usedMock });
  }

  const passRate = passCount / dataset.length;

  console.log("Eval report: summarize()");
  console.log("=".repeat(50));
  for (const row of rows) {
    console.log(`${row.passed ? "PASS" : "FAIL"}  ${row.id}${row.usedMock ? " (mock)" : " (live)"}`);
    console.log(`      summary: ${row.summary}`);
    for (const failure of row.failures) {
      console.log(`      - ${failure}`);
    }
  }
  console.log("=".repeat(50));
  console.log(`${passCount}/${dataset.length} items passed (${(passRate * 100).toFixed(1)}%)`);

  if (passRate < PASS_THRESHOLD) {
    console.error(
      `Eval gate failed: pass rate ${(passRate * 100).toFixed(1)}% is below threshold ${(PASS_THRESHOLD * 100).toFixed(0)}%`,
    );
    process.exit(1);
    return;
  }

  console.log(`Eval gate passed: pass rate meets threshold ${(PASS_THRESHOLD * 100).toFixed(0)}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
