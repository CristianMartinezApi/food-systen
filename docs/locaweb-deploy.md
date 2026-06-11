# Deploy na Locaweb VPS

Este guia assume uma VPS da Locaweb com acesso root/SSH, Ubuntu 22.04+ e Docker disponível ou instalável.

Se você estiver em hospedagem compartilhada, esse stack não é o ideal. O projeto foi preparado para VPS com Docker + Nginx.

## O que apontar antes de subir

- Aponte o domínio principal para o IP da VPS via DNS A
- Se for usar `www`, aponte também `www.seu-dominio.com`
- Libere as portas `22`, `80` e `443` no firewall da Locaweb, se houver essa camada de bloqueio

## Variáveis de ambiente

Crie um `.env` na raiz do projeto usando o exemplo de produção:

```env
PORT=8000
NODE_ENV=production
DATABASE_URL=postgresql://USER:SENHA@HOST:5432/food_db
JWT_SECRET=gerar_com_openssl_rand_-base64_32
FRONTEND_URL=https://seu-dominio.com
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
NEXT_PUBLIC_API_URL=https://seu-dominio.com/api
NEXT_PUBLIC_SOCKET_URL=https://seu-dominio.com
INITIAL_SUPERADMIN_PASSWORD=senha_inicial_forte
INITIAL_ADMIN_PASSWORD=senha_inicial_forte
```

Se você usar `www`, mantenha os dois domínios nas URLs públicas e em `ALLOWED_ORIGINS`.

## Subida inicial

1. Acesse a VPS por SSH.
2. Atualize o sistema.
3. Instale Git, Docker e Docker Compose, se ainda não existirem.
4. Clone este repositório na VPS.
5. Copie o `.env` para a raiz do projeto.
6. Execute o bootstrap informando o domínio principal:

```bash
sudo bash deploy/bootstrap-vps.sh seu-dominio.com
```

O script configura o Nginx, sobe os containers e aplica as migrations do Prisma.

Se o domínio já estiver apontando para a VPS, ele também emite o certificado HTTPS automaticamente com Certbot e ativa o redirecionamento para HTTPS.

## Depois do deploy

- Teste o frontend em `https://seu-dominio.com`
- Teste a API em `https://seu-dominio.com/api`
- Teste o socket em `https://seu-dominio.com/socket.io`

Se o domínio com `www` também estiver apontando para a VPS, ele deve responder no mesmo site.

## Atualizações futuras

Para novas versões, basta atualizar o código na VPS e rodar novamente:

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

Depois, aplique as migrations se houver mudanças no banco:

```bash
docker compose -f docker-compose.vps.yml exec backend npx prisma migrate deploy
```

## Observações importantes

- O backend e o frontend ficam presos em `127.0.0.1`, e o Nginx expõe apenas `80/443`
- O Postgres local é útil para começar, mas um banco gerenciado costuma ser mais seguro para produção
- O HTTPS é emitido automaticamente no bootstrap, mas depende do domínio já estar resolvendo para a VPS