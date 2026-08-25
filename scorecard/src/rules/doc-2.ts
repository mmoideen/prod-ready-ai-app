import type { Rule } from "../types.js";

const RUNBOOK_PATTERN = /^(docs\/)?runbook\.md$/i;

export const rule: Rule = {
  id: "DOC-2",
  category: "Documentation",
  title: "A runbook exists",
  weight: 4,
  evaluate(ctx) {
    const path = ctx.files.find((f) => RUNBOOK_PATTERN.test(f));
    if (!path) {
      return {
        status: "fail",
        evidence: "No RUNBOOK.md found at the repository root or under docs/",
        remediation:
          "Copy the templates from templates/ and fill in the placeholders, covering deploy, rollback, health checks, and common failures.",
      };
    }

    const content = (ctx.readText(path) ?? "").toLowerCase();
    const hasDeploy = content.includes("deploy");
    const hasRollback = content.includes("rollback");

    if (hasDeploy && hasRollback) {
      return {
        status: "pass",
        evidence: `${path} contains both deploy and rollback content`,
        remediation:
          "Copy the templates from templates/ and fill in the placeholders, covering deploy, rollback, health checks, and common failures.",
      };
    }

    const missing = [!hasDeploy ? "deploy" : null, !hasRollback ? "rollback" : null].filter(Boolean).join(" and ");
    return {
      status: "fail",
      evidence: `${path} exists but is missing ${missing} content`,
      remediation: "Document both the deploy procedure and the rollback procedure in the runbook.",
    };
  },
};
