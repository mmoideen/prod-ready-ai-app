// OpenTelemetry bootstrap referenced by OBS-1.
import { trace } from "@opentelemetry/api";

export const tracer = trace.getTracer("passing-repo-fixture");
