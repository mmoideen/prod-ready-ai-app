import type { Rule } from "../types.js";

const HEALTH_ROUTE_FILE_PATTERN =
  /(^|\/)(app\/api\/(health|healthz|livez|readyz)[^/]*\/route\.(ts|js|tsx|jsx)|pages\/api\/(health|healthz|livez|readyz)[^/]*\.(ts|js|tsx|jsx))$/i;
const HEALTH_PATH_PATTERN = /\/(health|healthz|livez|readyz)\b/i;

export const rule: Rule = {
  id: "OBS-2",
  category: "Observability",
  title: "A health endpoint exists",
  weight: 6,
  evaluate(ctx) {
    const routeFile = ctx.files.find((f) => HEALTH_ROUTE_FILE_PATTERN.test(f));
    if (routeFile) {
      return {
        status: "pass",
        evidence: `${routeFile} implements a health route by app/pages file layout`,
        remediation:
          "Copy src/observability/otel.ts and the health route from the template skeleton. Operations cannot support what it cannot see.",
      };
    }

    for (const { path, content } of ctx.textFiles()) {
      if (HEALTH_PATH_PATTERN.test(content)) {
        return {
          status: "pass",
          evidence: `${path} references a health check path (/health, /healthz, /livez, or /readyz)`,
          remediation:
            "Copy src/observability/otel.ts and the health route from the template skeleton. Operations cannot support what it cannot see.",
        };
      }
    }

    return {
      status: "fail",
      evidence:
        "No /health, /healthz, /livez, or /readyz route was found in source files or the app/pages API file layout",
      remediation:
        "Add a lightweight health check route (see the template skeleton) that reports liveness and readiness.",
    };
  },
};
