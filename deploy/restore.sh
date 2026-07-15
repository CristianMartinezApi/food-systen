#!/bin/bash

# 🔄 SCRIPT DE RESTORE DE BACKUP
# Use APENAS em emergência!
# Uso: ./restore.sh backup_20260707_143022.sql.gz

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -eq 0 ]; then
  echo -e "${RED}❌ Uso: $0 <backup_file>${NC}"
  echo -e "\n${YELLOW}Backups disponíveis:${NC}"
  ls -lh /home/food-systen/backups/
  exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="/home/food-systen/backups"
FULL_PATH="$BACKUP_DIR/$BACKUP_FILE"

if [ ! -f "$FULL_PATH" ]; then
  echo -e "${RED}❌ Arquivo não encontrado: $FULL_PATH${NC}"
  exit 1
fi

DB_USER="${POSTGRES_USER:-food_user}"
DB_NAME="${POSTGRES_DB:-food_db}"

echo -e "${RED}🚨 ATENÇÃO: VOCÊ ESTÁ PRESTES A RESTAURAR UM BACKUP!${NC}"
echo -e "${YELLOW}Este processo pode levar alguns minutos.${NC}\n"

echo "Arquivo: $FULL_PATH"
echo "Tamanho: $(du -h "$FULL_PATH" | cut -f1)"
echo -e "\n${RED}⚠️  TODOS OS DADOS ATUAIS SERÃO PERDIDOS!${NC}"

# Confirmar ação
read -p "Digite 'RESTAURAR' para confirmar: " confirmation

if [ "$confirmation" != "RESTAURAR" ]; then
  echo -e "${YELLOW}✓ Operação cancelada${NC}"
  exit 0
fi

echo -e "\n${YELLOW}📋 Iniciando restore...${NC}"

# Parar containers
echo -e "${YELLOW}⏳ Parando containers...${NC}"
docker compose -f docker-compose.prod.yml down

# Extrair backup se estiver comprimido
EXTRACT_FILE="$FULL_PATH"
if [[ "$FULL_PATH" == *.gz ]]; then
  echo -e "${YELLOW}⏳ Descompactando backup...${NC}"
  EXTRACT_FILE="${FULL_PATH%.gz}"
  gunzip -c "$FULL_PATH" > "$EXTRACT_FILE"
fi

# Iniciar apenas o banco de dados
echo -e "${YELLOW}⏳ Iniciando banco de dados...${NC}"
docker compose -f docker-compose.prod.yml up -d db
sleep 5

# Restaurar backup
echo -e "${YELLOW}⏳ Restaurando dados do backup...${NC}"

if docker compose -f docker-compose.prod.yml exec -T db psql \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  < "$EXTRACT_FILE"; then
  
  echo -e "${GREEN}✅ Dados restaurados com sucesso!${NC}"
  
else
  echo -e "${RED}❌ ERRO ao restaurar backup${NC}"
  exit 1
fi

# Limpar arquivo extraído se foi descompactado
if [[ "$FULL_PATH" == *.gz ]]; then
  rm -f "$EXTRACT_FILE"
fi

# Reiniciar todos os containers
echo -e "${YELLOW}⏳ Reiniciando todos os containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

echo -e "\n${GREEN}✅ RESTORE CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${YELLOW}🕐 Backup restaurado: $BACKUP_FILE${NC}"

# Aguardar inicialização
echo -e "${YELLOW}⏳ Aguardando inicialização dos serviços...${NC}"
sleep 10

# Validar
docker compose ps

echo -e "\n${GREEN}✨ Sistema pronto!${NC}"
echo -e "${YELLOW}Verifique os dados em: http://seu-dominio.com.br${NC}"

exit 0
