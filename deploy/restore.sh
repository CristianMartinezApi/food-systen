#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
ENV_FILE="${REPO_ROOT}/.env"
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups}"

usage() {
  echo "Uso: $0 <arquivo.dump>"
  echo "Backups disponíveis em ${BACKUP_DIR}:"
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'food-systen_*.dump' -printf '  %f\n' 2>/dev/null || true
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Erro: ${ENV_FILE} não encontrado."
  exit 1
fi

backup_name="$(basename -- "$1")"
if [[ "$1" != "${backup_name}" || "${backup_name}" != food-systen_*.dump ]]; then
  echo "Erro: informe somente o nome de um backup food-systen_*.dump."
  exit 1
fi

backup_file="${BACKUP_DIR}/${backup_name}"
if [[ ! -f "${backup_file}" ]]; then
  echo "Erro: backup não encontrado: ${backup_file}"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source <(sed $'1s/^\xEF\xBB\xBF//; s/\r$//' "${ENV_FILE}")
set +a

: "${POSTGRES_USER:?POSTGRES_USER não definido}"
: "${POSTGRES_DB:?POSTGRES_DB não definido}"

cd "${REPO_ROOT}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" config --quiet

echo "ATENÇÃO: a restauração substituirá os dados atuais de ${POSTGRES_DB}."
echo "Backup: ${backup_file}"
read -r -p "Digite RESTAURAR para confirmar: " confirmation
if [[ "${confirmation}" != "RESTAURAR" ]]; then
  echo "Restauração cancelada."
  exit 0
fi

echo "Parando aplicação e mantendo o PostgreSQL disponível..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" stop frontend backend
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d db

echo "Validando o arquivo de backup..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T db \
  pg_restore --list < "${backup_file}" >/dev/null

echo "Restaurando o banco de dados..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T db \
  psql --username "${POSTGRES_USER}" --dbname postgres --set ON_ERROR_STOP=1 \
  --set "target_db=${POSTGRES_DB}" \
  --command "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :'target_db' AND pid <> pg_backend_pid();"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T db \
  pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error \
  --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" < "${backup_file}"

echo "Reiniciando a aplicação..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans

for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:8000/health/ready >/dev/null; then
    echo "Restauração concluída e backend saudável."
    docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
    exit 0
  fi
  sleep 2
done

echo "Erro: os dados foram restaurados, mas o backend não ficou pronto."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" logs --tail=100 backend
exit 1
