#!/usr/bin/env bash
set -euo pipefail
set +x

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
PREFLIGHT_RELEASE="${SENTRY_RELEASE:-}"

if [[ ! "${PREFLIGHT_RELEASE}" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "Erro: SENTRY_RELEASE deve ser o SHA Git completo de 40 caracteres hexadecimais."
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Erro: copie deploy/.env.production.example para .env e preencha os valores."
  exit 1
fi

if grep -Eq '^[[:space:]]*(export[[:space:]]+)?SENTRY_AUTH_TOKEN=' "${ENV_FILE}"; then
  echo "Erro: remova SENTRY_AUTH_TOKEN do .env de runtime e use .env.build-secrets."
  exit 1
fi

if grep -Eq '^[[:space:]]*(export[[:space:]]+)?SENTRY_RELEASE=' "${ENV_FILE}"; then
  echo "Erro: remova SENTRY_RELEASE do .env; o valor deve vir do commit do deploy."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source <(sed $'1s/^\xEF\xBB\xBF//; s/\r$//' "${ENV_FILE}")
set +a
export SENTRY_RELEASE="${PREFLIGHT_RELEASE}"

required=(
  DATABASE_URL POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB JWT_SECRET
  FRONTEND_URL NEXT_PUBLIC_API_URL NEXT_PUBLIC_SOCKET_URL ALLOWED_ORIGINS
  RESEND_API_KEY EMAIL_FROM
)

for variable in "${required[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Erro: ${variable} não foi definido."
    exit 1
  fi
done

if [[ "${JWT_SECRET}" == *"Gere"* || ${#JWT_SECRET} -lt 32 ]]; then
  echo "Erro: JWT_SECRET deve ser aleatório e ter pelo menos 32 caracteres."
  exit 1
fi

if [[ "${POSTGRES_PASSWORD}" == *"SenhaForteAqui"* || ${#POSTGRES_PASSWORD} -lt 16 ]]; then
  echo "Erro: POSTGRES_PASSWORD ainda é exemplo ou tem menos de 16 caracteres."
  exit 1
fi

if [[ "${RESEND_API_KEY}" != re_* ]]; then
  echo "Erro: RESEND_API_KEY não tem o formato esperado."
  exit 1
fi

if [[ "${EMAIL_FROM}" == *"seu-dominio"* || "${EMAIL_FROM}" != *"@"* ]]; then
  echo "Erro: EMAIL_FROM deve usar um remetente de domínio verificado no Resend."
  exit 1
fi

for url_variable in FRONTEND_URL NEXT_PUBLIC_API_URL NEXT_PUBLIC_SOCKET_URL; do
  if [[ "${!url_variable}" != https://* ]]; then
    echo "Erro: ${url_variable} deve usar HTTPS em produção."
    exit 1
  fi
done

if [[ -n "${INITIAL_ADMIN_PASSWORD:-}" || -n "${INITIAL_SUPERADMIN_PASSWORD:-}" ]]; then
  echo "Erro: esvazie INITIAL_ADMIN_PASSWORD e INITIAL_SUPERADMIN_PASSWORD após o provisionamento."
  exit 1
fi

if ! [[ "${RATE_LIMIT_MAX:-300}" =~ ^[0-9]+$ ]] || (( ${RATE_LIMIT_MAX:-300} < 50 || ${RATE_LIMIT_MAX:-300} > 2000 )); then
  echo "Erro: RATE_LIMIT_MAX deve ser um inteiro entre 50 e 2000."
  exit 1
fi

preflight_had_sentry_token=true
if [[ -z "${SENTRY_AUTH_TOKEN:-}" ]]; then
  preflight_had_sentry_token=false
  export SENTRY_AUTH_TOKEN="preflight-only-placeholder"
fi

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" config --quiet

if [[ "${preflight_had_sentry_token}" == false ]]; then
  unset SENTRY_AUTH_TOKEN
fi
echo "Pré-validação de produção concluída."
