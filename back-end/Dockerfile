# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=${SENTRY_RELEASE}
ENV SENTRY_ORG=foodsystem
ENV SENTRY_PROJECT=node-express

RUN --mount=type=secret,id=sentry_auth_token \
    set -eu; \
    if [ -s /run/secrets/sentry_auth_token ] && [ -n "${SENTRY_RELEASE}" ]; then \
      export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; \
      npx sentry-cli sourcemaps inject dist; \
      npx sentry-cli sourcemaps upload --org "${SENTRY_ORG}" --project "${SENTRY_PROJECT}" --release "${SENTRY_RELEASE}" dist; \
    else \
      echo "Sentry source map upload skipped: build secret or release unavailable."; \
    fi; \
    find dist -type f -name '*.map' -delete

FROM node:20-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=${SENTRY_RELEASE}

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
RUN find /app -type f -name '*.map' -delete

EXPOSE 8000

CMD ["npm", "start"]
