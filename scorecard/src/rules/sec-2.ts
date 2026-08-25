import type { Rule } from "../types.js";
import type { RepoContext } from "../context.js";
import { containsPlaceholderWord, joinEvidenceList } from "./util.js";

const ENV_EXEMPT_PATTERN = /(^|\/)\.env\.(example|template)$/i;
const ENV_FILE_PATTERN = /(^|\/)\.env$/;
const ENV_VARIANT_PATTERN = /(^|\/)\.env\.[^/]+$/;

const PRIVATE_KEY_FILE_PATTERN = /(^|\/)(id_rsa|[^/]+\.pem|[^/]+\.p12|[^/]+\.pfx)$/i;
const PEM_HEADER_PATTERN = /-----BEGIN\s+(RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/;
const AWS_KEY_PATTERN = /\bAKIA[0-9A-Z]{16}\b/;
const GITHUB_TOKEN_PATTERN = /\bghp_[A-Za-z0-9]{36}\b/;

// KEY-ish identifier, then an assignment, then a long quoted-or-bare literal.
const API_KEY_ASSIGNMENT_PATTERN =
  /\b([A-Z0-9_]*(?:API|SECRET|TOKEN|KEY)[A-Z0-9_]*)\s*[:=]\s*["']?([A-Za-z0-9\-_/+.=]{20,})["']?/g;

function findCommittedEnvFiles(ctx: RepoContext): string[] {
  return ctx.files.filter((f) => {
    if (ENV_EXEMPT_PATTERN.test(f)) return false;
    return ENV_FILE_PATTERN.test(f) || ENV_VARIANT_PATTERN.test(f);
  });
}

function findApiKeyLikeAssignment(content: string): string | null {
  for (const match of content.matchAll(API_KEY_ASSIGNMENT_PATTERN)) {
    const varName = match[1];
    const value = match[2];
    if (!varName || !value) continue;
    if (containsPlaceholderWord(value)) continue;
    return `${varName}=${value.slice(0, 4)}...(redacted)`;
  }
  return null;
}

export const rule: Rule = {
  id: "SEC-2",
  category: "Security",
  title: "No obvious secrets are committed",
  weight: 4,
  evaluate(ctx) {
    const envFiles = findCommittedEnvFiles(ctx);
    const keyFiles = ctx.files.filter((f) => PRIVATE_KEY_FILE_PATTERN.test(f));

    const contentHits: string[] = [];
    for (const { path, content } of ctx.textFiles()) {
      if (PEM_HEADER_PATTERN.test(content)) {
        contentHits.push(`${path} (private key header)`);
        continue;
      }
      if (AWS_KEY_PATTERN.test(content)) {
        contentHits.push(`${path} (AWS access key id pattern)`);
        continue;
      }
      if (GITHUB_TOKEN_PATTERN.test(content)) {
        contentHits.push(`${path} (GitHub token pattern)`);
        continue;
      }
      const apiKeyHit = findApiKeyLikeAssignment(content);
      if (apiKeyHit) {
        contentHits.push(`${path} (${apiKeyHit})`);
      }
    }

    const problems = [
      ...envFiles.map((f) => `committed env file ${f}`),
      ...keyFiles.map((f) => `private key file ${f}`),
      ...contentHits,
    ];

    if (problems.length === 0) {
      return {
        status: "pass",
        evidence:
          "No committed .env file (other than .env.example/.env.template), no private key files, and no source lines matching known live credential shapes were found",
        remediation:
          "Purge any committed secret from history before promotion, and keep secrets in environment configuration or a vault, never in the repository.",
      };
    }

    return {
      status: "fail",
      evidence: `Potential committed secrets found: ${joinEvidenceList(problems)}`,
      remediation:
        "Remove the committed secret material, rotate any exposed credentials, and purge the secret from git history before promotion.",
    };
  },
};
