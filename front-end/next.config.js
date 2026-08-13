/** @type {import('next').NextConfig} */
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  env: {
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
  },
};

// Builds locais continuam sem upload quando as credenciais de build não existem.
// O DSN público não controla releases nem source maps.
const sentryBuildEnabled = Boolean(
  process.env.SENTRY_ORG &&
  process.env.SENTRY_FRONTEND_PROJECT &&
  process.env.SENTRY_RELEASE &&
  process.env.SENTRY_AUTH_TOKEN
);

export default sentryBuildEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_FRONTEND_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: process.env.SENTRY_RELEASE,
      },
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      silent: false,
      widenClientFileUpload: true,
    })
  : nextConfig;
