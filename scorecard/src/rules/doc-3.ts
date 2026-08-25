import type { Rule } from "../types.js";

const PRODUCTION_READINESS_PATTERN = /^(docs\/)?production_readiness\.md$/i;

export const rule: Rule = {
  id: "DOC-3",
  category: "Documentation",
  title: "A production readiness checklist exists",
  weight: 4,
  evaluate(ctx) {
    const path = ctx.files.find((f) => PRODUCTION_READINESS_PATTERN.test(f));
    if (path) {
      return {
        status: "pass",
        evidence: `${path} found`,
        remediation:
          "Copy templates/PRODUCTION_READINESS.md and fill in the placeholders. The checklist mirrors this rubric, so completing it honestly predicts your score.",
      };
    }

    return {
      status: "fail",
      evidence: "No PRODUCTION_READINESS.md found at the repository root or under docs/",
      remediation:
        "Copy templates/PRODUCTION_READINESS.md and fill in the placeholders. The checklist mirrors this rubric, so completing it honestly predicts your score.",
    };
  },
};
