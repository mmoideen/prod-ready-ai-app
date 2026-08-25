import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { isRole, resolveRole, type Role } from "@/lib/rbac";

/**
 * Auth.js (next-auth v5) configuration.
 *
 * Two sign in paths:
 * 1. Microsoft Entra ID, configured entirely from environment variables. Only
 *    registered when both the client ID and secret are present, so the app
 *    still boots (and builds, and tests) with no tenant configured.
 * 2. "Local development": a credentials provider that signs in a fake user
 *    with a role you choose, no tenant required. Only ever registered when
 *    NODE_ENV is not "production" AND AUTH_LOCAL_DEV=true, so it can never
 *    ship active in a production deployment even if the env var leaks into
 *    a production environment by mistake.
 */

const providers: Provider[] = [];

const entraIdEnvConfigured = Boolean(
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
);

if (entraIdEnvConfigured) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  );
}

const localDevEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_LOCAL_DEV === "true";

if (localDevEnabled) {
  const defaultLocalDevRole: Role = isRole(process.env.AUTH_LOCAL_DEV_ROLE) ? process.env.AUTH_LOCAL_DEV_ROLE : "admin";

  providers.push(
    Credentials({
      id: "local-dev",
      name: "Local development",
      credentials: {
        name: { label: "Display name", type: "text" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const requestedRole = typeof credentials?.role === "string" ? credentials.role : undefined;
        const requestedName = typeof credentials?.name === "string" ? credentials.name : undefined;

        return {
          id: "local-dev-user",
          name: requestedName && requestedName.length > 0 ? requestedName : "Local Dev User",
          email: "local-dev@example.test",
          role: isRole(requestedRole) ? requestedRole : defaultLocalDevRole,
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const claimRole = (user as { role?: string }).role ?? null;
        token.role = resolveRole(token.email, claimRole);
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = isRole(token.role) ? token.role : "viewer";
      return session;
    },
  },
});

/** Whether the Microsoft Entra ID provider is configured and registered. */
export const entraIdConfigured = entraIdEnvConfigured;

/** Whether the local development credentials provider is registered. */
export const localDevConfigured = localDevEnabled;
