/**
 * OpenTelemetry bootstrap.
 *
 * Only ever called from src/instrumentation.ts inside the
 * `process.env.NEXT_RUNTIME === "nodejs"` guard. Every OpenTelemetry and
 * Azure Monitor import below is a dynamic import, so none of these packages
 * are ever pulled into the edge bundle: importing them unconditionally at
 * module scope is the usual way this kind of setup breaks `next build`.
 *
 * Exporter selection:
 * - APPLICATIONINSIGHTS_CONNECTION_STRING set: export spans to Azure Monitor.
 * - otherwise: export spans to the console, so telemetry is visible with zero
 *   configuration in local development and in CI.
 */

const DEFAULT_SERVICE_NAME = "internal-tool-template";

export async function startOpenTelemetry(): Promise<void> {
  const [{ NodeSDK }, { ConsoleSpanExporter, SimpleSpanProcessor, BatchSpanProcessor }, { resourceFromAttributes }, { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION }, { APP_VERSION }] =
    await Promise.all([
      import("@opentelemetry/sdk-node"),
      import("@opentelemetry/sdk-trace-base"),
      import("@opentelemetry/resources"),
      import("@opentelemetry/semantic-conventions"),
      import("../lib/version"),
    ]);

  const serviceName = process.env.OTEL_SERVICE_NAME || DEFAULT_SERVICE_NAME;
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: APP_VERSION,
  });

  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  const spanProcessor = connectionString
    ? await (async () => {
        const { AzureMonitorTraceExporter } = await import("@azure/monitor-opentelemetry-exporter");
        return new BatchSpanProcessor(new AzureMonitorTraceExporter({ connectionString }));
      })()
    : new SimpleSpanProcessor(new ConsoleSpanExporter());

  const sdk = new NodeSDK({
    resource,
    spanProcessors: [spanProcessor],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .catch((err: unknown) => console.error("Error shutting down OpenTelemetry", err))
      .finally(() => process.exit(0));
  });
}
