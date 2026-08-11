import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Sentry.captureRequestError é seguro chamar mesmo sem Sentry.init() ter
// rodado (sem SENTRY_DSN configurado) — vira um no-op nesse caso.
export const onRequestError = Sentry.captureRequestError;
