import type { Rule } from "./types.js";
import type { ScoreResult } from "./score.js";
import { RUBRIC_VERSION, SCHEMA_VERSION } from "./rubric-version.js";

export type ReportFormat = "md" | "json";

const STATUS_ICON: Record<string, string> = {
  pass: "PASS",
  fail: "FAIL",
  na: "N/A",
};

/** Minimal shape read back from a previously saved JSON report, for --baseline. */
export interface BaselineSource {
  score: number;
  rules: Array<{ id: string; status: string }>;
}

export interface BaselineRuleChange {
  id: string;
  from: string;
  to: string;
}

export interface BaselineDelta {
  oldScore: number;
  newScore: number;
  delta: number;
  changes: BaselineRuleChange[];
}

export interface ReportInput {
  /** Path as given on the command line (not necessarily resolved/absolute). */
  path: string;
  scoreResult: ScoreResult;
  minScore: number | null;
  passed: boolean | null;
  /** ISO timestamp. Defaults to now; overridable for deterministic tests. */
  generatedAt?: string;
  baseline?: BaselineSource | null;
}

export interface JsonRuleEntry {
  id: string;
  category: string;
  title: string;
  weight: number;
  status: string;
  evidence: string;
  remediation: string;
}

export interface JsonCategoryEntry {
  name: string;
  weightApplicable: number;
  weightPassed: number;
}

export interface JsonReport {
  schemaVersion: string;
  rubricVersion: string;
  generatedAt: string;
  path: string;
  score: number;
  grade: string;
  stageRecommendation: string;
  minScore: number | null;
  passed: boolean | null;
  categories: JsonCategoryEntry[];
  rules: JsonRuleEntry[];
  baseline?: BaselineDelta;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatSignedDelta(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}`;
  return rounded.toFixed(1);
}

/** Compute the score delta and per-rule status changes against a baseline report. */
export function computeBaselineDelta(current: ScoreResult, baseline: BaselineSource): BaselineDelta {
  const oldScore = baseline.score;
  const newScore = current.score;
  const delta = Math.round((newScore - oldScore) * 10) / 10;

  const oldStatusById = new Map(baseline.rules.map((r) => [r.id, r.status]));
  const changes: BaselineRuleChange[] = [];
  for (const rule of current.rules) {
    const previous = oldStatusById.get(rule.id);
    if (previous !== undefined && previous !== rule.status) {
      changes.push({ id: rule.id, from: previous, to: rule.status });
    }
  }

  return { oldScore, newScore, delta, changes };
}

function renderBaselineMarkdown(delta: BaselineDelta): string {
  const lines: string[] = [];
  lines.push("## Baseline comparison");
  lines.push("");
  lines.push(
    `New score: ${delta.newScore.toFixed(1)}, old score: ${delta.oldScore.toFixed(1)}, delta: ${formatSignedDelta(delta.delta)}`,
  );
  lines.push("");
  if (delta.changes.length === 0) {
    lines.push("No rule status changes.");
  } else {
    lines.push("Rule changes:");
    for (const change of delta.changes) {
      lines.push(`- ${change.id}: ${change.from} -> ${change.to}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

/** Render the full scorecard report as markdown. */
export function renderMarkdown(input: ReportInput): string {
  const { scoreResult } = input;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const lines: string[] = [];

  lines.push("# Production Readiness Scorecard");
  lines.push("");
  lines.push(`Generated for: ${input.path}`);
  lines.push(`Rubric version: ${RUBRIC_VERSION}`);
  lines.push(`Generated at: ${generatedAt}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Score: ${scoreResult.score.toFixed(1)} / 100 (Grade ${scoreResult.grade})`);
  lines.push(`- Stage recommendation: ${scoreResult.stageRecommendation}`);
  lines.push(`- Applicable weight: ${scoreResult.applicableWeight} / ${scoreResult.totalWeight}`);
  if (input.minScore !== null) {
    const verdict = input.passed ? "met" : "not met";
    lines.push(`- Min score: ${input.minScore} (${verdict})`);
  }
  lines.push("");

  lines.push("## Category breakdown");
  lines.push("");
  lines.push("| Category | Passed / Applicable weight |");
  lines.push("| --- | --- |");
  for (const category of scoreResult.categories) {
    lines.push(`| ${escapeCell(category.name)} | ${category.weightPassed} / ${category.weightApplicable} |`);
  }
  lines.push("");

  lines.push("## Results");
  lines.push("");
  lines.push("| Status | ID | Title | Weight | Evidence |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const rule of scoreResult.rules) {
    const icon = STATUS_ICON[rule.status] ?? rule.status.toUpperCase();
    lines.push(
      `| ${icon} | ${rule.id} | ${escapeCell(rule.title)} | ${rule.weight} | ${escapeCell(rule.evidence)} |`,
    );
  }
  lines.push("");

  lines.push("## Remediation");
  lines.push("");
  const failing = scoreResult.rules.filter((r) => r.status === "fail");
  if (failing.length === 0) {
    lines.push("No failing rules. Nothing to remediate.");
    lines.push("");
  } else {
    for (const rule of failing) {
      lines.push(`### FAIL ${rule.id}: ${rule.title}`);
      lines.push("");
      lines.push(rule.remediation);
      lines.push("");
    }
  }

  if (input.baseline) {
    const delta = computeBaselineDelta(scoreResult, input.baseline);
    lines.push(renderBaselineMarkdown(delta));
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** Render the full scorecard report as a JSON string (2 space indent). */
export function renderJson(input: ReportInput): string {
  const { scoreResult } = input;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const report: JsonReport = {
    schemaVersion: SCHEMA_VERSION,
    rubricVersion: RUBRIC_VERSION,
    generatedAt,
    path: input.path,
    score: scoreResult.score,
    grade: scoreResult.grade,
    stageRecommendation: scoreResult.stageRecommendation,
    minScore: input.minScore,
    passed: input.passed,
    categories: scoreResult.categories.map((c) => ({
      name: c.name,
      weightApplicable: c.weightApplicable,
      weightPassed: c.weightPassed,
    })),
    rules: scoreResult.rules.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      weight: r.weight,
      status: r.status,
      evidence: r.evidence,
      remediation: r.remediation,
    })),
  };

  if (input.baseline) {
    report.baseline = computeBaselineDelta(scoreResult, input.baseline);
  }

  return JSON.stringify(report, null, 2);
}

/** Render the rule catalog (id, category, title, weight) as markdown, for --list-rules. */
export function renderRuleCatalogMarkdown(rules: readonly Rule[]): string {
  const lines: string[] = [];
  lines.push("# Rule catalog");
  lines.push("");
  lines.push(`Rubric version: ${RUBRIC_VERSION}`);
  lines.push("");
  lines.push("| ID | Category | Title | Weight |");
  lines.push("| --- | --- | --- | --- |");
  let totalWeight = 0;
  for (const rule of rules) {
    totalWeight += rule.weight;
    lines.push(`| ${rule.id} | ${escapeCell(rule.category)} | ${escapeCell(rule.title)} | ${rule.weight} |`);
  }
  lines.push("");
  lines.push(`Total weight: ${totalWeight}`);
  return lines.join("\n").trimEnd() + "\n";
}

/** Render the rule catalog as a machine readable JSON string, for --list-rules --format json. */
export function renderRuleCatalogJson(rules: readonly Rule[]): string {
  let totalWeight = 0;
  const entries = rules.map((rule) => {
    totalWeight += rule.weight;
    return { id: rule.id, category: rule.category, title: rule.title, weight: rule.weight };
  });
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      rubricVersion: RUBRIC_VERSION,
      rules: entries,
      totalWeight,
    },
    null,
    2,
  );
}
