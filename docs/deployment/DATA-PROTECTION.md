# ⚠️ REGRAS DE OURO PARA NÃO PERDER DADOS

## 🚨 RÈGRA #1: NUNCA USAR `migrate reset` EM PRODUÇÃO

```bash
# ❌ ERRADO - APAGA TUDO!
npx prisma migrate reset --force

# ✅ CORRETO - PRESERVA DADOS
npx prisma migrate deploy
```

---

## 🛡️ ANTES DE QUALQUER DEPLOYMENT

```bash
# 1. SEMPRE FAZER BACKUP
docker compose exec db pg_dump -U food_user food_db > backup_$(date +%s).sql

# 2. TESTAR MIGRAÇÕES PENDENTES
npx prisma migrate status

# 3. VER O QUE VAI MUDAR
git diff --name-only HEAD~1

# 4. DEPLOY COM SEGURANÇA
docker compose pull
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy

# 5. VALIDAR TUDO OK
curl https://seu-dominio.com.br/api/categories
```

---

## 🔄 ROLLBACK DE EMERGÊNCIA (Se der erro)

```bash
# Parar aplicação
docker compose down

# Restaurar backup
docker compose up -d db
sleep 5
docker compose exec db psql -U food_user food_db < backup_xxxxx.sql

# Voltar código anterior
git revert HEAD
docker compose up -d --build

# Verificar
docker compose ps
```

---

## 📊 DADOS QUE VOCÊ NÃO PODE PERDER

```
✅ Restaurantes cadastrados (> 100?)
✅ Pedidos histórico completo
✅ Usuários autenticados
✅ Caixa & Movimentações
✅ Auditoria (quem fez o quê quando)
✅ Configurações de PIX
✅ Produtos & Categorias
```

---

## 🎯 CHECKLIST DE SEGURANÇA

- [ ] Backup feito antes de deploy?
- [ ] Migrações testadas em staging?
- [ ] Código revisado?
- [ ] Variáveis de ambiente atualizadas?
- [ ] SSL/HTTPS ativo?
- [ ] Cron de backup 2x/dia configurado?
- [ ] Monitoramento ativo?

---

## 📞 SUPORTE RÁPIDO

```bash
# Ver logs em tempo real
docker compose logs -f backend

# Verificar saúde
docker compose ps

# Reiniciar tudo
docker compose restart

# Limpar dados (SÓ EM DESENVOLVIMENTO!)
docker compose down -v
docker compose up -d
```

---

**LEMBRE-SE: Dados > Código. Sempre!** 🛡️
