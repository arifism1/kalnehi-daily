import * as Sentry from "@sentry/nextjs";

export type LogLevel = "info" | "warn" | "error";

export type RouteLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (
    message: string,
    err?: unknown,
    meta?: Record<string, unknown>,
  ) => void;
};

function emit(
  level: LogLevel,
  route: string,
  message: string,
  meta?: Record<string, unknown>,
  err?: unknown,
): void {
  const payload: Record<string, unknown> = {
    level,
    route,
    message,
    ts: new Date().toISOString(),
    ...meta,
  };
  if (err instanceof Error) {
    payload.errorName = err.name;
    payload.errorMessage = err.message;
  } else if (err !== undefined) {
    payload.errorMessage = String(err);
  }

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    if (err !== undefined) {
      Sentry.captureException(err, { tags: { route }, extra: meta });
    } else {
      Sentry.captureMessage(message, { level: "error", tags: { route }, extra: meta });
    }
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

/** Structured JSON logs for API/cron routes; errors also report to Sentry when configured. */
export function createRouteLogger(route: string): RouteLogger {
  return {
    info: (message, meta) => emit("info", route, message, meta),
    warn: (message, meta) => emit("warn", route, message, meta),
    error: (message, err, meta) => emit("error", route, message, meta, err),
  };
}
