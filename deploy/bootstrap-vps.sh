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
  echo "Instalando Docker, Compose e dependências base..."
  apt-get update
  apt-get install -y ca-certificates curl gnupg lsb-release

  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi

  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "Instalando Nginx..."
  apt-get update
  apt-get install -y nginx
  systemctl enable --now nginx
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "Instalando Certbot..."
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
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

if certbot certificates | grep -q "${DOMAIN}"; then
  echo "Certificado HTTPS já existe para ${DOMAIN}."
else
  echo "Emitindo certificado HTTPS com Certbot..."
  certbot --nginx \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --redirect
fi

echo "Finalizado. Verifique:"
echo "- Frontend: https://${DOMAIN}"
echo "- Backend:  https://${DOMAIN}/api"
echo "- Socket:   https://${DOMAIN}/socket.io"
