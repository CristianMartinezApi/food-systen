# 🚀 GUIA DE DEPLOY - FOOD-SYSTEN NA LOCAWEB

## 📋 Pré-requisitos
- Conta Locaweb (VPS/Cloud)
- SSH configurado
- Docker instalado no servidor
- Acesso root ou sudo

---

## ⚙️ PASSO 1: Preparar o Servidor Locaweb

### 1.1 Conectar via SSH
```bash
ssh root@seu_ip_vps
```

### 1.2 Atualizar sistema
```bash
apt update && apt upgrade -y
```

### 1.3 Instalar Docker e Docker Compose
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version
```

### 1.4 Criar usuário para aplicação
```bash
useradd -m -s /bin/bash food-systen
usermod -aG docker food-systen
```

---

## 📂 PASSO 2: Preparar Repositório

### 2.1 Clonar repositório no servidor
```bash
cd /home/food-systen
git clone https://seu-repo.git food-system
cd food-system
```

### 2.2 Criar estrutura de dados
```bash
mkdir -p /home/food-systen/data/postgres
mkdir -p /home/food-systen/uploads
chown -R food-systen:food-systen /home/food-systen/data
chown -R food-systen:food-systen /home/food-systen/uploads
```

---

## 🔐 PASSO 3: Configurar Variáveis de Ambiente

### 3.1 Backend - Criar `.env`
```bash
# Criar arquivo
nano /home/food-systen/food-system/back-end/.env
```

**Conteúdo:**
```env
# Banco de Dados
DATABASE_URL="postgresql://food_user:SENHA_FORTE_AQUI@db:5432/food_db?schema=public"
POSTGRES_USER=food_user
POSTGRES_PASSWORD=SENHA_FORTE_AQUI
POSTGRES_DB=food_db

# Aplicação
NODE_ENV=production
PORT=8000
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://seu-dominio.com.br,https://www.seu-dominio.com.br

# JWT (Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=GERE_UM_SECRET_ALEATORIO_32_CHARS

# PIX Gerencianet (opcional)
EFI_SANDBOX=false
EFI_CLIENT_ID=seu_client_id
EFI_CLIENT_SECRET=seu_client_secret
EFI_CERT_BASE64=seu_certificado_base64

# Email (opcional)
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_USER=seu-email@seu-dominio.com
SMTP_PASS=sua-senha

# Redis (opcional, para cache)
REDIS_URL=redis://redis:6379

# Auditoria
AUDIT_RETENTION_ENABLED=true
AUDIT_RETENTION_DAYS=90
```

### 3.2 Frontend - Criar `.env.local`
```bash
# Criar arquivo
nano /home/food-systen/food-system/front-end/.env.local
```

**Conteúdo:**
```env
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com.br
NEXT_PUBLIC_APP_URL=https://seu-dominio.com.br
NODE_ENV=production
```

---

## 🐳 PASSO 4: Atualizar Docker Compose para Produção

### 4.1 Criar `docker-compose.prod.yml`
```bash
nano docker-compose.prod.yml
```

**Conteúdo:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./back-end
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      PORT: 8000
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
    ports:
      - "8000:8000"
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/categories"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./front-end
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
      NODE_ENV: production
    depends_on:
      - backend
    ports:
      - "3000:3000"
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  db_data:

networks:
  default:
    name: food-network
```

---

## 🌐 PASSO 5: Configurar Nginx (Reverse Proxy)

### 5.1 Instalar Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5.2 Criar configuração
```bash
sudo nano /etc/nginx/sites-available/food-systen
```

**Conteúdo:**
```nginx
# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name seu-dominio.com.br www.seu-dominio.com.br;
    return 301 https://$server_name$request_uri;
}

# HTTPS Principal
server {
    listen 443 ssl http2;
    server_name seu-dominio.com.br www.seu-dominio.com.br;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:8000/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;
}
```

### 5.3 Habilitar site
```bash
sudo ln -s /etc/nginx/sites-available/food-systen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 PASSO 6: SSL com Let's Encrypt

### 6.1 Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 6.2 Gerar certificado
```bash
sudo certbot certonly --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br
```

### 6.3 Configurar renovação automática
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🚀 PASSO 7: Deploy da Aplicação

### 7.1 Entrar no diretório
```bash
cd /home/food-systen/food-system
```

### 7.2 Build e iniciar containers
```bash
# Carregar variáveis do .env
export $(cat back-end/.env | xargs)

# Build das imagens
docker-compose -f docker-compose.prod.yml build

# Iniciar containers
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
docker-compose -f docker-compose.prod.yml ps
```

### 7.3 Executar migrations
```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### 7.4 Verificar logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 📊 PASSO 8: Monitoramento e Manutenção

### 8.1 Ver logs em tempo real
```bash
# Backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Frontend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Database
docker-compose -f docker-compose.prod.yml logs -f db
```

### 8.2 Backup do banco de dados
```bash
# Backup manual
docker-compose -f docker-compose.prod.yml exec db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U ${POSTGRES_USER} ${POSTGRES_DB} < backup_xxxxx.sql
```

### 8.3 Atualizar aplicação
```bash
# Pull das mudanças
git pull origin main

# Rebuild
docker-compose -f docker-compose.prod.yml build

# Restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Migrations se necessário
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

---

## ✅ Checklist Final

- [ ] SSH conectado ao servidor
- [ ] Docker instalado
- [ ] Repositório clonado
- [ ] Variáveis `.env` configuradas
- [ ] Diretórios de dados criados
- [ ] Nginx instalado e configurado
- [ ] Certificado SSL gerado
- [ ] Containers buildados e rodando
- [ ] Migrations executadas
- [ ] Frontend acessível em https://seu-dominio.com.br
- [ ] API respondendo em https://seu-dominio.com.br/api/categories
- [ ] Backups agendados

---

## 🆘 Troubleshooting

### Problema: "Connection refused"
```bash
# Verificar se containers estão rodando
docker-compose -f docker-compose.prod.yml ps

# Verificar logs
docker-compose -f docker-compose.prod.yml logs backend
```

### Problema: "Database connection error"
```bash
# Verificar se DB está saudável
docker-compose -f docker-compose.prod.yml ps

# Reconectar ao banco
docker-compose -f docker-compose.prod.yml restart db
```

### Problema: "SSL certificate error"
```bash
# Renovar certificado manualmente
sudo certbot renew --force-renewal
```

---

## 📞 Suporte

Para dúvidas:
- Documentação Locaweb: https://www.locaweb.com.br/ajuda/
- Docker Docs: https://docs.docker.com/
- Nginx Docs: https://nginx.org/en/docs/

---

**Data de criação:** 07/07/2026  
**Versão:** 1.0  
**Status:** ✅ Pronto para Produção
