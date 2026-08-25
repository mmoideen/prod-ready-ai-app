import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const execFileAsync = promisify(execFile);

const here = dirname(fileURLToPath(import.meta.url));
const scorecardRoot = join(here, "..", "..");
const cliPath = join(scorecardRoot, "dist", "cli.js");
const fixturesDir = join(scorecardRoot, "fixtures");
const passingRepo = join(fixturesDir, "passing-repo");
const failingRepo = join(fixturesDir, "failing-repo");

interface CliRunResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runCli(args: string[]): Promise<CliRunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, ...args]);
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

test("passing fixture with --min-score 85 exits 0 and prints a markdown report", async () => {
  const { code, stdout } = await runCli(["--path", passingRepo, "--min-score", "85"]);
  assert.equal(code, 0);
  assert.match(stdout, /# Production Readiness Scorecard/);
  assert.match(stdout, /Min score: 85 \(met\)/);
});

test("failing fixture with --min-score 85 exits 1", async () => {
  const { code, stdout } = await runCli(["--path", failingRepo, "--min-score", "85"]);
  assert.equal(code, 1);
  assert.match(stdout, /Min score: 85 \(not met\)/);
});

test("failing fixture with --min-score 85 --advisory exits 0", async () => {
  const { code, stderr } = await runCli(["--path", failingRepo, "--min-score", "85", "--advisory"]);
  assert.equal(code, 0);
  assert.match(stderr, /Advisory mode/);
});

test("--format json output parses as JSON with schemaVersion, 20 rules, and the expected grade", async () => {
  const { code, stdout } = await runCli(["--path", passingRepo, "--format", "json"]);
  assert.equal(code, 0);
  const parsed = JSON.parse(stdout) as {
    schemaVersion: string;
    rubricVersion: string;
    rules: unknown[];
    grade: string;
    score: number;
  };
  assert.equal(parsed.schemaVersion, "1.0.0");
  assert.equal(parsed.rubricVersion, "1.0.0");
  assert.equal(parsed.rules.length, 20);
  assert.equal(parsed.grade, "A");
  assert.ok(parsed.score >= 95);
});

test("--list-rules --format json lists 20 rules with weights summing to 100", async () => {
  const { code, stdout } = await runCli(["--list-rules", "--format", "json"]);
  assert.equal(code, 0);
  const parsed = JSON.parse(stdout) as {
    rubricVersion: string;
    rules: Array<{ id: string; weight: number }>;
    totalWeight: number;
  };
  assert.equal(parsed.rubricVersion, "1.0.0");
  assert.equal(parsed.rules.length, 20);
  assert.equal(parsed.totalWeight, 100);
  const sum = parsed.rules.reduce((total, r) => total + r.weight, 0);
  assert.equal(sum, 100);
});

test("--list-rules default format prints a markdown catalog", async () => {
  const { code, stdout } = await runCli(["--list-rules"]);
  assert.equal(code, 0);
  assert.match(stdout, /# Rule catalog/);
  assert.match(stdout, /TEST-1/);
  assert.match(stdout, /Total weight: 100/);
});

test("nonexistent --path exits 2", async () => {
  const { code, stderr } = await runCli(["--path", join(fixturesDir, "does-not-exist")]);
  assert.equal(code, 2);
  assert.match(stderr, /does not exist/);
});

test("--help exits 0 and prints usage", async () => {
  const { code, stdout } = await runCli(["--help"]);
  assert.equal(code, 0);
  assert.match(stdout, /Usage/);
  assert.match(stdout, /--min-score/);
});

test("--version exits 0 and prints a semantic version", async () => {
  const { code, stdout } = await runCli(["--version"]);
  assert.equal(code, 0);
  assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("an unknown flag is a usage error and exits 2", async () => {
  const { code, stderr } = await runCli(["--bogus-flag"]);
  assert.equal(code, 2);
  assert.match(stderr, /Unknown argument/);
});
