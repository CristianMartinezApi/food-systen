#!/usr/bin/env bash
set -euo pipefail
set +x

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
ENV_FILE="${REPO_ROOT}/.env"
BUILD_SECRETS_FILE="${REPO_ROOT}/.env.build-secrets"
DEPLOY_RELEASE="${SENTRY_RELEASE:-}"

cd "${REPO_ROOT}"

if [[ ! "${DEPLOY_RELEASE}" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "Erro: SENTRY_RELEASE deve ser o SHA Git completo de 40 caracteres hexadecimais."
  exit 1
fi

if [[ ! -f "${BUILD_SECRETS_FILE}" || -L "${BUILD_SECRETS_FILE}" ]]; then
  echo "Erro: crie ${BUILD_SECRETS_FILE} como arquivo regular root-only para os segredos de build."
  exit 1
fi

if [[ "$(stat -c '%u' "${BUILD_SECRETS_FILE}")" != "0" || "$(stat -c '%a' "${BUILD_SECRETS_FILE}")" != "600" ]]; then
  echo "Erro: ${BUILD_SECRETS_FILE} deve pertencer ao root e ter permissões 600."
  exit 1
fi

if grep -Ev '^[[:space:]]*(#.*)?$|^SENTRY_AUTH_TOKEN=[^[:space:]]+$' "${BUILD_SECRETS_FILE}" | grep -q .; then
  echo "Erro: ${BUILD_SECRETS_FILE} deve conter somente SENTRY_AUTH_TOKEN e comentários."
  exit 1
fi

mapfile -t sentry_token_lines < <(sed -n 's/^SENTRY_AUTH_TOKEN=//p' "${BUILD_SECRETS_FILE}")
if [[ ${#sentry_token_lines[@]} -ne 1 || -z "${sentry_token_lines[0]}" ]]; then
  echo "Erro: ${BUILD_SECRETS_FILE} deve conter exatamente um SENTRY_AUTH_TOKEN não vazio."
  exit 1
fi

BUILD_SENTRY_AUTH_TOKEN="${sentry_token_lines[0]%$'\r'}"
unset sentry_token_lines
export SENTRY_AUTH_TOKEN="${BUILD_SENTRY_AUTH_TOKEN}"
export SENTRY_RELEASE="${DEPLOY_RELEASE}"

bash deploy/preflight.sh

set -a
# shellcheck disable=SC1090
source <(sed $'1s/^\xEF\xBB\xBF//; s/\r$//' "${ENV_FILE}")
set +a

# O ambiente de runtime não pode substituir o SHA do workflow nem o segredo
# exclusivo de build.
export SENTRY_RELEASE="${DEPLOY_RELEASE}"
export SENTRY_AUTH_TOKEN="${BUILD_SENTRY_AUTH_TOKEN}"

echo "Construindo imagens..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build

echo "Garantindo que o banco esteja disponível..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d db
until docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T db \
  pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; do
  sleep 2
done

bash deploy/backup.sh

echo "Aplicando migrations..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" run --rm --no-deps \
  backend npx prisma migrate deploy

echo "Atualizando aplicação..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans

echo "Aguardando backend..."
for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:8000/health/ready >/dev/null; then
    echo "Deploy concluído. Backend e banco estão saudáveis."
    docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
    exit 0
  fi
  sleep 2
done

echo "Erro: backend não ficou pronto após o deploy."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" logs --tail=100 backend
exit 1
