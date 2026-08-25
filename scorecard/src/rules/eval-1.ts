import type { Rule } from "../types.js";
import type { RepoContext } from "../context.js";

const DATASET_FILE_PATTERN = /^evals\/[^/]+\.(json|jsonl|csv|ya?ml)$/i;

function datasetHasItems(ctx: RepoContext, path: string): boolean {
  const content = ctx.readText(path) ?? "";
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();

  if (ext === "jsonl") {
    return content.split(/\r?\n/).some((line) => line.trim().length > 0);
  }

  if (ext === "json") {
    try {
      const parsed: unknown = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed.length > 0;
      if (parsed && typeof parsed === "object") return Object.keys(parsed).length > 0;
      return false;
    } catch {
      return content.trim().length > 0;
    }
  }

  if (ext === "csv") {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lines.length >= 2; // header row plus at least one data row
  }

  if (ext === "yaml" || ext === "yml") {
    return /^\s*-\s+\S/m.test(content) || content.trim().length > 0;
  }

  return content.trim().length > 0;
}

export const rule: Rule = {
  id: "EVAL-1",
  category: "Evaluations",
  title: "An eval dataset exists",
  weight: 5,
  evaluate(ctx) {
    if (!ctx.aiSignals) {
      return {
        status: "na",
        evidence:
          "Repository has no AI signals (no AI SDK dependency, prompts/ directory, or evals/ directory), so evaluation rules do not apply",
        remediation:
          "Start from the template skeleton's evals/ stub: one golden dataset item and a runner that exits non zero below threshold.",
      };
    }

    const candidates = ctx.files.filter((f) => DATASET_FILE_PATTERN.test(f));
    const withItems = candidates.find((f) => datasetHasItems(ctx, f));

    if (withItems) {
      return {
        status: "pass",
        evidence: `${withItems} is an eval dataset with at least one item`,
        remediation:
          "Start from the template skeleton's evals/ stub: one golden dataset item and a runner that exits non zero below threshold.",
      };
    }

    if (candidates.length > 0) {
      return {
        status: "fail",
        evidence: `Found dataset file(s) under evals/ (${candidates.join(", ")}) but none contain at least one item`,
        remediation:
          "Start from the template skeleton's evals/ stub: one golden dataset item and a runner that exits non zero below threshold.",
      };
    }

    return {
      status: "fail",
      evidence: "No dataset file (JSON, JSONL, CSV, or YAML) was found under evals/",
      remediation:
        "Start from the template skeleton's evals/ stub: one golden dataset item and a runner that exits non zero below threshold.",
    };
  },
};
