/**
 * Role based access control policy for internal-tool-template.
 *
 * Three roles, smallest to largest: viewer, editor, admin. Each role's
 * permission set is a superset of the role below it. Server components and
 * API routes call `can(user, permission)` to enforce access; nothing in this
 * module trusts the client, every check here is meant to run server side.
 */

export const ROLES = ["viewer", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = ["content:view", "content:edit", "admin:action"] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Permissions granted to each role. Every role also has everything the role below it has. */
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  viewer: ["content:view"],
  editor: ["content:view", "content:edit"],
  admin: ["content:view", "content:edit", "admin:action"],
};

/** Minimal shape this module needs from a signed in user or session subject. */
export interface AuthorizableUser {
  role?: string | null;
}

/**
 * True when `value` is one of the three known role names. Accepts `unknown`
 * so it can narrow values coming from places TypeScript cannot otherwise
 * type precisely, such as third party session/JWT objects or form data.
 */
export function isRole(value: unknown): value is Role {
  return value === "viewer" || value === "editor" || value === "admin";
}

/**
 * Server side authorization check. Returns false for a missing user, a
 * missing role, or a role string that does not match a known role, so
 * callers never need to null check before calling this.
 */
export function can(user: AuthorizableUser | null | undefined, permission: Permission): boolean {
  const role = user?.role;
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

const ADMIN_EMAIL_ENV = "RBAC_ADMIN_EMAILS";
const EDITOR_EMAIL_ENV = "RBAC_EDITOR_EMAILS";

function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/**
 * Resolves a role for a signed in user, in priority order:
 * 1. An explicit role claim from the identity provider (for example an Entra
 *    ID app role, or the role chosen at local development sign in).
 * 2. An email allowlist read from RBAC_ADMIN_EMAILS / RBAC_EDITOR_EMAILS.
 * 3. Otherwise, the least privileged role, viewer.
 *
 * Replace step 2 with your real Entra ID app role or group claim mapping
 * once the tenant is configured; the env allowlist exists so the template
 * has a working role assignment path with zero external configuration.
 */
export function resolveRole(email: string | null | undefined, claimRole?: string | null): Role {
  if (isRole(claimRole)) return claimRole;

  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    if (parseEmailList(process.env[ADMIN_EMAIL_ENV]).includes(normalizedEmail)) return "admin";
    if (parseEmailList(process.env[EDITOR_EMAIL_ENV]).includes(normalizedEmail)) return "editor";
  }

  return "viewer";
}
