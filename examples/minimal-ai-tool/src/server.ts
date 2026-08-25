import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { loadConfig, VERSION, type AppConfig } from "./config.js";
import { logger, withRequestId } from "./logger.js";
import { authenticate } from "./auth.js";
import { can, type Permission, type Role } from "./rbac.js";
import { selectProvider } from "./ai/index.js";
import type { SummarizeProvider } from "./ai/provider.js";

const MAX_BODY_BYTES = 1_000_000; // 1 MB: generous for ticket text, cheap protection against unbounded bodies.
const SHUTDOWN_TIMEOUT_MS = 10_000;

interface RequestStats {
  total: number;
  readonly byRoute: Map<string, number>;
}

function createStats(): RequestStats {
  return { total: 0, byRoute: new Map() };
}

function recordRequest(stats: RequestStats, routeKey: string): void {
  stats.total += 1;
  stats.byRoute.set(routeKey, (stats.byRoute.get(routeKey) ?? 0) + 1);
}

/** Reads and concatenates a request body, rejecting anything over MAX_BODY_BYTES. */
async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("request body too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
}

interface SummarizeBody {
  readonly text: string;
}

function parseSummarizeBody(raw: string): SummarizeBody | null {
  if (raw.trim().length === 0) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "text" in data &&
    typeof (data as { text: unknown }).text === "string" &&
    (data as { text: string }).text.trim().length > 0
  ) {
    return { text: (data as { text: string }).text };
  }

  return null;
}

/**
 * Combines authenticate() (src/auth.ts) with can() (src/rbac.ts): missing or
 * invalid token -> 401, valid token lacking `permission` -> 403. Returns the
 * caller's Role on success so route handlers can use it (currently unused
 * beyond the permission check, but kept for parity with a real RBAC seam).
 */
function requirePermission(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  permission: Permission,
): Role | null {
  const auth = authenticate(req.headers, config);
  if (!auth.authenticated || !auth.role) {
    sendJson(res, 401, {
      error: "unauthorized",
      message: "A valid Authorization: Bearer <token> header is required.",
    });
    return null;
  }

  if (!can(auth.role, permission)) {
    sendJson(res, 403, {
      error: "forbidden",
      message: `Role "${auth.role}" does not have the "${permission}" permission.`,
    });
    return null;
  }

  return auth.role;
}

/** Builds the node:http server. Does not call listen(); see main() below and src/tests/helpers.ts. */
export function createApp(config: AppConfig, provider: SummarizeProvider): Server {
  const stats = createStats();
  const startedAt = Date.now();

  return createServer((req, res) => {
    void handleRequest(req, res, config, provider, stats, startedAt);
  });
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  provider: SummarizeProvider,
  stats: RequestStats,
  startedAt: number,
): Promise<void> {
  const requestId = randomUUID();
  const requestLogger = withRequestId(requestId);
  const start = process.hrtime.bigint();
  const method = req.method ?? "GET";
  const path = new URL(req.url ?? "/", "http://localhost").pathname;

  res.setHeader("x-request-id", requestId);
  recordRequest(stats, `${method} ${path}`);

  const finish = (status: number): void => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    requestLogger.info("request completed", {
      method,
      path,
      status,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  };

  try {
    if (method === "GET" && path === "/healthz") {
      sendJson(res, 200, {
        status: "ok",
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        version: VERSION,
      });
      finish(200);
      return;
    }

    if (method === "POST" && path === "/api/summarize") {
      if (!requirePermission(req, res, config, "summarize")) {
        finish(res.statusCode);
        return;
      }

      const raw = await readBody(req);
      const parsed = parseSummarizeBody(raw);
      if (!parsed) {
        sendJson(res, 400, {
          error: "bad_request",
          message: 'Expected a JSON body shaped like { "text": string }.',
        });
        finish(400);
        return;
      }

      const result = await provider.summarize({ text: parsed.text });
      sendJson(res, 200, { summary: result.summary });
      finish(200);
      return;
    }

    if (method === "GET" && path === "/api/admin/stats") {
      if (!requirePermission(req, res, config, "admin")) {
        finish(res.statusCode);
        return;
      }

      sendJson(res, 200, {
        totalRequests: stats.total,
        byRoute: Object.fromEntries(stats.byRoute),
      });
      finish(200);
      return;
    }

    sendJson(res, 404, { error: "not_found", message: `No route for ${method} ${path}.` });
    finish(404);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    requestLogger.error("request failed", { method, path, error: message });
    if (!res.headersSent) {
      sendJson(res, 500, { error: "internal_error", message: "Unexpected server error." });
    }
    finish(500);
  }
}

function installShutdownHandlers(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("shutdown signal received", { signal });

    server.close((err) => {
      if (err) {
        logger.error("error while closing server", { error: err.message });
        process.exitCode = 1;
      } else {
        logger.info("server closed cleanly");
      }
    });

    // In-flight requests get SHUTDOWN_TIMEOUT_MS to finish before we force-exit.
    setTimeout(() => {
      logger.warn("forcing shutdown: server did not close within the timeout", {
        timeoutMs: SHUTDOWN_TIMEOUT_MS,
      });
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

function main(): void {
  const config = loadConfig();
  const provider = selectProvider(config);
  const server = createApp(config, provider);

  server.listen(config.port, () => {
    // Read the actual bound port back from the socket rather than
    // config.port, so PORT=0 (bind an OS assigned ephemeral port) logs the
    // real port instead of "0".
    const address = server.address();
    const boundPort = address && typeof address === "object" ? address.port : config.port;
    logger.info("server started", { port: boundPort, provider: provider.name, version: VERSION });
  });

  installShutdownHandlers(server);
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && entry === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  main();
}
