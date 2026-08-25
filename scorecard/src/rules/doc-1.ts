import type { Rule } from "../types.js";

const README_PATTERN = /^README\.md$/i;
const HEADING_PATTERN = /^#{1,6}\s+\S/gm;
const MIN_BYTES = 400;
const MIN_HEADINGS = 2;

export const rule: Rule = {
  id: "DOC-1",
  category: "Documentation",
  title: "A substantive README exists",
  weight: 4,
  evaluate(ctx) {
    const readmePath = ctx.files.find((f) => README_PATTERN.test(f));
    if (!readmePath) {
      return {
        status: "fail",
        evidence: "No README.md found at the repository root",
        remediation: "Add a README.md describing what the tool does, who it is for, and how to run it.",
      };
    }

    const content = ctx.readText(readmePath) ?? "";
    const byteLength = Buffer.byteLength(content, "utf8");
    const headingCount = content.match(HEADING_PATTERN)?.length ?? 0;

    if (byteLength >= MIN_BYTES && headingCount >= MIN_HEADINGS) {
      return {
        status: "pass",
        evidence: `${readmePath} is ${byteLength} bytes with ${headingCount} heading(s)`,
        remediation: "Add a README.md describing what the tool does, who it is for, and how to run it.",
      };
    }

    return {
      status: "fail",
      evidence: `${readmePath} is ${byteLength} bytes with ${headingCount} heading(s) (needs at least ${MIN_BYTES} bytes and ${MIN_HEADINGS} headings)`,
      remediation:
        "Expand the README with at least two sections (for example Overview and Usage) totaling at least 400 bytes.",
    };
  },
};
