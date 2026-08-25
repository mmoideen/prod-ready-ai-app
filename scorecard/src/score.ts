import type { Rule, RuleStatus } from "./types.js";
import type { RepoContext } from "./context.js";

/** A rule's evaluation result, flattened with its static metadata. */
export interface RuleEvaluation {
  id: string;
  category: string;
  title: string;
  weight: number;
  status: RuleStatus;
  evidence: string;
  remediation: string;
}

/** Weighted subtotal for one category. */
export interface CategorySubtotal {
  name: string;
  weightApplicable: number;
  weightPassed: number;
}

export type Grade = "A" | "B" | "C" | "D" | "F";

export const STAGE_EXPERIMENTAL = "Experimental";
export const STAGE_PILOT_AT_BEST = "Pilot at best";
export const STAGE_PILOT = "Pilot";
export const STAGE_PRODUCTION_READY = "Production ready";
export const STAGE_PRODUCTION_READY_BC_ELIGIBLE = "Production ready (business critical eligible)";

export interface ScoreResult {
  /** Weighted percentage of passing rules among applicable rules, rounded to 1 decimal. */
  score: number;
  grade: Grade;
  stageRecommendation: string;
  /** Sum of weights across every applicable (non NA) rule. */
  applicableWeight: number;
  /** Sum of weights across every rule in the registry, applicable or not. */
  totalWeight: number;
  categories: CategorySubtotal[];
  rules: RuleEvaluation[];
}

/** Run every rule in `rules` against `ctx`, in registry order. */
export function evaluateAll(rules: readonly Rule[], ctx: RepoContext): RuleEvaluation[] {
  return rules.map((rule) => {
    const result = rule.evaluate(ctx);
    return {
      id: rule.id,
      category: rule.category,
      title: rule.title,
      weight: rule.weight,
      status: result.status,
      evidence: result.evidence,
      remediation: result.remediation,
    };
  });
}

/** Map a 0-100 score to a letter grade. A >= 90, B >= 80, C >= 70, D >= 60, else F. */
export function gradeFor(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Map a 0-100 score to a lifecycle stage recommendation, per
 * docs/RUBRIC.md's lifecycle stage recommendation table.
 */
export function stageFor(score: number): string {
  if (score >= 92) return STAGE_PRODUCTION_READY_BC_ELIGIBLE;
  if (score >= 85) return STAGE_PRODUCTION_READY;
  if (score >= 70) return STAGE_PILOT;
  if (score >= 50) return STAGE_PILOT_AT_BEST;
  return STAGE_EXPERIMENTAL;
}

/**
 * Aggregate rule evaluations into a score, grade, stage recommendation, and
 * per-category subtotals.
 *
 * score = 100 * (sum of weights of passing rules) / (sum of weights of
 * applicable rules). Not applicable rules are excluded from both the
 * numerator and the denominator.
 */
export function computeScore(evaluations: RuleEvaluation[]): ScoreResult {
  const categoryOrder: string[] = [];
  const categoryMap = new Map<string, CategorySubtotal>();

  let applicableWeight = 0;
  let passedWeight = 0;
  let totalWeight = 0;

  for (const evaluation of evaluations) {
    totalWeight += evaluation.weight;

    if (!categoryMap.has(evaluation.category)) {
      categoryMap.set(evaluation.category, {
        name: evaluation.category,
        weightApplicable: 0,
        weightPassed: 0,
      });
      categoryOrder.push(evaluation.category);
    }

    if (evaluation.status === "na") continue;

    applicableWeight += evaluation.weight;
    const category = categoryMap.get(evaluation.category);
    if (!category) continue;
    category.weightApplicable += evaluation.weight;

    if (evaluation.status === "pass") {
      passedWeight += evaluation.weight;
      category.weightPassed += evaluation.weight;
    }
  }

  const rawScore = applicableWeight === 0 ? 0 : (100 * passedWeight) / applicableWeight;
  const score = Math.round(rawScore * 10) / 10;

  return {
    score,
    grade: gradeFor(score),
    stageRecommendation: stageFor(score),
    applicableWeight,
    totalWeight,
    categories: categoryOrder.map((name) => {
      const category = categoryMap.get(name);
      if (!category) throw new Error(`internal error: missing category subtotal for ${name}`);
      return category;
    }),
    rules: evaluations,
  };
}
