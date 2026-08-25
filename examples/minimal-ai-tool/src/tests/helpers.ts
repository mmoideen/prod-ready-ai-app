import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { loadConfig, type AppConfig } from "../config.js";
import { createApp } from "../server.js";
import { MockSummarizeProvider } from "../ai/mock.js";

/** Obviously fake token:role pairs, safe to commit. Matches .env.example. */
export const TEST_API_TOKENS = "tok-viewer-fake:viewer,tok-admin-fake:admin";
export const VIEWER_TOKEN = "tok-viewer-fake";
export const ADMIN_TOKEN = "tok-admin-fake";

/** Builds an AppConfig for tests: process.env plus a fixed, fake API_TOKENS. */
export function testConfig(overrides: Partial<NodeJS.ProcessEnv> = {}): AppConfig {
  return loadConfig({ ...process.env, API_TOKENS: TEST_API_TOKENS, ...overrides });
}

export interface TestServerHandle {
  readonly server: Server;
  readonly baseUrl: string;
}

/** Starts createApp() on an OS assigned ephemeral port (127.0.0.1:0). */
export async function startTestServer(config: AppConfig = testConfig()): Promise<TestServerHandle> {
  const server = createApp(config, new MockSummarizeProvider());

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected the test server to bind a TCP port");
  }
  const { port } = address as AddressInfo;

  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

export function stopTestServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
