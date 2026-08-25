import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "internal-tool-template",
  description:
    "Skeleton for internal AI tools: auth, RBAC, observability, and evals wired in from day one.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="site-header">
            <span className="brand">internal-tool-template</span>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/protected">Protected</Link>
              <Link href="/signin">Sign in</Link>
              <a href="/api/health">Health</a>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
