import type { Rule } from "../types.js";

const SCANNER_PATTERN = /(gitleaks|trufflehog|detect-secrets|reusable-ci)/i;

export const rule: Rule = {
  id: "SEC-1",
  category: "Security",
  title: "Secret scanning is configured",
  weight: 4,
  evaluate(ctx) {
    if (ctx.hasFile(".gitleaks.toml")) {
      return {
        status: "pass",
        evidence: ".gitleaks.toml found at repository root",
        remediation:
          "Enable the secret scan step in the reusable CI workflow, or add a gitleaks, trufflehog, or detect-secrets step, or commit a .gitleaks.toml.",
      };
    }

    const hit = ctx.workflowFiles.find((w) => SCANNER_PATTERN.test(w.content));
    if (hit) {
      return {
        status: "pass",
        evidence: `Workflow ${hit.path} references a secret scanner (gitleaks, trufflehog, detect-secrets) or the reusable CI workflow, which runs a secret scan`,
        remediation:
          "Enable the secret scan step in the reusable CI workflow, or add a gitleaks, trufflehog, or detect-secrets step, or commit a .gitleaks.toml.",
      };
    }

    return {
      status: "fail",
      evidence:
        "No .gitleaks.toml exists, and no workflow references gitleaks, trufflehog, detect-secrets, or the reusable-ci workflow",
      remediation:
        "Enable the secret scan step in the reusable CI workflow, or add a gitleaks, trufflehog, or detect-secrets step, or commit a .gitleaks.toml.",
    };
  },
};
