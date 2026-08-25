/**
 * Role based access control policy for the ticket summarizer.
 *
 * Two roles, two permissions. Kept intentionally tiny: this is the whole
 * access model for the tool, and it is meant to be read top to bottom in
 * under a minute. See README.md's "Auth model" section for the narrative
 * version, and src/auth.ts for how a request's bearer token is resolved to
 * a Role before authorize()/can() ever runs.
 */

/** The two roles a bearer token can be assigned in API_TOKENS. */
export type Role = "viewer" | "admin";

/** The two permissions routes can require. */
export type Permission = "summarize" | "admin";

/** Static role -> permission grants. This *is* the access model. */
const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  viewer: ["summarize"],
  admin: ["summarize", "admin"],
};

/** Type guard: true when `value` is a known role string (from API_TOKENS). */
export function isRole(value: string): value is Role {
  return value === "viewer" || value === "admin";
}

/** True when `role` has been granted `permission` under the RBAC policy above. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Alias for can(), kept so call sites can read as prose:
 * `if (!authorize(role, "admin")) return forbidden();`
 */
export function authorize(role: Role, permission: Permission): boolean {
  return can(role, permission);
}
