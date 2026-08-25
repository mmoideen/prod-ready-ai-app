import type { Rule } from "../types.js";
import { mergedDependencies } from "../context.js";

const AUTH_DEPENDENCY_NAMES = new Set(["next-auth", "@auth/core", "passport", "openid-client", "jose"]);
const MSAL_PREFIX = "@azure/msal-";
const PASSPORT_STRATEGY_PREFIX = "passport-";

const AUTH_CONFIG_FILE_PATTERN = /(^|\/)(auth\.ts|auth\.config\.ts)$/i;
const NEXTAUTH_ROUTE_PATTERN = /\[\.\.\.nextauth]/i;

// Middleware style patterns: an Authorization header handled near "bearer",
// or an API key header/value being compared or validated.
const BEARER_AUTH_PATTERN = /\bauthorization\b[\s\S]{0,60}\bbearer\b/i;
const API_KEY_VALIDATION_PATTERN = /\b(x-api-key|apiKey)\b[\s\S]{0,60}(===|==|\.equals\(|verify|validate)/i;

export const rule: Rule = {
  id: "AUTH-1",
  category: "Auth and access",
  title: "Authentication is present",
  weight: 5,
  evaluate(ctx) {
    const deps = mergedDependencies(ctx.packageJson);
    for (const name of Object.keys(deps)) {
      if (AUTH_DEPENDENCY_NAMES.has(name) || name.startsWith(MSAL_PREFIX) || name.startsWith(PASSPORT_STRATEGY_PREFIX)) {
        return {
          status: "pass",
          evidence: `package.json dependency "${name}" indicates an authentication provider`,
          remediation:
            "Use the template skeleton's Entra ID provider and RBAC policy module. Every internal tool must name who can access it and what each role can do.",
        };
      }
    }

    const configFile = ctx.files.find((f) => AUTH_CONFIG_FILE_PATTERN.test(f));
    if (configFile) {
      return {
        status: "pass",
        evidence: `Auth configuration file ${configFile} found`,
        remediation:
          "Use the template skeleton's Entra ID provider and RBAC policy module. Every internal tool must name who can access it and what each role can do.",
      };
    }

    const nextAuthRoute = ctx.files.find((f) => NEXTAUTH_ROUTE_PATTERN.test(f));
    if (nextAuthRoute) {
      return {
        status: "pass",
        evidence: `NextAuth catch all route ${nextAuthRoute} found`,
        remediation:
          "Use the template skeleton's Entra ID provider and RBAC policy module. Every internal tool must name who can access it and what each role can do.",
      };
    }

    for (const { path, content } of ctx.textFiles()) {
      if (BEARER_AUTH_PATTERN.test(content) || API_KEY_VALIDATION_PATTERN.test(content)) {
        return {
          status: "pass",
          evidence: `${path} contains bearer token or API key validation logic`,
          remediation:
            "Use the template skeleton's Entra ID provider and RBAC policy module. Every internal tool must name who can access it and what each role can do.",
        };
      }
    }

    return {
      status: "fail",
      evidence:
        "No authentication dependency (next-auth, @auth/core, @azure/msal-*, passport, openid-client, jose), auth configuration file, NextAuth catch all route, or bearer/API key validation pattern was found",
      remediation:
        "Use the template skeleton's Entra ID provider and RBAC policy module. Every internal tool must name who can access it and what each role can do.",
    };
  },
};
