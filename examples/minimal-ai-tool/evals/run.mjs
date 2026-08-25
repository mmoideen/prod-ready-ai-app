#!/usr/bin/env node
// Deterministic eval runner (EVAL-2) for the mock summarize provider.
//
// This mirrors the tiny extractive algorithm in ../src/ai/mock.ts (first
// sentence plus a count of distinct key phrases) directly in plain JS, on
// purpose, so "npm run eval" never requires a prior "npm run build": evals
// should be runnable in isolation, against a pinned, deterministic
// provider, without depending on the TypeScript build pipeline. Keep this
// copy in sync with src/ai/mock.ts if that algorithm changes.
//
// Checks every item in dataset.jsonl against its criteria (mustContain,
// maxLength), prints a per-item PASS/FAIL line plus the computed summary,
// then an overall pass rate. Exits 0 only at 100% (deterministic and
// always passing against the mock provider); exits 1 otherwise, which is
// what actions/reusable-eval-gate treats as a failed gate.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, "dataset.jsonl");

const SENTENCE_SPLIT_PATTERN = /(?<=[.!?])\s+/;
const WORD_PATTERN = /[A-Za-z0-9']+/g;
const MIN_KEY_PHRASE_LENGTH = 3;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "was",
  "were",
  "has",
  "have",
  "had",
  "this",
  "that",
  "with",
  "from",
  "then",
  "also",
  "into",
  "onto",
  "your",
  "their",
]);

function firstSentence(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "";
  const parts = trimmed.split(SENTENCE_SPLIT_PATTERN);
  return (parts[0] ?? trimmed).trim();
}

function keyPhraseCount(text) {
  const words = text.match(WORD_PATTERN) ?? [];
  const seen = new Set();
  for (const word of words) {
    const lower = word.toLowerCase();
    if (lower.length <= MIN_KEY_PHRASE_LENGTH) continue;
    if (STOP_WORDS.has(lower)) continue;
    seen.add(lower);
  }
  return seen.size;
}

function summarize(text) {
  const sentence = firstSentence(text);
  if (sentence.length === 0) {
    return "(empty input, 0 key phrases)";
  }
  const phraseCount = keyPhraseCount(text);
  const phraseWord = phraseCount === 1 ? "phrase" : "phrases";
  return `${sentence} (${phraseCount} key ${phraseWord})`;
}

function loadDataset() {
  const raw = readFileSync(datasetPath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function evaluateItem(item) {
  const summary = summarize(item.input);
  const failures = [];

  for (const phrase of item.mustContain ?? []) {
    if (!summary.includes(phrase)) {
      failures.push(`missing required phrase: "${phrase}"`);
    }
  }

  if (typeof item.maxLength === "number" && summary.length > item.maxLength) {
    failures.push(`summary length ${summary.length} exceeds maxLength ${item.maxLength}`);
  }

  return { id: item.id, summary, pass: failures.length === 0, failures };
}

function main() {
  const dataset = loadDataset();
  if (dataset.length === 0) {
    console.error("evals/dataset.jsonl has no items");
    process.exit(1);
    return;
  }

  const results = dataset.map(evaluateItem);
  let passed = 0;

  for (const result of results) {
    const status = result.pass ? "PASS" : "FAIL";
    console.log(`[${status}] ${result.id}: "${result.summary}"`);
    if (result.pass) {
      passed += 1;
    } else {
      for (const failure of result.failures) {
        console.log(`         - ${failure}`);
      }
    }
  }

  const passRate = (passed / results.length) * 100;
  console.log(`\nEvaluation: ${passed}/${results.length} passed (${passRate.toFixed(1)}%).`);

  process.exit(passRate >= 100 ? 0 : 1);
}

main();
