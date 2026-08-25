import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { can } from "@/lib/rbac";

/**
 * Example admin-only server side action. Demonstrates the same RBAC
 * enforcement pattern used on the protected page, applied to an API route:
 * 401 with no session, 403 without the admin:action permission.
 */
export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!can(session.user, "admin:action")) {
    return NextResponse.json({ error: "Forbidden", role: session.user.role }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    message: `Admin action executed by ${session.user.email ?? session.user.name ?? "unknown user"}.`,
  });
}
