#!/usr/bin/env node

// Enforces the "one rubric, three views" invariant: the scorecard rule
// registry, docs/RUBRIC.md, and templates/PRODUCTION_READINESS.md must all
// agree on the exact rule set, and weights must sum to 100.
// Run from the repo root after building the scorecard.

import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const CLI_PATH = 'scorecard/dist/cli.js';

function getScorecardRules() {
  if (!existsSync(CLI_PATH)) {
    console.error(`ERROR: Scorecard CLI not found at ${CLI_PATH}`);
    console.error('Build it first:');
    console.error('  cd scorecard && npm ci && npm run build');
    process.exit(1);
  }
  const output = execFileSync(
    'node',
    [CLI_PATH, '--list-rules', '--format', 'json'],
    { encoding: 'utf8' }
  );
  const parsed = JSON.parse(output);
  // Accept either a bare array of rules or an object with a rules array.
  const rules = Array.isArray(parsed) ? parsed : parsed.rules;
  if (!Array.isArray(rules) || rules.length === 0) {
    console.error('ERROR: Could not read a rules array from --list-rules output.');
    process.exit(1);
  }
  return rules;
}

function extractRuleIds(content) {
  // Rule IDs look like TEST-1, CICD-2, SEC-4. Match them anywhere in the
  // document (tables in RUBRIC.md, checkbox lines in the checklist).
  const ruleIds = new Set();
  const regex = /\b(TEST|CICD|SEC|AUTH|OBS|EVAL|IAC|DOC|SUP)-(\d+)\b/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ruleIds.add(`${match[1]}-${match[2]}`);
  }
  return ruleIds;
}

function readOrDie(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`ERROR: Could not read ${path}`);
    process.exit(1);
  }
}

function compare(label, docIds, scorecardIds) {
  const missing = [...scorecardIds].filter(id => !docIds.has(id));
  const extra = [...docIds].filter(id => !scorecardIds.has(id));
  if (missing.length > 0) {
    console.error(`FAIL: ${label} is missing rule ids: ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    console.error(`FAIL: ${label} has rule ids the scorecard does not implement: ${extra.join(', ')}`);
  }
  if (missing.length === 0 && extra.length === 0) {
    console.log(`PASS: ${label} matches all ${scorecardIds.size} scorecard rules`);
    return true;
  }
  return false;
}

function main() {
  console.log('Checking that the scorecard, rubric, and readiness checklist agree...');

  const rules = getScorecardRules();
  const scorecardIds = new Set(rules.map(r => r.id));

  if (scorecardIds.size !== rules.length) {
    console.error('FAIL: Duplicate rule ids in the scorecard registry.');
    process.exit(1);
  }

  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight !== 100) {
    console.error(`FAIL: Scorecard weights sum to ${totalWeight}, expected 100.`);
    process.exit(1);
  }
  console.log('PASS: Scorecard weights sum to 100');

  const rubricOk = compare('docs/RUBRIC.md', extractRuleIds(readOrDie('docs/RUBRIC.md')), scorecardIds);
  const checklistOk = compare(
    'templates/PRODUCTION_READINESS.md',
    extractRuleIds(readOrDie('templates/PRODUCTION_READINESS.md')),
    scorecardIds
  );

  if (!rubricOk || !checklistOk) {
    console.error('\nRule sets have diverged. Update the scorecard rules, docs/RUBRIC.md,');
    console.error('and templates/PRODUCTION_READINESS.md together in the same change.');
    process.exit(1);
  }

  console.log(`\nAll checks passed: ${scorecardIds.size} rules, one rubric, three agreeing views.`);
}

main();
