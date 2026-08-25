import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

const here = dirname(fileURLToPath(import.meta.url));
const scorecardRoot = join(here, "..", "..");
const cliPath = join(scorecardRoot, "dist", "cli.js");
const passingRepo = join(scorecardRoot, "fixtures", "passing-repo");

test("baseline comparison reports zero delta and zero rule changes against itself", async (t) => {
  const workDir = mkdtempSync(join(tmpdir(), "scorecard-baseline-"));
  t.after(() => rmSync(workDir, { recursive: true, force: true }));

  const baselineFile = join(workDir, "baseline.json");

  // First run: save a JSON report to use as the baseline.
  await execFileAsync(process.execPath, [
    cliPath,
    "--path",
    passingRepo,
    "--format",
    "json",
    "--output",
    baselineFile,
  ]);
  const baselineReport = JSON.parse(readFileSync(baselineFile, "utf8")) as { score: number };

  // Second run: compare against the saved baseline, markdown output.
  const md = await execFileAsync(process.execPath, [
    cliPath,
    "--path",
    passingRepo,
    "--baseline",
    baselineFile,
  ]);
  assert.match(md.stdout, /## Baseline comparison/);
  assert.match(md.stdout, /delta: 0\.0/);
  assert.match(md.stdout, /No rule status changes\./);

  // Second run: compare against the saved baseline, JSON output.
  const json = await execFileAsync(process.execPath, [
    cliPath,
    "--path",
    passingRepo,
    "--format",
    "json",
    "--baseline",
    baselineFile,
  ]);
  const parsed = JSON.parse(json.stdout) as {
    score: number;
    baseline?: { oldScore: number; newScore: number; delta: number; changes: unknown[] };
  };
  assert.ok(parsed.baseline);
  assert.equal(parsed.baseline.delta, 0);
  assert.equal(parsed.baseline.changes.length, 0);
  assert.equal(parsed.baseline.oldScore, baselineReport.score);
  assert.equal(parsed.baseline.newScore, parsed.score);
});
