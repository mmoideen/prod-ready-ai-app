import Link from "next/link";

export default function HomePage() {
  return (
    <section className="card">
      <h1>internal-tool-template</h1>
      <p>
        This is the application skeleton the platform engineering toolkit hands to a
        team starting a new internal AI tool. Authentication, role based access
        control, observability, an AI summarize stub with offline evals, CI/CD, and
        infrastructure as code are already wired in, so the production readiness
        scorecard grades this repository at or above the Production ready threshold
        (85) from the first commit.
      </p>

      <h2>What is already wired in</h2>
      <ul>
        <li>
          Auth.js (next-auth v5) with a Microsoft Entra ID provider configured from
          environment variables, plus a local development sign in path that needs no
          tenant.
        </li>
        <li>
          Role based access control (viewer, editor, admin) enforced server side on a
          protected page and an admin only API route.
        </li>
        <li>
          An OpenTelemetry bootstrap that exports spans to the console by default and
          to Azure Monitor when an Application Insights connection string is set.
        </li>
        <li>
          A health endpoint at <code>/api/health</code>, no authentication required.
        </li>
        <li>
          An AI summarize function backed by Azure OpenAI, with a deterministic
          offline mock and a golden eval dataset that runs with <code>npm run eval</code>.
        </li>
        <li>CI, deploy, eval gate, and readiness workflows that call this toolkit&apos;s reusable automation.</li>
        <li>Bicep and Terraform entry points that consume the toolkit&apos;s shared infrastructure modules.</li>
      </ul>

      <h2>Try it</h2>
      <p>
        <Link href="/signin">Sign in</Link> with the local development path (no Entra
        tenant required), then visit the <Link href="/protected">protected page</Link>{" "}
        to see role based access control and the AI summarize function in action.
      </p>

      <h2>Learn more</h2>
      <p>
        See <code>README.md</code> for the quickstart, the local dev and real Entra ID
        auth paths, and how the readiness scorecard grades this repository.
        Ownership and support are documented in <code>SUPPORT.md</code>.
      </p>
    </section>
  );
}
