import type { Rule } from "../types.js";
import type { RepoContext } from "../context.js";

const NPM_PLACEHOLDER_PATTERN = /no test specified/i;

function isPlaceholderTestScript(script: string): boolean {
  const trimmed = script.trim();
  if (trimmed.length === 0) return true;
  return NPM_PLACEHOLDER_PATTERN.test(trimmed);
}

function findPythonTestConfig(ctx: RepoContext): string | null {
  if (ctx.hasFile("pytest.ini")) return "pytest.ini";
  if (ctx.hasFile("tox.ini")) return "tox.ini";
  if (ctx.hasFile("noxfile.py")) return "noxfile.py";
  const pyproject = ctx.readText("pyproject.toml");
  if (pyproject && /\[tool\.pytest/i.test(pyproject)) return "pyproject.toml ([tool.pytest...] section)";
  const setupCfg = ctx.readText("setup.cfg");
  if (setupCfg && /\[tool:pytest\]/i.test(setupCfg)) return "setup.cfg ([tool:pytest] section)";
  return null;
}

export const rule: Rule = {
  id: "TEST-1",
  category: "Testing",
  title: "A real test script exists",
  weight: 5,
  evaluate(ctx) {
    const pkg = ctx.packageJson;
    if (pkg) {
      const scripts = pkg.scripts as Record<string, string> | undefined;
      const testScript = scripts?.test;
      if (typeof testScript === "string" && !isPlaceholderTestScript(testScript)) {
        return {
          status: "pass",
          evidence: `package.json scripts.test is "${testScript}"`,
          remediation:
            "Add a real test runner, write at least one meaningful test for the core behavior, and call the test command from CI.",
        };
      }
    }

    const pythonConfig = findPythonTestConfig(ctx);
    if (pythonConfig) {
      return {
        status: "pass",
        evidence: `Python test configuration found: ${pythonConfig}`,
        remediation:
          "Add a real test runner, write at least one meaningful test for the core behavior, and call the test command from CI.",
      };
    }

    const evidence = pkg
      ? "package.json scripts.test is missing, empty, or the npm init placeholder (\"echo \\\"Error: no test specified\\\" && exit 1\"), and no Python test configuration (pytest.ini, tox.ini, noxfile.py, or a [tool.pytest]/[tool:pytest] section) was found"
      : "No package.json was found, and no Python test configuration (pytest.ini, tox.ini, noxfile.py, or a [tool.pytest]/[tool:pytest] section) was found";

    return {
      status: "fail",
      evidence,
      remediation:
        "Add a real test runner, write at least one meaningful test for the core behavior, and call the test command from CI.",
    };
  },
};
