#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
ENV_FILE="${REPO_ROOT}/.env"

cd "${REPO_ROOT}"

bash deploy/preflight.sh

set -a
# shellcheck disable=SC1090
source <(sed $'1s/^\xEF\xBB\xBF//; s/\r$//' "${ENV_FILE}")
set +a

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
