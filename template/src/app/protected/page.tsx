import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { can } from "@/lib/rbac";
import { summarize } from "@/lib/ai";

const SAMPLE_TEXT =
  "The production readiness scorecard checks testing, CI/CD, security, auth, observability, evaluations, infrastructure as code, documentation, and support ownership before a tool is considered ready for broad daily use.";

async function doSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export default async function ProtectedPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/protected");
  }

  const role = session.user.role;
  const canEdit = can(session.user, "content:edit");
  const canAdmin = can(session.user, "admin:action");
  const { summary, usedMock } = await summarize(SAMPLE_TEXT);

  return (
    <section className="card">
      <h1>Protected page</h1>
      <p>
        Signed in as <strong>{session.user.name ?? session.user.email}</strong>, role{" "}
        <span className="badge">{role}</span>. This page and the{" "}
        <code>/api/admin-action</code> route both enforce role based access control
        server side using <code>src/lib/rbac.ts</code>.
      </p>

      <h2>What your role can do</h2>
      <ul>
        <li>View this page: yes, every signed in role.</li>
        <li>Edit content (&quot;content:edit&quot;): {canEdit ? "yes" : "no"}</li>
        <li>Trigger the admin action (&quot;admin:action&quot;): {canAdmin ? "yes" : "no"}</li>
      </ul>

      <h2>AI summarize function</h2>
      <p>
        Calling <code>summarize()</code> from <code>src/lib/ai.ts</code>
        {usedMock
          ? " in offline mock mode (AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY are not set):"
          : " using the configured Azure OpenAI deployment:"}
      </p>
      <blockquote>{summary}</blockquote>

      <h2>Admin action</h2>
      <p>
        <code>POST /api/admin-action</code> returns 401 signed out, 403 without the{" "}
        <code>admin:action</code> permission, and 200 for an admin. Try it from the
        browser console while signed in:
      </p>
      <pre>{'fetch("/api/admin-action", { method: "POST" }).then((r) => r.json()).then(console.log)'}</pre>

      <form action={doSignOut}>
        <button type="submit">Sign out</button>
      </form>
    </section>
  );
}
