import type { IncomingHttpHeaders } from "node:http";
import type { AppConfig } from "./config.js";
import type { Role } from "./rbac.js";

/**
 * Bearer token authentication (AUTH-1).
 *
 * Validates the Authorization: Bearer <token> header against the
 * configured API_TOKENS map (token -> role, parsed in src/config.ts). This
 * is a deliberately simple, zero-dependency stand-in for a real identity
 * provider. In a real deployment, tokens (or the signing key behind a
 * JWT/OIDC scheme, for example Microsoft Entra ID) are issued and rotated
 * from a vault, for example Azure Key Vault (see infra/bicep/main.bicep),
 * never hardcoded or read from a plain environment variable checked into a
 * deployment manifest.
 */

const BEARER_PREFIX = "Bearer ";

export interface AuthResult {
  readonly authenticated: boolean;
  readonly role: Role | null;
}

const UNAUTHENTICATED: AuthResult = { authenticated: false, role: null };

/**
 * Middleware-style check: given a request's headers and the app config,
 * returns whether the caller authenticated and, if so, which role their
 * token carries. Callers combine this with rbac.ts's can()/authorize() to
 * decide whether a specific route is permitted (see requirePermission() in
 * src/server.ts).
 */
export function authenticate(headers: IncomingHttpHeaders, config: AppConfig): AuthResult {
  const header = headers.authorization;
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return UNAUTHENTICATED;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (token.length === 0) {
    return UNAUTHENTICATED;
  }

  const role = config.apiTokens.get(token);
  if (!role) {
    return UNAUTHENTICATED;
  }

  return { authenticated: true, role };
}
