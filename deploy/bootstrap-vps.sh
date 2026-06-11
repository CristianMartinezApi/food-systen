#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "${DOMAIN}" ]]; then
  echo "Uso: sudo bash deploy/bootstrap-vps.sh seu-dominio.com"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

if [[ ! -f ".env" ]]; then
  echo "Erro: .env não encontrado na raiz do projeto."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Instalando Docker, Compose e Nginx..."
  apt-get update
  apt-get install -y ca-certificates curl gnupg lsb-release nginx docker.io docker-compose-plugin
  systemctl enable --now docker
  systemctl enable --now nginx
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Erro: docker compose plugin não disponível."
  exit 1
fi

mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
cp deploy/nginx.conf /etc/nginx/sites-available/food-system.conf
sed -i "s/seu-dominio.com/${DOMAIN}/g" /etc/nginx/sites-available/food-system.conf
ln -sf /etc/nginx/sites-available/food-system.conf /etc/nginx/sites-enabled/food-system.conf
rm -f /etc/nginx/sites-enabled/default || true

nginx -t
systemctl reload nginx

echo "Subindo containers..."
docker compose -f docker-compose.vps.yml up -d --build

echo "Aplicando migrations do Prisma..."
docker compose -f docker-compose.vps.yml exec backend npx prisma migrate deploy

echo "Finalizado. Verifique:"
echo "- Frontend: https://${DOMAIN}"
echo "- Backend:  https://${DOMAIN}/api"
echo "- Socket:   https://${DOMAIN}/socket.io"
