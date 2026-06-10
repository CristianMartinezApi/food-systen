#!/usr/bin/env node

/**
 * Manual Testing Guide - Sistema de Gerenciamento de Senhas
 * Execute estes testes manualmente para validação E2E
 */

const chalk = require("chalk");

const testGuide = `
${chalk.cyan.bold("=".repeat(80))}
${chalk.cyan.bold("🔐 GUIA DE TESTES MANUAIS - SISTEMA DE GERENCIAMENTO DE SENHAS")}
${chalk.cyan.bold("=".repeat(80))}

${chalk.yellow.bold("\n📌 PRÉ-REQUISITOS:")}
  1. Backend rodando: cd back-end && npm start
  2. Banco de dados PostgreSQL ativo
  3. Migrations aplicadas: npx prisma migrate deploy
  4. Usuário admin existente com email: admin@example.com

${chalk.yellow.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.yellow.bold("TESTE 1: MUDAR SENHA (USUÁRIO AUTENTICADO)")}
${chalk.yellow.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}

${chalk.green("✓ Locais para testar:")}
  1. Frontend: Settings > Segurança da Conta > Alterar Senha
  2. API: POST /api/users/me/change-password

${chalk.green("✓ Testes a fazer:")}

  A) Validação de Força de Senha
     • Entrada: "123" → Esperado: ❌ "Senha muito fraca"
     • Entrada: "password" → Esperado: ❌ "Faltam maiúscula, número, caractere especial"
     • Entrada: "NewPass@123" → Esperado: ✅ Aceita

  B) Rejeição de Senha Atual Incorreta
     • Entrada: currentPassword incorreta → Esperado: ❌ 401 "Senha atual incorreta"

  C) Mismatch de Confirmação
     • Entrada: newPassword ≠ confirmPassword → Esperado: ❌ "Senhas não correspondem"

  D) Sucesso na Mudança
     • Entrada: Todos os campos corretos → Esperado: ✅ Redireciona para /admin/login (logout)

  E) Auditoria
     • Verifique no banco: SELECT * FROM password_change_attempts WHERE userId = X
     • Esperado: Registro com success=true, ipAddress, userAgent

${chalk.yellow.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.yellow.bold("TESTE 2: RATE LIMITING (5 TENTATIVAS / 15 MINUTOS)")}
${chalk.yellow.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}

${chalk.green("✓ Como testar:")}
  1. Faça login no painel admin
  2. Vá para Settings > Mudar Senha
  3. Tente mudar senha com senha atual incorreta
  4. Repita 5 vezes no máximo com intervalos

${chalk.green("✓ Esperado:")}
  • Tentativas 1-5: ❌ "Senha atual incorreta" (401)
  • Tentativa 6: ❌ HTTP 429 "Muitas tentativas. Tente novamente em X minutos"

${chalk.green("✓ Verificação no banco:")}
  SELECT * FROM password_change_attempts 
  WHERE userId = X AND createdAt > NOW() - INTERVAL '15 minutes'
  ORDER BY createdAt DESC LIMIT 10;

${chalk.yellow.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.yellow.bold("TESTE 3: ESQUECI MINHA SENHA (PUBLIC FLOW)")}
${chalk.yellow.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}

${chalk.green("✓ Localização:")}
  1. Frontend: /admin/reset-password (link na página de login)
  2. API: POST /api/auth/forgot-password

${chalk.green("✓ Testes a fazer:")}

  A) Email Válido
     • Acesse: /admin/reset-password
     • Digite: admin@example.com
     • Esperado: ✅ "Email de reset enviado" + redireciona para login após 2s

  B) Email Inválido
     • Digite: email-invalido@test.com
     • Esperado: ✅ "Email de reset enviado" (segurança: mesma mensagem)

  C) Verificação no Banco
     SELECT * FROM password_reset_tokens 
     WHERE email = 'admin@example.com' 
     ORDER BY createdAt DESC LIMIT 1;
     
     • Esperado: token (64 chars hex), used=false, expiresAt = NOW + 1 hora

${chalk.yellow.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.yellow.bold("TESTE 4: RESETAR SENHA COM TOKEN")}
${chalk.yellow.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}

${chalk.green("✓ Como testar:")}
  1. Trigger: Esqueci Minha Senha (tópico anterior)
  2. Extraia o token do banco: 
     SELECT token FROM password_reset_tokens 
     WHERE email = 'admin@example.com' 
     ORDER BY createdAt DESC LIMIT 1;
  3. Acesse: /admin/reset-password?token=XXXXX
  4. Digite nova senha

${chalk.green("✓ Testes a fazer:")}

  A) Token Válido
     • URL: /admin/reset-password?token=<VALID_TOKEN>
     • Digite: NewPassword@123 em ambos os campos
     • Esperado: ✅ "Senha resetada com sucesso" + redireciona para login

  B) Token Expirado
     • Token com expiração > 1 hora
     • Esperado: ❌ "Token expirado" + redireciona para login

  C) Token Já Usado
     • Use o mesmo token 2x
     • Esperado: 1ª vez ✅ Sucesso, 2ª vez ❌ "Token já foi utilizado"

  D) Token Inválido
     • URL: /admin/reset-password?token=INVALID
     • Esperado: ❌ "Token inválido" + redireciona para login

  E) Verificação no Banco (Sucesso)
     SELECT * FROM password_reset_tokens 
     WHERE token = 'XXX';
     
     • Esperado: used=true, usedAt=NOW()

${chalk.yellow.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.yellow.bold("TESTE 5: ADMIN RESETAR SENHA")}
${chalk.yellow.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}

${chalk.green("✓ Localização:")}
  1. Frontend: Admin Dashboard > Clientes > botão "Reset Senha" em cada usuário
  2. API: POST /api/admin/users/:id/reset-password

${chalk.green("✓ Testes a fazer:")}

  A) Admin Reseta Senha (Super Admin Only)
     • Acesse: Dashboard > Clientes
     • Clique em "Reset Senha" para um usuário
     • Digite: NewAdmin@Pass123
     • Esperado: ✅ Modal mostra sucesso com nome do usuário

  B) Validação de Força de Senha
     • Tente: "123" → Esperado: ❌ "Senha fraca"
     • Tente: "Strong@Pass123" → Esperado: ✅ Sucesso

  C) Auditoria
     SELECT * FROM "AuditLog" 
     WHERE action = 'ADMIN_RESET_PASSWORD' 
     ORDER BY createdAt DESC LIMIT 1;
     
     • Esperado: Registra admin ID, user ID, descrição

  D) Verificação de Acesso
     • Não-admin tenta acessar endpoint
     • Esperado: ❌ 403 "Não autorizado"

${chalk.yellow.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.yellow.bold("TESTE 6: INTEGRAÇÃO COMPLETA")}
${chalk.yellow.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}

${chalk.green("✓ Cenário completo:")}

  1. Login com admin@example.com
  2. Settings > Mudar Senha > NewPass@123 ✅
  3. Será redirecionado para login (logout forçado)
  4. Login novamente com admin@example.com e NewPass@123 ✅
  5. Esqueci Minha Senha > admin@example.com
  6. Extrair token do banco
  7. /admin/reset-password?token=XXX > AnotherPass@123 ✅
  8. Login com AnotherPass@123 ✅
  9. Admin reset senha para outro usuário ✅
  10. Novo usuário consegue fazer login com nova senha ✅

${chalk.yellow.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.yellow.bold("QUERIES DE VERIFICAÇÃO")}
${chalk.yellow.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}

${chalk.cyan("-- Ver tentativas recentes de mudança de senha:")}
  SELECT userId, success, reason, ipAddress, userAgent, "createdAt" 
  FROM password_change_attempts 
  ORDER BY "createdAt" DESC LIMIT 20;

${chalk.cyan("-- Ver tokens de reset pendentes:")}
  SELECT id, email, token, used, "expiresAt", "createdAt" 
  FROM password_reset_tokens 
  WHERE used = false AND "expiresAt" > NOW()
  ORDER BY "createdAt" DESC;

${chalk.cyan("-- Ver tokens expirados:")}
  SELECT id, email, "expiresAt" 
  FROM password_reset_tokens 
  WHERE "expiresAt" < NOW()
  LIMIT 10;

${chalk.cyan("-- Ver logs de auditoria (admin reset):")}
  SELECT "userId", action, description, "createdAt" 
  FROM "AuditLog" 
  WHERE action LIKE '%PASSWORD%'
  ORDER BY "createdAt" DESC LIMIT 10;

${chalk.cyan.bold("\n" + "=".repeat(80))}
${chalk.cyan.bold("✨ RESUMO FINAL")}
${chalk.cyan.bold("=".repeat(80))}

✅ Implementado:
  • Validação de força de senha (5 requisitos)
  • Mudar senha com rate limiting (5/15 min)
  • Esqueci minha senha (token 1 hora)
  • Reset com token (uso único)
  • Admin reset (super admin only)
  • Auditoria completa
  • Auto-logout após mudança
  • Hashing bcrypt (10 rounds)
  • Tokens criptográficos (64 hex)

🚀 Próximas Etapas:
  1. Email Service: SendGrid ou AWS SES
  2. Test E2E: Cypress ou Playwright
  3. Performance: Validar rate limiting com stress test
  4. Security: OWASP Top 10 review

${chalk.cyan.bold("\n" + "=".repeat(80))}
`;

console.log(testGuide);
