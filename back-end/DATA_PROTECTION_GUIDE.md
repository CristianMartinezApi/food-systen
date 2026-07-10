# 🔒 Guia de Proteção de Dados do Food-Systen

> **Regra de Ouro:** Nunca use `prisma migrate reset` em produção! ❌

---

## 📋 Índice

1. [Como Aplicar Migrações Corretamente](#como-aplicar-migrações-corretamente)
2. [Script de Seed para Dados de Teste](#script-de-seed-para-dados-de-teste)
3. [Backup e Restauração](#backup-e-restauração)
4. [Procedimentos de Emergência](#procedimentos-de-emergência)
5. [Checklist de Segurança](#checklist-de-segurança)

---

## ✅ Como Aplicar Migrações Corretamente

### 🚀 Em Desenvolvimento (LOCAL)

```bash
# Criar e aplicar nova migração
npm run migrate:dev

# Criar migração SEM aplicar (review antes)
npx prisma migrate dev --create-only

# Preview das mudanças
npx prisma migrate status
```

### 🏢 Em Produção (SERVIDOR/LOCAWEB)

```bash
# NUNCA use reset!!!
# ❌ npm run db:reset

# Use SEMPRE isto para aplicar migrações:
npm run migrate:prod
# Equivalente a: npx prisma migrate deploy

# Verificar status
npx prisma migrate status
```

---

## 🌱 Script de Seed para Dados de Teste

### Executar Seed Local

```bash
npm run seed
```

Isso cria:

- ✅ 1 Super Admin (`admin@food-systen.com` / `admin123`)
- ✅ 1 Restaurante de teste
- ✅ 1 Owner (`owner@restaurante-teste.com` / `senha123`)
- ✅ 3 Categorias de produtos
- ✅ 3 Produtos com tamanhos
- ✅ 1 Cliente
- ✅ 1 Sessão de caixa aberta
- ✅ 2 Pedidos de teste

### Executar Seed em Docker

```bash
docker-compose exec backend npm run seed
```

---

## 💾 Backup e Restauração

### Fazer Backup Automático

```bash
# Backup manual do banco
npm run db:backup
# Cria arquivo: backup_YYYYMMDD_HHMMSS.sql

# Com Docker
docker-compose exec db pg_dump -U food_user -d food_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar de Backup

```bash
# Restaurar dados (preserva schema)
psql -U food_user -d food_db < backup_YYYYMMDD_HHMMSS.sql

# Com Docker
docker-compose exec -T db psql -U food_user -d food_db < backup.sql
```

---

## 🚨 Procedimentos de Emergência

### Cenário 1: Migração Falhou

```bash
# Resolver migração falhada (NÃO rollback, marca como resolvida)
npx prisma migrate resolve --rolled-back 20260707_migration_name

# Depois corrigir a migração e reaplicar
npx prisma migrate dev
```

### Cenário 2: Dados Apagados Acidentalmente

```bash
# 1. Restaurar de backup imediato
psql -U food_user -d food_db < backup_mais_recente.sql

# 2. Verificar integridade
SELECT COUNT(*) FROM restaurants;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM users;

# 3. Confirmar restauração bem-sucedida
```

### Cenário 3: Banco Corrompido

```bash
# ⚠️ APENAS EM DESENVOLVIMENTO!
# 1. Backup dos dados primeiro (se possível)
npm run db:backup

# 2. Recriar banco
docker-compose down
docker-compose up -d

# 3. Aplicar migrações
npx prisma migrate deploy

# 4. Repovoar dados
npm run seed
```

---

## 📊 Status do Banco

### Ver Todas as Migrações Aplicadas

```bash
npx prisma migrate status
```

Saída esperada:

```
Migration name                            Status      Timestamp
20260526181210_init                       Success     2026-07-07 18:20:00
20260601161323_security_updates           Success     2026-07-07 18:20:05
...
20260707213245_add_pix_config_fields      Success     2026-07-07 21:32:45
```

### Verificar Dados Principais

```bash
# Via Docker
docker-compose exec db psql -U food_user -d food_db -c "
  SELECT
    (SELECT COUNT(*) FROM restaurants) as restaurants,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM orders) as orders,
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM categories) as categories;
"
```

---

## ✅ Checklist de Segurança

### Diário

- [ ] Verificar logs de erros: `docker compose logs --tail 100 backend`
- [ ] Conferir status dos containers: `docker compose ps`
- [ ] Validar integridade de dados críticos (restaurantes, usuários)

### Semanal

- [ ] Fazer backup: `npm run db:backup`
- [ ] Verificar espaço em disco: `df -h`
- [ ] Testar restauração de backup (em staging): `psql < backup.sql`
- [ ] Revisar logs de auditoria

### Mensal

- [ ] Executar `ANALYZE` para otimizar índices
- [ ] Verificar replicação de dados (se houver)
- [ ] Testar plano de disaster recovery
- [ ] Validar integridade de backups

### Antes de Qualquer Deploy

- ✅ Fazer backup completo
- ✅ Testar migrações em ambiente de teste
- ✅ Verificar `npx prisma migrate status`
- ✅ Confirmar que NÃO há conflitos de schema
- ✅ Preparar rollback (versão anterior de código)
- ✅ Documentar mudanças de schema

---

## 🚫 O QUE NUNCA FAZER

```bash
# ❌ NUNCA em produção
prisma migrate reset

# ❌ NUNCA apagar migrations manualmente
rm -rf prisma/migrations/20260707_*

# ❌ NUNCA editar migration.sql após aplicar
# (cria inconsistência no banco)

# ❌ NUNCA ignorar erros de migração
# (sempre resolver ou investigar)

# ❌ NUNCA fazer deploy sem backup
# (sempre ter plano B)

# ❌ NUNCA modificar schema diretamente no banco
# (sempre através de migrations)
```

---

## 📚 Comandos Úteis Rápida Referência

| Comando                       | Descrição                     | Ambiente |
| ----------------------------- | ----------------------------- | -------- |
| `npm run seed`                | Popular banco com dados teste | Dev      |
| `npm run migrate:dev`         | Criar + aplicar migração      | Dev      |
| `npm run migrate:prod`        | Aplicar migrações             | Prod     |
| `npm run db:backup`           | Fazer backup                  | Qualquer |
| `npm run db:restore`          | Restaurar backup              | Dev      |
| `docker compose logs backend` | Ver logs                      | Qualquer |
| `npx prisma migrate status`   | Ver migrações pendentes       | Qualquer |
| `npx prisma studio`           | GUI banco de dados            | Dev      |

---

## 🆘 Suporte

Se algo der errado:

1. **Verificar logs:** `docker compose logs --tail 200 backend`
2. **Conferir status:** `npx prisma migrate status`
3. **Restaurar backup:** `psql < backup_ultimo.sql`
4. **Contatar DevOps:** Se não conseguir resolver em 30 min

---

## 📞 Equipe

- **DevOps:** Responsável por backups e disaster recovery
- **Backend:** Responsável por migrações e mudanças de schema
- **QA:** Responsável por testar em staging antes de prod

---

**Última atualização:** 2026-07-07
**Versão:** 1.0
