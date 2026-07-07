#!/bin/bash

# 🚀 FOOD-SYSTEN - SCRIPT DE DEPLOY AUTOMATIZADO LOCAWEB
# Este script automatiza todo o processo de deploy

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de output
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# 1. VERIFICAR PRÉ-REQUISITOS
# ============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 FOOD-SYSTEN - DEPLOY AUTOMATIZADO${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

log_info "Verificando pré-requisitos..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker não está instalado. Execute: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    exit 1
fi
log_success "Docker instalado"

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose não está instalado. Execute: sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m) -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi
log_success "Docker Compose instalado"

# Verificar Git
if ! command -v git &> /dev/null; then
    log_error "Git não está instalado. Execute: apt install git -y"
    exit 1
fi
log_success "Git instalado"

# ============================================================================
# 2. CLONAR/ATUALIZAR REPOSITÓRIO
# ============================================================================
echo -e "\n${BLUE}Etapa 1/5: Preparando Repositório${NC}"

REPO_URL="${1:-https://github.com/seu-usuario/food-systen.git}"
REPO_DIR="food-system"
BRANCH="${2:-main}"

if [ ! -d "$REPO_DIR" ]; then
    log_info "Clonando repositório..."
    git clone -b $BRANCH $REPO_URL $REPO_DIR
    log_success "Repositório clonado"
else
    log_info "Atualizando repositório existente..."
    cd $REPO_DIR
    git fetch origin
    git checkout $BRANCH
    git pull origin $BRANCH
    cd ..
    log_success "Repositório atualizado"
fi

# ============================================================================
# 3. VERIFICAR/CRIAR VARIÁVEIS DE AMBIENTE
# ============================================================================
echo -e "\n${BLUE}Etapa 2/5: Configurando Variáveis de Ambiente${NC}"

if [ ! -f "$REPO_DIR/back-end/.env" ]; then
    log_warning "Arquivo .env do backend não encontrado"
    log_info "Criando arquivo .env com valores padrão (IMPORTANTE: EDITAR DEPOIS!)"
    
    cat > "$REPO_DIR/back-end/.env" << 'EOF'
DATABASE_URL="postgresql://food_user:MUDE_ESTA_SENHA@db:5432/food_db?schema=public"
POSTGRES_USER=food_user
POSTGRES_PASSWORD=MUDE_ESTA_SENHA
POSTGRES_DB=food_db
NODE_ENV=production
PORT=8000
JWT_SECRET=GERE_UM_SECRET_ALEATORIO
ALLOWED_ORIGINS=https://seu-dominio.com.br,https://www.seu-dominio.com.br
EOF
    
    log_warning "⚠️  EDITE: $REPO_DIR/back-end/.env com suas configurações!"
    log_warning "⚠️  ALTERE senhas e JWT_SECRET!"
else
    log_success ".env do backend encontrado"
fi

if [ ! -f "$REPO_DIR/front-end/.env.local" ]; then
    log_warning "Arquivo .env.local do frontend não encontrado"
    
    cat > "$REPO_DIR/front-end/.env.local" << 'EOF'
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com.br
NEXT_PUBLIC_APP_URL=https://seu-dominio.com.br
NODE_ENV=production
EOF
    
    log_warning "⚠️  EDITE: $REPO_DIR/front-end/.env.local com seu domínio!"
else
    log_success ".env.local do frontend encontrado"
fi

# ============================================================================
# 4. CRIAR ESTRUTURA DE DADOS
# ============================================================================
echo -e "\n${BLUE}Etapa 3/5: Criando Diretórios${NC}"

mkdir -p data/postgres
mkdir -p uploads
chmod 755 data/postgres
chmod 755 uploads
log_success "Diretórios criados"

# ============================================================================
# 5. BUILD DOCKER
# ============================================================================
echo -e "\n${BLUE}Etapa 4/5: Buildando Imagens Docker${NC}"

cd $REPO_DIR
log_info "Buildando imagens (isto pode levar alguns minutos)..."
docker-compose -f docker-compose.prod.yml build --no-cache
log_success "Imagens buildadas com sucesso"

# ============================================================================
# 6. INICIAR CONTAINERS
# ============================================================================
echo -e "\n${BLUE}Etapa 5/5: Iniciando Containers${NC}"

log_info "Iniciando containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d

# Aguardar banco de dados ficar pronto
log_info "Aguardando banco de dados ficar pronto..."
sleep 10

# Verificar saúde do banco
RETRIES=30
until docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U food_user 2>/dev/null || [ $RETRIES -eq 0 ]; do
    log_info "Aguardando banco de dados... ($RETRIES tentativas restantes)"
    RETRIES=$((RETRIES-1))
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    log_error "Banco de dados não respondeu após 60 segundos"
    exit 1
fi

log_success "Banco de dados pronto"

# Executar migrations
log_info "Executando migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy
log_success "Migrations executadas"

cd ..

# ============================================================================
# 7. STATUS FINAL
# ============================================================================
echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOY COMPLETADO COM SUCESSO!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

log_success "Frontend: http://localhost:3000"
log_success "Backend: http://localhost:8000"
log_success "Database: localhost:5432"

echo -e "\n${YELLOW}📋 PRÓXIMOS PASSOS:${NC}"
echo "1. Editar variáveis de ambiente:"
echo "   - $REPO_DIR/back-end/.env"
echo "   - $REPO_DIR/front-end/.env.local"
echo ""
echo "2. Configurar Nginx (reverse proxy)"
echo "   - Consulte: LOCAWEB-DEPLOY.md"
echo ""
echo "3. Configurar SSL Let's Encrypt"
echo "   - Consulte: LOCAWEB-DEPLOY.md"
echo ""
echo "4. Ver logs:"
echo "   - docker-compose -f $REPO_DIR/docker-compose.prod.yml logs -f"
echo ""
echo "5. Atualizar aplicação:"
echo "   - bash deploy.sh <REPO_URL> <BRANCH>"
echo ""

echo -e "${GREEN}✨ Seu Food-Systen está pronto para funcionar!${NC}\n"
