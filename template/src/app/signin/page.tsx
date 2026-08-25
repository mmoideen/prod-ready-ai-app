import { redirect } from "next/navigation";

import { auth, entraIdConfigured, localDevConfigured, signIn } from "@/auth";
import { isRole } from "@/lib/rbac";

async function signInWithEntra() {
  "use server";
  await signIn("microsoft-entra-id", { redirectTo: "/protected" });
}

async function signInLocally(formData: FormData) {
  "use server";
  const name = formData.get("name");
  const role = formData.get("role");

  await signIn("local-dev", {
    redirectTo: "/protected",
    name: typeof name === "string" ? name : undefined,
    role: typeof role === "string" && isRole(role) ? role : undefined,
  });
}

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/protected");
  }

  return (
    <section className="card">
      <h1>Sign in</h1>
      <p>internal-tool-template supports two sign in paths. See README.md for setup details.</p>

      <h2>Microsoft Entra ID</h2>
      {entraIdConfigured ? (
        <form action={signInWithEntra}>
          <button type="submit">Sign in with Microsoft Entra ID</button>
        </form>
      ) : (
        <p>
          Not configured. Set AUTH_MICROSOFT_ENTRA_ID_ID, AUTH_MICROSOFT_ENTRA_ID_SECRET, and
          AUTH_MICROSOFT_ENTRA_ID_ISSUER to enable it.
        </p>
      )}

      <h2>Local development</h2>
      {localDevConfigured ? (
        <>
          <p>
            Only available outside production, with AUTH_LOCAL_DEV=true. Signs in a
            fake user with the role you choose, no tenant required.
          </p>
          <form action={signInLocally}>
            <label>
              Display name
              <input type="text" name="name" defaultValue="Local Dev User" />
            </label>
            <label>
              Role
              <select name="role" defaultValue="admin">
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button type="submit">Sign in as local dev user</button>
          </form>
        </>
      ) : (
        <p>
          Not enabled. Set AUTH_LOCAL_DEV=true (only ever honored outside production)
          to enable it.
        </p>
      )}
    </section>
  );
}
