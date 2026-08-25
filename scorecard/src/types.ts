import type { RepoContext } from "./context.js";

/** Outcome of evaluating a single rule against a repository. */
export type RuleStatus = "pass" | "fail" | "na";

/** Result returned by a rule's evaluate() function. */
export interface RuleResult {
  /** pass, fail, or na (not applicable). */
  status: RuleStatus;
  /**
   * Human readable evidence, citing the actual file paths found, or stating
   * what was searched for and not found. Never empty.
   */
  evidence: string;
  /**
   * Remediation guidance shown when the rule fails. May be shown even for
   * passing/NA rules; renderers only surface it for failing rules.
   */
  remediation: string;
}

/** A single rule in the production readiness rubric. */
export interface Rule {
  /** Stable rule ID, for example "TEST-1". Matches docs/RUBRIC.md exactly. */
  readonly id: string;
  /** Category name, matching the rubric's weight summary table exactly. */
  readonly category: string;
  /** Short human readable rule title. */
  readonly title: string;
  /** Weight out of 100. Weights across the whole registry sum to 100. */
  readonly weight: number;
  /** Evaluate this rule against a repository context. */
  evaluate(ctx: RepoContext): RuleResult;
}
