import type { Rule } from "../types.js";

const TEST_FILE_PATTERN = /(^|\/)[^/]*\.(test|spec)\.[^/]+$/i;
const PYTHON_TEST_FILE_PATTERN = /(^|\/)test_[^/]+\.py$/i;
const TEST_DIR_PATTERN = /(^|\/)(test|tests|__tests__)\//i;

export const rule: Rule = {
  id: "TEST-2",
  category: "Testing",
  title: "Test files are present",
  weight: 5,
  evaluate(ctx) {
    const matches = ctx.files.filter(
      (f) => TEST_FILE_PATTERN.test(f) || PYTHON_TEST_FILE_PATTERN.test(f) || TEST_DIR_PATTERN.test(f),
    );

    if (matches.length > 0) {
      return {
        status: "pass",
        evidence: `Found ${matches.length} test file(s), for example ${matches[0]}`,
        remediation:
          "Add a real test runner, write at least one meaningful test for the core behavior, and call the test command from CI.",
      };
    }

    return {
      status: "fail",
      evidence:
        "No files matching *.test.*, *.spec.*, test_*.py, or files under a test/, tests/, or __tests__/ directory were found",
      remediation:
        "Add at least one test file (for example src/tests/example.test.ts) that exercises core behavior.",
    };
  },
};
