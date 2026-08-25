import type { Rule } from "../types.js";
import { isPlaceholderValue } from "./util.js";

const ENV_EXAMPLE_PATTERN = /(^|\/)\.env\.(example|template)$/i;

interface EnvEntry {
  key: string;
  value: string;
}

function parseEnvLines(content: string): EnvEntry[] {
  const entries: EnvEntry[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries.push({ key, value });
  }
  return entries;
}

export const rule: Rule = {
  id: "SEC-3",
  category: "Security",
  title: "An env example exists with no real values",
  weight: 3,
  evaluate(ctx) {
    const path = ctx.files.find((f) => ENV_EXAMPLE_PATTERN.test(f));
    if (!path) {
      return {
        status: "fail",
        evidence: "No .env.example or .env.template file was found",
        remediation:
          "Add a .env.example file listing every required environment variable with empty or placeholder values.",
      };
    }

    const content = ctx.readText(path) ?? "";
    const entries = parseEnvLines(content);
    const realValues = entries.filter((e) => !isPlaceholderValue(e.value));

    if (realValues.length === 0) {
      return {
        status: "pass",
        evidence: `${path} exists with ${entries.length} variable(s), all empty or obvious placeholders`,
        remediation:
          "Replace real looking values in the env example file with empty strings or obvious placeholders (for example your-api-key-here or <value>).",
      };
    }

    return {
      status: "fail",
      evidence: `${path} contains non placeholder value(s) for: ${realValues.map((e) => e.key).join(", ")}`,
      remediation:
        "Replace real looking values in the env example file with empty strings or obvious placeholders (for example your-api-key-here or <value>).",
    };
  },
};
