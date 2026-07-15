#!/bin/bash

# 🛡️ SCRIPT DE BACKUP AUTOMÁTICO
# Use com: chmod +x backup.sh && ./backup.sh
# Ou coloque em cron: 0 */6 * * * /home/food-systen/backup.sh

set -e

BACKUP_DIR="/home/food-systen/backups"
CONTAINER_NAME="food-systen-db-1"
DB_USER="${POSTGRES_USER:-food_user}"
DB_NAME="${POSTGRES_DB:-food_db}"
RETENTION_DAYS=30

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🛡️  INICIANDO BACKUP AUTOMÁTICO${NC}"

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# Nome do backup com timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"
BACKUP_GZ="${BACKUP_FILE}.gz"

echo -e "${GREEN}📁 Diretório: $BACKUP_DIR${NC}"
echo -e "${GREEN}📦 Arquivo: $BACKUP_GZ${NC}"

# Executar pg_dump dentro do container
echo -e "${YELLOW}⏳ Fazendo dump do banco de dados...${NC}"

if docker compose -f docker-compose.prod.yml exec -T db pg_dump \
  -U "$DB_USER" \
  "$DB_NAME" > "$BACKUP_FILE"; then
  
  echo -e "${GREEN}✅ Dump criado com sucesso${NC}"
  
  # Comprimir para economizar espaço
  echo -e "${YELLOW}⏳ Comprimindo backup...${NC}"
  gzip "$BACKUP_FILE"
  
  BACKUP_SIZE=$(du -h "$BACKUP_GZ" | cut -f1)
  echo -e "${GREEN}✅ Backup compactado: $BACKUP_SIZE${NC}"
  
else
  echo -e "${RED}❌ ERRO ao fazer dump do banco de dados${NC}"
  exit 1
fi

# Remover backups antigos (>30 dias)
echo -e "${YELLOW}🧹 Removendo backups antigos (> ${RETENTION_DAYS} dias)...${NC}"

find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" | while read -r old_backup; do
  echo -e "${YELLOW}🗑️  Deletando: $old_backup${NC}"
  rm -f "$old_backup"
done

echo -e "${GREEN}✅ Limpeza concluída${NC}"

# Listar backups disponíveis
echo -e "\n${GREEN}📋 Backups disponíveis:${NC}"
ls -lh "$BACKUP_DIR" | tail -10

echo -e "\n${GREEN}✅ BACKUP CONCLUÍDO COM SUCESSO${NC}"
echo -e "${YELLOW}💾 Arquivo: $BACKUP_GZ${NC}"
echo -e "${YELLOW}📊 Tamanho: $BACKUP_SIZE${NC}"
echo -e "${YELLOW}🕐 Timestamp: $TIMESTAMP${NC}"

# Opcional: Enviar para cloud (Google Drive, AWS S3, etc)
# gsutil cp "$BACKUP_GZ" gs://seu-bucket/backups/
# aws s3 cp "$BACKUP_GZ" s3://seu-bucket/backups/

exit 0
