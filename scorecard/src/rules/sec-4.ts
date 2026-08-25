import type { Rule } from "../types.js";

const DEPENDABOT_PATHS = [".github/dependabot.yml", ".github/dependabot.yaml"];
const RENOVATE_PATHS = [".github/renovate.json", "renovate.json"];

export const rule: Rule = {
  id: "SEC-4",
  category: "Security",
  title: "Dependency updates are configured",
  weight: 4,
  evaluate(ctx) {
    const dependabot = DEPENDABOT_PATHS.find((p) => ctx.hasFile(p));
    if (dependabot) {
      return {
        status: "pass",
        evidence: `${dependabot} found`,
        remediation:
          "Add .github/dependabot.yml (or a Renovate configuration) to keep dependencies patched automatically.",
      };
    }

    const renovate = RENOVATE_PATHS.find((p) => ctx.hasFile(p));
    if (renovate) {
      return {
        status: "pass",
        evidence: `${renovate} found`,
        remediation:
          "Add .github/dependabot.yml (or a Renovate configuration) to keep dependencies patched automatically.",
      };
    }

    return {
      status: "fail",
      evidence: "No .github/dependabot.yml and no renovate.json / .github/renovate.json were found",
      remediation:
        "Add .github/dependabot.yml (or a Renovate configuration) to keep dependencies patched automatically.",
    };
  },
};
