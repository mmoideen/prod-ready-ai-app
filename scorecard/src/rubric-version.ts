/**
 * Version of docs/RUBRIC.md that this scorecard implements. Bump the minor
 * version for rule additions or weight changes, and the major version for
 * breaking changes to rule IDs. Reported in every scorecard output so a
 * report always states which rubric produced it.
 */
export const RUBRIC_VERSION = "1.0.0";

/**
 * Version of the JSON report shape produced by src/report.ts. Bump this
 * independently of RUBRIC_VERSION when the report structure itself changes.
 */
export const SCHEMA_VERSION = "1.0.0";

/** Total number of rules in the registry. Weights across all rules sum to 100. */
export const EXPECTED_RULE_COUNT = 20;

/** Total weight across all rules. */
export const EXPECTED_TOTAL_WEIGHT = 100;
