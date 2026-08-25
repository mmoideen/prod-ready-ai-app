import { isRole, type Role } from "./rbac.js";
import type { AzureOpenAiConfig } from "./ai/azure-openai.js";

/** Keep in sync with package.json's "version" field. */
export const VERSION = "0.1.0";

const DEFAULT_PORT = 3001;
const DEFAULT_AZURE_API_VERSION = "2024-06-01";

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: string;
  /** token -> role, parsed from API_TOKENS. See parseApiTokens() below. */
  readonly apiTokens: ReadonlyMap<string, Role>;
  /** Set only when every AZURE_OPENAI_* variable is present; see parseAzureOpenAi(). */
  readonly azureOpenAi: AzureOpenAiConfig | null;
}

/**
 * Parses API_TOKENS: a comma separated list of "token:role" pairs, for
 * example "tok-viewer-fake:viewer,tok-admin-fake:admin". This is a
 * deliberately simple, zero-dependency stand-in for a real credential
 * store. In a real deployment, issue and rotate these tokens (or the
 * signing key behind a JWT/OIDC scheme) from a vault such as Azure Key
 * Vault (see infra/bicep/main.bicep), never bake them into a plain
 * environment variable checked into a deployment manifest.
 *
 * Malformed pairs (no ":", empty token, or an unrecognized role) are
 * skipped rather than rejected outright, so one typo in the list does not
 * take down every other configured token.
 */
function parseApiTokens(raw: string | undefined): Map<string, Role> {
  const tokens = new Map<string, Role>();
  if (!raw) return tokens;

  for (const pair of raw.split(",")) {
    const trimmed = pair.trim();
    if (trimmed.length === 0) continue;

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) continue;

    const token = trimmed.slice(0, separatorIndex).trim();
    const roleValue = trimmed.slice(separatorIndex + 1).trim();
    if (token.length === 0 || !isRole(roleValue)) continue;

    tokens.set(token, roleValue);
  }

  return tokens;
}

/**
 * Builds the Azure OpenAI provider config, or null when any of the three
 * required variables is missing. All three (endpoint, key, deployment)
 * must be set for src/ai/index.ts to select the Azure OpenAI provider over
 * the deterministic mock provider.
 */
function parseAzureOpenAi(env: NodeJS.ProcessEnv): AzureOpenAiConfig | null {
  const endpoint = env.AZURE_OPENAI_ENDPOINT;
  const apiKey = env.AZURE_OPENAI_API_KEY;
  const deployment = env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !apiKey || !deployment) {
    return null;
  }

  const apiVersion = env.AZURE_OPENAI_API_VERSION;
  return {
    endpoint,
    apiKey,
    deployment,
    apiVersion: apiVersion && apiVersion.length > 0 ? apiVersion : DEFAULT_AZURE_API_VERSION,
  };
}

/** Accepts 0 (bind an OS assigned ephemeral port) through 65535. Anything else falls back to the default. */
function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim().length === 0) return DEFAULT_PORT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) return DEFAULT_PORT;
  return parsed;
}

/**
 * Reads configuration from `env` (defaults to process.env). Accepting env
 * as a parameter, rather than reaching for process.env directly, keeps
 * this pure and easy to unit test with a fabricated environment (see
 * src/tests/helpers.ts).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV && env.NODE_ENV.length > 0 ? env.NODE_ENV : "development",
    apiTokens: parseApiTokens(env.API_TOKENS),
    azureOpenAi: parseAzureOpenAi(env),
  };
}
