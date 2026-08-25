import type { Rule } from "../types.js";

const IAC_FILE_PATTERN = /\.(bicep|tf)$/i;

export const rule: Rule = {
  id: "IAC-1",
  category: "Infrastructure as code",
  title: "Infrastructure is declared as code",
  weight: 8,
  evaluate(ctx) {
    const files = ctx.files.filter((f) => IAC_FILE_PATTERN.test(f));
    if (files.length > 0) {
      return {
        status: "pass",
        evidence: `Infrastructure as code file(s) found: ${files.slice(0, 3).join(", ")}`,
        remediation:
          "Consume the shared modules in infra-modules/ (keyvault, monitoring, postgres) rather than authoring resources from scratch.",
      };
    }

    return {
      status: "fail",
      evidence: "No .bicep or .tf files were found",
      remediation:
        "Consume the shared modules in infra-modules/ (keyvault, monitoring, postgres) rather than authoring resources from scratch.",
    };
  },
};
