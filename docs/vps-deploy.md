# Deploy em VPS

Este guia assume:

- Ubuntu 22.04+ na VPS
- Docker e Docker Compose instalados
- Nginx na VPS como reverse proxy
- Postgres gerenciado ou container no `docker compose`

## Arquitetura recomendada

- `frontend` em `Next.js`
- `backend` em `Express + Prisma`
- `nginx` exposto na porta `80/443`
- `Postgres` gerenciado fora da VPS, quando possível

## Variáveis de ambiente

Crie um `.env` na raiz do projeto:

```env
PORT=8000
NODE_ENV=production
DATABASE_URL=postgresql://USER:SENHA@HOST:5432/food_db
JWT_SECRET=gerar_com_openssl_rand_-base64_32
FRONTEND_URL=https://seu-dominio.com
ALLOWED_ORIGINS=https://seu-dominio.com
NEXT_PUBLIC_API_URL=https://seu-dominio.com/api
NEXT_PUBLIC_SOCKET_URL=https://seu-dominio.com
INITIAL_SUPERADMIN_PASSWORD=senha_inicial_forte
INITIAL_ADMIN_PASSWORD=senha_inicial_forte
```

## Passo a passo

1. Atualize a VPS:

```bash
sudo apt update && sudo apt upgrade -y
```

2. Instale Docker e Compose.

3. Clone o repositório e entre na pasta.

4. Crie o `.env` com os valores de produção.

### Opção automatizada

Se preferir automatizar quase tudo, rode o bootstrap com o domínio real:

```bash
sudo bash deploy/bootstrap-vps.sh seu-dominio.com
```

5. Suba a aplicação:

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

6. Aplique as migrations do Prisma no backend:

```bash
docker compose -f docker-compose.vps.yml exec backend npx prisma migrate deploy
```

7. Verifique logs:

```bash
docker compose -f docker-compose.vps.yml logs -f backend
```

## Nginx

Use o Nginx da VPS para encaminhar tráfego. O arquivo pronto está em [deploy/nginx.conf](deploy/nginx.conf).

- `/` → frontend
- `/api` → backend
- `/socket.io` → backend

Instale o arquivo em `/etc/nginx/sites-available/food-system.conf` e habilite com `ln -s` para `sites-enabled`.

## HTTPS

Depois de validar o HTTP, habilite HTTPS com Let's Encrypt.

## Hardening

Veja o checklist de segurança em [docs/vps-hardening.md](docs/vps-hardening.md).

## Backup

Se o Postgres estiver no `docker-compose.vps.yml`:

```bash
docker compose -f docker-compose.vps.yml exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Se usar Postgres gerenciado, ative backup automático no provedor.

## Checklist final

- [ ] `.env` de produção configurado
- [ ] `JWT_SECRET` forte gerado
- [ ] `ALLOWED_ORIGINS` apontando para o domínio real
- [ ] `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_SOCKET_URL` corretos
- [ ] migrations aplicadas
- [ ] HTTPS ativo
- [ ] backup configurado
- [ ] login de `SUPER_ADMIN` testado
