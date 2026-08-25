import type { Rule } from "../types.js";
import { extractTopLevelBlock } from "./util.js";

const RUN_STEP_PATTERN = /\brun\s*:/;

function triggersOnPushOrPullRequest(content: string): boolean {
  const block = extractTopLevelBlock(content, "on");
  if (!block) return false;
  return /\bpush\b/.test(block) || /\bpull_request\b/.test(block);
}

export const rule: Rule = {
  id: "CICD-1",
  category: "CI/CD",
  title: "A CI workflow exists",
  weight: 5,
  evaluate(ctx) {
    const candidate = ctx.workflowFiles.find(
      (w) => triggersOnPushOrPullRequest(w.content) && RUN_STEP_PATTERN.test(w.content),
    );

    if (candidate) {
      return {
        status: "pass",
        evidence: `Workflow ${candidate.path} triggers on push or pull_request and runs build, lint, or test steps`,
        remediation:
          "Adopt the reusable workflows in this toolkit (reusable-ci.yml, reusable-deploy.yml) instead of writing bespoke pipelines.",
      };
    }

    const evidence =
      ctx.workflowFiles.length === 0
        ? "No workflow files exist under .github/workflows/"
        : `${ctx.workflowFiles.length} workflow file(s) found under .github/workflows/, but none trigger on push or pull_request while also running steps`;

    return {
      status: "fail",
      evidence,
      remediation:
        "Adopt the reusable workflows in this toolkit (reusable-ci.yml, reusable-deploy.yml) instead of writing bespoke pipelines.",
    };
  },
};
