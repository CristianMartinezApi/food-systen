# 🛡️ PROTOCOLO DE DEPLOYMENT SEGURO

> ⚠️ **CRÍTICO**: Este guia protege seus dados de clientes contra perda.

---

## 🚨 REGRA DE OURO

```bash
# ❌ NUNCA USE EM PRODUÇÃO
npx prisma migrate reset --force

# ✅ SEMPRE USE EM PRODUÇÃO
npx prisma migrate deploy
```

**Diferença:**

- `reset`: Deleta TUDO (❌ Perda de dados!)
- `deploy`: Aplica APENAS novas migrations (✅ Seguro!)

---

## 📋 CHECKLIST PRÉ-DEPLOYMENT

### PASSO 1: Fazer Backup (SEMPRE!)

```bash
# Na Locaweb VPS, antes de qualquer deploy:
docker-compose -f docker-compose.prod.yml exec db pg_dump \
  -U $POSTGRES_USER $POSTGRES_DB > \
  backup_$(date +%Y%m%d_%H%M%S).sql

# Testar backup
file backup_*.sql  # Deve ter tamanho > 0
```

### PASSO 2: Verificar Migrações Pendentes

```bash
# Localmente (desenvolvimento):
npx prisma migrate status

# Output esperado:
# ✓ 28 migrations found
# ✓ 28 applied
# ✓ 0 pending
```

### PASSO 3: Teste em Staging (Se possível)

```bash
# Clonar banco de produção para staging
# Executar migrações em staging
# Testar funcionalidades críticas
# Se OK → deploy para produção
```

### PASSO 4: Deploy com Segurança

```bash
# Na Locaweb VPS:

# 1. Parar containers (opcional, aplicação fica indisponível por ~30s)
docker-compose -f docker-compose.prod.yml down

# 2. Pull código novo
git pull origin main

# 3. Build novo (com dados preservados)
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Esperar inicialização
sleep 10

# 5. Verificar migrações aplicadas (automático se não houver erro)
docker-compose -f docker-compose.prod.yml logs backend | grep -i migration

# 6. Testar API
curl http://localhost:8001/api/categories

# 7. Se tudo OK → Sucesso! ✅
# Se erro → Revert: git checkout main~1 && docker compose up -d --build
```

---

## 📊 ARQUITETURA DE DADOS (Segura)

```
Produção Locaweb:
├── PostgreSQL (Dados Críticos) ⭐
│   ├── Restaurantes (+ de 100?)
│   ├── Pedidos (histórico importante)
│   ├── Usuários autenticados
│   ├── Caixa & Movimentação
│   └── Auditoria (registro de tudo)
│
├── Docker Volumes (/data/postgres)
│   └── Backup automático 2x por dia
│
└── Git Repository
    └── Histórico de schemas (migrações)
```

---

## 🔄 CICLO SEGURO DE DESENVOLVIMENTO

```
Local Development:
1. Criar feature em branch
2. Adicionar migrations (se necessário)
3. Testar com `npm run dev`
4. Commit & Push

Staging (Opcional):
1. Deploy automático via CI/CD
2. Rodas testes com dados reais
3. Validar performance

Produção:
1. Pull code novo
2. Rodar `npx prisma migrate deploy` (SEGURO!)
3. Dados antigos: PRESERVADOS ✅
4. Novos campos/tabelas: CRIADAS
```

---

## 🚨 O QUE PODE DAR ERRADO (e como evitar)

### ❌ Erro 1: Deletar coluna sem backup

```typescript
// RUIM:
model Product {
  // ...
  oldField: String?  // ← deletou sem avisar
}
```

**Como evitar:**

- Criar migration PRIMEIRO
- Testar em staging
- Fazer backup em produção
- Rodar `migrate deploy` (não reset!)

### ❌ Erro 2: Mudar tipo de coluna

```typescript
// RUIM:
model Order {
  total: Int  // ← era Float, agora Int (perda de dados!)
}
```

**Como evitar:**

- Criar migration com conversão segura
- Testar dados reais em staging
- Validar com equipe

### ❌ Erro 3: Adicionar constraint UNIQUE sem validação

```typescript
// RUIM:
model Product {
  sku: String @unique  // ← e se já houver duplicatas?
}
```

**Como evitar:**

- Fazer limpeza de dados ANTES
- Criar index parcial se necessário
- Testar com dados reais

---

## ✅ DEPLOYMENT SEGURO (Passo a Passo)

### Semana 1: Preparar

- [ ] Criar script de backup automático
- [ ] Documentar schema atual
- [ ] Fazer backup manualmente

### Semana 2: Testar

- [ ] Executar migrations em staging
- [ ] Testar todas as APIs
- [ ] Validar dados não mudaram
- [ ] Performance OK?

### Semana 3: Deploy

- [ ] Backup em produção
- [ ] Pull código novo
- [ ] Build Docker
- [ ] Verificar logs
- [ ] Testar endpoints críticos
- [ ] Comunicar com clientes (planejado)

### Semana 4: Monitor

- [ ] Verificar logs por 24h
- [ ] Qualidade dos pedidos
- [ ] Performance estável
- [ ] Zero erros de migração

---

## 🔐 COMMANDS CHEAT SHEET

```bash
# LOCAWEB (Produção)
# ==================

# 1. Backup antes de tudo
docker-compose -f docker-compose.prod.yml exec db pg_dump -U food_user food_db > backup_$(date +%s).sql

# 2. Ver status de migrações
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate status

# 3. Aplicar migrações (SEGURO!)
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 4. Ver logs
docker-compose -f docker-compose.prod.yml logs -f backend

# 5. Rollback (volta pra versão anterior)
git revert HEAD
git push origin main
docker-compose -f docker-compose.prod.yml up -d --build

# 6. Restaurar de backup (EMERGÊNCIA)
# Parar containers
docker-compose -f docker-compose.prod.yml down

# Restaurar backup
docker-compose -f docker-compose.prod.yml exec db psql -U food_user food_db < backup_xxxxx.sql

# Reiniciar
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📈 MONITORAMENTO PÓS-DEPLOY

```bash
# Após deploy, executar por 1 hora:

# 1. Verificar saúde dos containers
watch -n 5 'docker compose ps'

# 2. Ver logs em tempo real
docker compose logs -f backend frontend

# 3. Testar endpoints críticos
curl http://seu-dominio.com.br/api/categories
curl http://seu-dominio.com.br/api/restaurants
curl http://seu-dominio.com.br/api/orders

# 4. Verificar banco de dados
docker compose exec db psql -U food_user food_db -c "\dt"
```

---

## 🎯 RESUMO

| Operação          | Segurança   | Uso                |
| ----------------- | ----------- | ------------------ |
| `migrate reset`   | ❌ Perigosa | Só desenvolvimento |
| `migrate deploy`  | ✅ Segura   | Produção           |
| `migrate resolve` | ⚠️ Urgência | Só se travado      |

---

## ❓ FAQ

**P: Vou perder meus dados ao fazer deploy?**  
R: NÃO! Se usar `migrate deploy` (correto) e não `migrate reset`.

**P: Posso fazer rollback?**  
R: SIM! `git revert HEAD` volta pra versão anterior.

**P: E se der erro na migração?**  
R: Restaure de backup: `pg_restore backup_xxxxx.sql`

**P: Com que frequência fazer backup?**  
R: SEMPRE antes de deploy. Ideal: 2x por dia automatizado.

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Entender este guia
2. ⏳ Criar script de backup automático (cron)
3. ⏳ Testar rollback em staging
4. ⏳ Comunicar protocolo com equipe

**SEGURANÇA EM PRIMEIRO LUGAR!** 🛡️
