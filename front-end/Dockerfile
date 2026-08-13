# syntax=docker/dockerfile:1.7

# Etapa de Build
FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_RELEASE
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
ENV SENTRY_ORG=foodsystem
ENV SENTRY_FRONTEND_PROJECT=javascript-nextjs
ENV SENTRY_RELEASE=${SENTRY_RELEASE}

# Instalar dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copiar o restante e compilar
COPY . .
RUN --mount=type=secret,id=sentry_auth_token \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" npm run build

# Etapa de Produção
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=${SENTRY_RELEASE}

# Copiar arquivos necessários da etapa de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
RUN find /app -type f -name '*.map' -delete

EXPOSE 3000

CMD ["npm", "start"]
