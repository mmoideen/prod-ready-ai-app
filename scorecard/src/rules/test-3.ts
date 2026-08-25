import type { Rule } from "../types.js";

const TEST_COMMAND_PATTERN = /(npm\s+test|pnpm\s+test|yarn\s+test|vitest|jest|pytest|node\s+--test|npm\s+run\s+test)/i;
const REUSABLE_CI_PATTERN = /reusable-ci/i;

export const rule: Rule = {
  id: "TEST-3",
  category: "Testing",
  title: "CI runs the tests",
  weight: 5,
  evaluate(ctx) {
    if (ctx.workflowFiles.length === 0) {
      return {
        status: "na",
        evidence:
          "No workflow files exist under .github/workflows/, so CICD-1 already reports the missing CI and this rule is not applicable",
        remediation:
          "Add a test runner, write at least one meaningful test for the core behavior, and call the test command from CI.",
      };
    }

    const hit = ctx.workflowFiles.find(
      (w) => TEST_COMMAND_PATTERN.test(w.content) || REUSABLE_CI_PATTERN.test(w.content),
    );

    if (hit) {
      return {
        status: "pass",
        evidence: `Workflow ${hit.path} invokes the test command or the reusable CI workflow`,
        remediation:
          "Add a test runner, write at least one meaningful test for the core behavior, and call the test command from CI.",
      };
    }

    return {
      status: "fail",
      evidence: `${ctx.workflowFiles.length} workflow file(s) found, but none invoke npm test, pnpm test, yarn test, vitest, jest, pytest, node --test, or the reusable-ci workflow`,
      remediation: "Call the test command from a CI workflow step, or adopt reusable-ci.yml.",
    };
  },
};
