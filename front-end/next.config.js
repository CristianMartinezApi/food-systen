/** @type {import('next').NextConfig} */
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), ".."),
};

// Sem DSN configurado, o build fica exatamente como antes — nada de Sentry entra
// no pipeline até a variável de ambiente existir em produção.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      widenClientFileUpload: true,
    })
  : nextConfig;
