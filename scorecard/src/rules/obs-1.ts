import type { Rule } from "../types.js";
import { mergedDependencies } from "../context.js";

const OTEL_DEP_PREFIX = "@opentelemetry/";
const LOGGER_DEP_NAMES = new Set(["pino", "winston", "structlog", "applicationinsights"]);
const OTEL_FILE_PATTERN = /(^|\/)(otel|instrumentation)\.(ts|js|mjs|cjs)$/i;
const LOGGER_FILE_PATTERN = /(^|\/)(logger|logging)[^/]*\.(ts|js|mjs|cjs|py)$/i;

const PYTHON_DEP_NAMES = ["structlog", "opentelemetry", "applicationinsights"];

function pythonDependsOn(ctx: { readText(path: string): string | null }, name: string): boolean {
  const requirements = ctx.readText("requirements.txt");
  const pyproject = ctx.readText("pyproject.toml");
  const haystack = `${requirements ?? ""}\n${pyproject ?? ""}`.toLowerCase();
  return haystack.includes(name.toLowerCase());
}

export const rule: Rule = {
  id: "OBS-1",
  category: "Observability",
  title: "Telemetry or structured logging is set up",
  weight: 6,
  evaluate(ctx) {
    const deps = mergedDependencies(ctx.packageJson);

    const otelDep = Object.keys(deps).find((d) => d.startsWith(OTEL_DEP_PREFIX));
    if (otelDep) {
      return {
        status: "pass",
        evidence: `package.json dependency "${otelDep}" configures OpenTelemetry`,
        remediation:
          "Copy src/observability/otel.ts and the health route from the template skeleton. Operations cannot support what it cannot see.",
      };
    }

    const loggerDep = Object.keys(deps).find((d) => LOGGER_DEP_NAMES.has(d));
    if (loggerDep) {
      return {
        status: "pass",
        evidence: `package.json dependency "${loggerDep}" configures structured logging`,
        remediation:
          "Copy src/observability/otel.ts and the health route from the template skeleton. Operations cannot support what it cannot see.",
      };
    }

    const otelFile = ctx.files.find((f) => OTEL_FILE_PATTERN.test(f));
    if (otelFile) {
      return {
        status: "pass",
        evidence: `${otelFile} sets up telemetry`,
        remediation:
          "Copy src/observability/otel.ts and the health route from the template skeleton. Operations cannot support what it cannot see.",
      };
    }

    const loggerFile = ctx.files.find((f) => LOGGER_FILE_PATTERN.test(f));
    if (loggerFile) {
      return {
        status: "pass",
        evidence: `${loggerFile} provides a structured logger module`,
        remediation:
          "Copy src/observability/otel.ts and the health route from the template skeleton. Operations cannot support what it cannot see.",
      };
    }

    for (const name of PYTHON_DEP_NAMES) {
      if (pythonDependsOn(ctx, name)) {
        return {
          status: "pass",
          evidence: `Python dependency configuration references "${name}"`,
          remediation:
            "Copy src/observability/otel.ts and the health route from the template skeleton. Operations cannot support what it cannot see.",
        };
      }
    }

    return {
      status: "fail",
      evidence:
        "No OpenTelemetry dependency, otel.ts/instrumentation.ts file, structured logging dependency (pino, winston, structlog), Application Insights dependency, or logger module was found",
      remediation:
        "Copy src/observability/otel.ts and the health route from the template skeleton. Operations cannot support what it cannot see.",
    };
  },
};
