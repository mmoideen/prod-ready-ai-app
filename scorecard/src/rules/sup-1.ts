import type { Rule } from "../types.js";

const SUPPORT_FILE_PATTERN = /^(SUPPORT|SUPPORT_HANDOFF)\.md$/i;
const CODEOWNERS_PATTERN = /^(\.github\/|docs\/)?CODEOWNERS$/i;
const README_PATTERN = /^README\.md$/i;

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const TEAM_HANDLE_PATTERN = /@[a-z0-9_-]+\/[a-z0-9_-]+/i;
const README_OWNER_HEADING_PATTERN = /^#{1,6}\s*(owner|maintainers?)\b/im;
const README_OWNER_LINE_PATTERN = /\bowner\s*:/i;

function nameOwnerInContent(content: string): boolean {
  if (EMAIL_PATTERN.test(content)) return true;
  if (TEAM_HANDLE_PATTERN.test(content)) return true;

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!/owner/i.test(line)) continue;
    const afterLabel = line.replace(/^.*owner[:\s-]*/i, "").trim();
    if (afterLabel.length > 0) return true;
    const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim().length > 0);
    if (nextNonEmpty) return true;
  }
  return false;
}

export const rule: Rule = {
  id: "SUP-1",
  category: "Support model",
  title: "An owner is named",
  weight: 8,
  evaluate(ctx) {
    const supportPath = ctx.files.find((f) => SUPPORT_FILE_PATTERN.test(f));
    if (supportPath) {
      const content = ctx.readText(supportPath) ?? "";
      if (nameOwnerInContent(content)) {
        return {
          status: "pass",
          evidence: `${supportPath} names an owner`,
          remediation:
            "Fill in templates/SUPPORT_HANDOFF.md. A tool nobody owns is already deprecated, it just does not know it yet.",
        };
      }
    }

    const codeownersPath = ctx.files.find((f) => CODEOWNERS_PATTERN.test(f));
    if (codeownersPath) {
      return {
        status: "pass",
        evidence: `${codeownersPath} found`,
        remediation:
          "Fill in templates/SUPPORT_HANDOFF.md. A tool nobody owns is already deprecated, it just does not know it yet.",
      };
    }

    const readmePath = ctx.files.find((f) => README_PATTERN.test(f));
    if (readmePath) {
      const content = ctx.readText(readmePath) ?? "";
      if (README_OWNER_HEADING_PATTERN.test(content) || README_OWNER_LINE_PATTERN.test(content)) {
        return {
          status: "pass",
          evidence: `${readmePath} contains an owner or maintainer section`,
          remediation:
            "Fill in templates/SUPPORT_HANDOFF.md. A tool nobody owns is already deprecated, it just does not know it yet.",
        };
      }
    }

    return {
      status: "fail",
      evidence:
        "No SUPPORT.md/SUPPORT_HANDOFF.md naming an owner, no CODEOWNERS file, and no owner/maintainer section in README.md",
      remediation:
        "Fill in templates/SUPPORT_HANDOFF.md. A tool nobody owns is already deprecated, it just does not know it yet.",
    };
  },
};
