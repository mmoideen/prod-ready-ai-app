/**
 * Structured JSON logger (OBS-1). Every line written by this module is a
 * single JSON object with a stable shape: timestamp, level, message, plus
 * caller supplied fields (typically requestId and, on request-completion
 * lines, durationMs). No external logging library is used, in keeping with
 * this tool's zero-runtime-dependency constraint; stdout/stderr in
 * structured JSON is enough for any log shipper (Application Insights
 * agent, a Log Analytics data collection rule, journald, docker logs, ...)
 * to parse without a custom grammar.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export interface RequestLogger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

function write(level: LogLevel, message: string, fields?: LogFields): void {
  const entry: LogFields = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "warn" || level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

/** Base logger. Prefer withRequestId() inside a request handler. */
export const logger: RequestLogger = {
  debug: (message, fields) => write("debug", message, fields),
  info: (message, fields) => write("info", message, fields),
  warn: (message, fields) => write("warn", message, fields),
  error: (message, fields) => write("error", message, fields),
};

/**
 * Returns a logger bound to `requestId`, so every line it writes carries
 * that field automatically. src/server.ts creates one per request and uses
 * it for the request-completion log line (which also carries durationMs).
 */
export function withRequestId(requestId: string): RequestLogger {
  return {
    debug: (message, fields) => logger.debug(message, { requestId, ...fields }),
    info: (message, fields) => logger.info(message, { requestId, ...fields }),
    warn: (message, fields) => logger.warn(message, { requestId, ...fields }),
    error: (message, fields) => logger.error(message, { requestId, ...fields }),
  };
}
