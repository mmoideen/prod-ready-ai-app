import type { Rule } from "../types.js";
import type { RepoContext } from "../context.js";

const RBAC_FILENAME_PATTERN = /(^|\/)(rbac|permissions)\.[a-z0-9]+$/i;
const RBAC_CODE_PATTERN = /\b(rbac|permissions?|authorize)\b|\bcan\(|\brole\s*[:=]|\broles\s*[:=]/i;
const CODE_EXTENSION_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs|py)$/i;

const DOC_PATH_PATTERN = /^(README\.md|SECURITY\.md|docs\/[^/]+\.md)$/i;
const ACCESS_MODEL_HEADING_PATTERN = /^#{1,6}.*\b(access model|access control|roles?|permissions?|rbac)\b.*$/im;

function findRbacCodeSignal(ctx: RepoContext): string | null {
  const filenameHit = ctx.files.find((f) => RBAC_FILENAME_PATTERN.test(f));
  if (filenameHit) return filenameHit;

  for (const { path, content } of ctx.textFiles()) {
    if (!CODE_EXTENSION_PATTERN.test(path)) continue;
    if (RBAC_CODE_PATTERN.test(content)) return path;
  }
  return null;
}

function findRbacDocSignal(ctx: RepoContext): string | null {
  const docPaths = ctx.files.filter((f) => DOC_PATH_PATTERN.test(f));
  for (const path of docPaths) {
    const content = ctx.readText(path);
    if (content && ACCESS_MODEL_HEADING_PATTERN.test(content)) return path;
  }
  return null;
}

export const rule: Rule = {
  id: "AUTH-2",
  category: "Auth and access",
  title: "RBAC is referenced in code or docs",
  weight: 5,
  evaluate(ctx) {
    const codeHit = findRbacCodeSignal(ctx);
    if (codeHit) {
      return {
        status: "pass",
        evidence: `${codeHit} references a role or permission model`,
        remediation:
          "Use the template skeleton's Entra ID provider and RBAC policy module. Every internal tool must name who can access it and what each role can do.",
      };
    }

    const docHit = findRbacDocSignal(ctx);
    if (docHit) {
      return {
        status: "pass",
        evidence: `${docHit} documents an access model`,
        remediation:
          "Use the template skeleton's Entra ID provider and RBAC policy module. Every internal tool must name who can access it and what each role can do.",
      };
    }

    return {
      status: "fail",
      evidence:
        "No rbac/roles/permissions identifiers were found in source files, and no documented access model exists in README.md, SECURITY.md, or docs/",
      remediation:
        "Add a role or permission model (see the template skeleton's RBAC policy module) and document who can access the tool and what each role can do.",
    };
  },
};
