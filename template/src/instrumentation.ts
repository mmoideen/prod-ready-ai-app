/**
 * Next.js instrumentation hook (stable since Next 15). `register()` runs once
 * per server runtime instance at boot. The nodejs guard, combined with the
 * dynamic imports inside src/observability/otel.ts, keeps every OpenTelemetry
 * package out of the edge bundle.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startOpenTelemetry } = await import("./observability/otel");
    await startOpenTelemetry();
  }
}
