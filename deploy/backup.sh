#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
ENV_FILE="${REPO_ROOT}/.env"
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Erro: ${ENV_FILE} não encontrado."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source <(sed $'1s/^\xEF\xBB\xBF//; s/\r$//' "${ENV_FILE}")
set +a

: "${POSTGRES_USER:?POSTGRES_USER não definido}"
: "${POSTGRES_DB:?POSTGRES_DB não definido}"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

if ! docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps --status running db | grep -q db; then
  echo "Erro: o banco precisa estar em execução para criar o backup."
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${BACKUP_DIR}/food-systen_${timestamp}.dump"
temporary_file="${backup_file}.tmp"

echo "Criando backup PostgreSQL em ${backup_file}..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T db \
  pg_dump --format=custom --no-owner --no-privileges \
  --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" > "${temporary_file}"

if [[ ! -s "${temporary_file}" ]]; then
  rm -f "${temporary_file}"
  echo "Erro: o arquivo de backup ficou vazio."
  exit 1
fi

mv "${temporary_file}" "${backup_file}"
chmod 600 "${backup_file}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T db \
  pg_restore --list < "${backup_file}" >/dev/null

find "${BACKUP_DIR}" -type f -name 'food-systen_*.dump' -mtime "+${RETENTION_DAYS}" -delete

echo "Backup criado e validado: ${backup_file}"
