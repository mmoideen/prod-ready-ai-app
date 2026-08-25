import packageJson from "../../package.json";

/** App version reported by the health endpoint and attached to telemetry resources. */
export const APP_VERSION: string = packageJson.version;
