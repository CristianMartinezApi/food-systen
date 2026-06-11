# FoodSystem - Plataforma Multi-Tenant de Cardápio Digital

Sistema de cardápio digital completo com cliente SaaS e painel administrativo, focado em performance, segurança e experiência do usuário (UX). Arquitetura multi-tenant com suporte a múltiplos restaurantes em uma única instância.

## 🚀 Stack Tecnológico

### Frontend

- **Next.js 15.5** (App Router) + **React 19**
- **TypeScript** (Type-safe)
- **Tailwind CSS 4.0** (Estilização moderna)
- **React Hook Form** + **Zod** (Validação robusta)
- **Framer Motion** (Animações fluidas)
- **Socket.io Client** (Real-time updates)
- **Lucide React** (Ícones)
- **GSAP** (Animações avançadas)

### Backend

- **Node.js 20+** (Runtime)
- **Express** (Framework HTTP)
- **TypeScript**
- **Prisma ORM** (Banco de dados)
- **PostgreSQL 15** (Banco de dados)
- **JWT** (Autenticação segura)
- **bcryptjs** (Hashing de senhas)

### Infraestrutura

- **Docker & Docker Compose** (Containerização)
- **PostgreSQL 15-alpine** (Banco de dados)
- **Nginx** (Reverse proxy no frontend)

## 📁 Estrutura do Projeto

```
food-systen/
├── back-end/
│   ├── src/
│   │   ├── index.ts          # Servidor principal e rotas
│   │   ├── lib/              # Utilitários (Prisma client)
│   │   ├── middlewares/      # Auth e Tenant middleware
│   │   ├── utils/            # Funções helpers
│   │   └── generated/        # Código gerado pelo Prisma
│   ├── prisma/
│   │   ├── schema.prisma     # Schema do banco de dados
│   │   └── migrations/       # Histórico de migrações
│   ├── Dockerfile
│   └── package.json
│
├── front-end/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Layout global
│   │   ├── page.tsx          # Página inicial (SaaS)
│   │   ├── [slug]/           # Rotas do cliente (por restaurante)
│   │   │   ├── page.tsx
│   │   │   ├── checkout/
│   │   │   └── orders/
│   │   └── admin/            # Painel administrativo (SUPER_ADMIN)
│   │       ├── (dashboard)/  # Dashboard
│   │       ├── login/        # Login admin
│   │       ├── audit/        # Logs de auditoria
│   │       └── settings/     # Configurações
│   ├── src/
│   │   ├── core/
│   │   │   ├── hooks/        # Hooks customizados
│   │   │   ├── stores/       # Estado global
│   │   │   ├── config/       # Configurações
│   │   │   └── types/        # Tipos globais
│   │   ├── modules/          # Features modulares
│   │   │   ├── admin/
│   │   │   ├── shop/
│   │   │   └── saas/
│   │   └── shared/           # Componentes compartilhados
│   │       ├── components/
│   │       └── utils/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docs/                     # Documentação
├── docker-compose.yml        # Orchestração de containers
└── .env.example              # Template de variáveis de ambiente
```

## 🔐 Segurança

- ✅ **JWT Authentication** com secret configurável
- ✅ **CORS Whitelist** para origens permitidas
- ✅ **Multi-tenant** com isolamento de dados por slug
- ✅ **Role-based Access Control** (SUPER_ADMIN, OWNER)
- ✅ **Password Hashing** com bcryptjs
- ✅ **Environment Variables** (nunca commitar .env)
- ✅ **Audit Logging** de operações administrativas
- ✅ **Rate Limiting** de requisições

## 🛠️ Como Executar

### Pré-requisitos

- Docker & Docker Compose instalados
- Node.js 20+ (para desenvolvimento local sem Docker)

### Com Docker Compose (Recomendado)

```bash
# Copiar template de variáveis de ambiente
cp .env.example .env

# Editar .env com suas configurações
# (JWT_SECRET, DATABASE_URL, INITIAL_SUPERADMIN_PASSWORD, etc)

# Iniciar containers
docker compose up -d

# Acessar a aplicação
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

### Em Desenvolvimento Local

```bash
# Backend
cd back-end
npm install
npm run dev     # Inicia em http://localhost:8000

# Frontend (em outro terminal)
cd front-end
npm install
npm run dev     # Inicia em http://localhost:3000
```

### Parar os Containers

```bash
docker compose down
```

## 🔑 Credenciais Padrão (Desenvolvimento)

Os containers são iniciados com seeding automático:

- **Usuário Super Admin:** `superadmin@foodsystem.com` / `superadmin123`
- **Usuário Admin Padrão:** `admin@restaurant.com` / `AdminPass2026Secure`

⚠️ **Em produção, altere essas senhas imediatamente via variáveis de ambiente!**

## ✨ Funcionalidades Implementadas

### Cliente (SaaS)

- [x] Catálogo de produtos por restaurante
- [x] Carrinho de compras persistente
- [x] Checkout com validação
- [x] Rastreamento de pedidos
- [x] Localização via Google Maps
- [x] Horários de funcionamento
- [x] Descontos e promoções
- [x] Delivery ETA

### Painel Administrativo

- [x] Dashboard com métricas
- [x] Gerenciamento de cardápio
- [x] Gestão de pedidos
- [x] Configurações da loja (branding, horários, localização)
- [x] Logs de auditoria (SUPER_ADMIN only)
- [x] Gerenciamento de usuários
- [x] Controle multi-tenant

### Segurança & DevOps

- [x] Autenticação JWT
- [x] Multi-tenant com isolamento
- [x] Rate limiting
- [x] Migrations automáticas
- [x] Docker Compose ready
- [x] Audit trail completo

## 📊 Endpoints Principais

### Autenticação

- `POST /api/auth/login` - Login de usuários
- `POST /api/auth/refresh` - Renovar token

### Restaurante

- `GET /api/restaurants/:slug` - Dados do restaurante
- `GET /api/settings` - Configurações da loja
- `PUT /api/settings` - Atualizar configurações

### Admin (SUPER_ADMIN)

- `GET /api/admin/audit-logs` - Logs de auditoria
- `GET /api/admin/dashboard` - Métricas

### Pedidos

- `POST /api/orders` - Criar pedido
- `GET /api/orders` - Listar pedidos do usuário
- `GET /api/orders/:id` - Detalhes do pedido

## 🚀 Deployment

Recomendação atual: **VPS com Docker + Nginx + HTTPS**.

Se você for usar a VPS da Locaweb, siga este guia: [docs/locaweb-deploy.md](docs/locaweb-deploy.md)

Guia genérico para VPS: [docs/vps-deploy.md](docs/vps-deploy.md)

Opções suportadas:

- ✅ VPS da Locaweb com acesso root
- ✅ VPS próprio com Docker Compose
- ✅ Postgres gerenciado externo
- ✅ Nginx como reverse proxy
- ✅ Railway / Render / App Platform (com ajustes)

## 📝 Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# Backend
PORT=8000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db:5432/food_db
JWT_SECRET=seu_secret_jwt_aqui_com_32_caracteres_minimo
FRONTEND_URL=https://seu-dominio.com

# Security
ALLOWED_ORIGINS=https://seu-dominio.com

# Frontend build-time
NEXT_PUBLIC_API_URL=https://seu-dominio.com/api
NEXT_PUBLIC_SOCKET_URL=https://seu-dominio.com

# Senhas iniciais (apenas primeira execução)
INITIAL_SUPERADMIN_PASSWORD=senhafortealeatoria
INITIAL_ADMIN_PASSWORD=outrassenhaforte
```

## 🐛 Troubleshooting

### Containers não iniciando

```bash
docker compose logs -f
```

### Banco de dados não conectando

```bash
docker compose exec db psql -U postgres -d food_db -c "SELECT 1"
```

### Limpar e reconstruir

```bash
docker compose down -v
docker compose up -d --build
```

## 📄 Licença

Proprietary - Todos os direitos reservados.
