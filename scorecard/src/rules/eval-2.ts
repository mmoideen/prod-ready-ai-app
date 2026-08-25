import type { Rule } from "../types.js";
import type { RepoContext } from "../context.js";

const RUNNER_FILE_PATTERN = /^evals\/[^/]+\.(ts|js|mjs|cjs|py|sh)$/i;
const DOC_PATH_PATTERN = /^(README\.md|evals\/README\.md|docs\/[^/]+\.md)$/i;
const EVAL_WORKFLOW_PATTERN = /(evals\/|run[-_ ]?evals?\b)/i;

function findDocReferencingRunner(ctx: RepoContext, runnerPath: string): string | null {
  const base = runnerPath.slice(runnerPath.lastIndexOf("/") + 1);
  const docCandidates = ctx.files.filter((f) => DOC_PATH_PATTERN.test(f));
  for (const path of docCandidates) {
    const content = ctx.readText(path);
    if (content && content.includes(base)) return path;
  }
  return null;
}

export const rule: Rule = {
  id: "EVAL-2",
  category: "Evaluations",
  title: "An eval runner exists and is wired up",
  weight: 5,
  evaluate(ctx) {
    if (!ctx.aiSignals) {
      return {
        status: "na",
        evidence:
          "Repository has no AI signals (no AI SDK dependency, prompts/ directory, or evals/ directory), so evaluation rules do not apply",
        remediation:
          "Start from the template skeleton's evals/ stub: one golden dataset item and a runner that exits non zero below threshold. Grow the dataset with every regression found in production.",
      };
    }

    const runnerFiles = ctx.files.filter((f) => RUNNER_FILE_PATTERN.test(f));
    if (runnerFiles.length === 0) {
      return {
        status: "fail",
        evidence: "No runner script was found under evals/ (expected a .ts, .js, .mjs, .cjs, .py, or .sh file)",
        remediation:
          "Add a runner script under evals/ that executes the dataset and exits non zero below threshold.",
      };
    }

    const runnerFile = runnerFiles[0] as string;
    const scripts = ctx.packageJson?.scripts as Record<string, string> | undefined;
    const hasEvalScript = scripts !== undefined && Object.keys(scripts).some((name) => /eval/i.test(name));
    if (hasEvalScript) {
      return {
        status: "pass",
        evidence: `${runnerFile} exists and package.json declares a script that runs evals`,
        remediation:
          "Start from the template skeleton's evals/ stub: one golden dataset item and a runner that exits non zero below threshold. Grow the dataset with every regression found in production.",
      };
    }

    const docHit = findDocReferencingRunner(ctx, runnerFile);
    if (docHit) {
      return {
        status: "pass",
        evidence: `${runnerFile} is documented as runnable in ${docHit}`,
        remediation:
          "Start from the template skeleton's evals/ stub: one golden dataset item and a runner that exits non zero below threshold. Grow the dataset with every regression found in production.",
      };
    }

    const workflowHit = ctx.workflowFiles.find((w) => EVAL_WORKFLOW_PATTERN.test(w.content));
    if (workflowHit) {
      return {
        status: "pass",
        evidence: `Workflow ${workflowHit.path} runs the eval runner`,
        remediation:
          "Start from the template skeleton's evals/ stub: one golden dataset item and a runner that exits non zero below threshold. Grow the dataset with every regression found in production.",
      };
    }

    return {
      status: "fail",
      evidence: `${runnerFile} exists but is not wired up via an npm eval script, documentation, or a CI workflow step`,
      remediation: "Wire the eval runner into package.json (an eval script), document the command, or call it from CI.",
    };
  },
};
