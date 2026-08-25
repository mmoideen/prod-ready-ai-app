import type { Rule } from "../types.js";

const DEPLOY_CONTENT_PATTERN = /(vercel|azure\/webapps-deploy|docker\s+push|reusable-deploy)/i;
const DEPLOY_FILENAME_PATTERN = /(^|\/)(deploy|cd|release)[^/]*\.ya?ml$/i;

export const rule: Rule = {
  id: "CICD-2",
  category: "CI/CD",
  title: "A deploy workflow exists",
  weight: 5,
  evaluate(ctx) {
    const byContent = ctx.workflowFiles.find((w) => DEPLOY_CONTENT_PATTERN.test(w.content));
    if (byContent) {
      return {
        status: "pass",
        evidence: `Workflow ${byContent.path} references a deployment step (Vercel, Azure Web Apps, container registry push, or a reusable deploy workflow)`,
        remediation:
          "Adopt the reusable workflows in this toolkit (reusable-ci.yml, reusable-deploy.yml) instead of writing bespoke pipelines.",
      };
    }

    const byName = ctx.workflowFiles.find((w) => DEPLOY_FILENAME_PATTERN.test(w.path));
    if (byName) {
      return {
        status: "pass",
        evidence: `Workflow file ${byName.path} is named as a deploy workflow (deploy, cd, or release)`,
        remediation:
          "Adopt the reusable workflows in this toolkit (reusable-ci.yml, reusable-deploy.yml) instead of writing bespoke pipelines.",
      };
    }

    const evidence =
      ctx.workflowFiles.length === 0
        ? "No workflow files exist under .github/workflows/"
        : `${ctx.workflowFiles.length} workflow file(s) found, but none reference a deployment step and none are named deploy, cd, or release`;

    return {
      status: "fail",
      evidence,
      remediation:
        "Adopt the reusable workflows in this toolkit (reusable-ci.yml, reusable-deploy.yml) instead of writing bespoke pipelines.",
    };
  },
};
