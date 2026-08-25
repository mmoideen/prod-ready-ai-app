import { APP_VERSION } from "./version";

export interface HealthPayload {
  status: "ok";
  uptime: number;
  version: string;
  timestamp: string;
}

/**
 * Pure health payload builder, kept separate from the route handler in
 * src/app/api/health/route.ts so it can be unit tested without going
 * through the Next.js server runtime.
 */
export function getHealthPayload(): HealthPayload {
  return {
    status: "ok",
    uptime: process.uptime(),
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  };
}
