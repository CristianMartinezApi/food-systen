# FoodSystem — instruções para agentes de código

Este arquivo é a fonte de verdade compartilhada para qualquer agente que trabalhe neste repositório. Leia-o antes de alterar código. Instruções explícitas do usuário têm precedência.

## Produto e arquitetura

FoodSystem é uma plataforma SaaS multi-tenant para restaurantes, com cardápio e checkout públicos, painel administrativo, operação de pedidos e caixa, PIX direto e impressão térmica.

O repositório contém três aplicações Node independentes:

- `front-end/`: Next.js App Router, React, TypeScript, Tailwind, Zustand e Socket.IO Client.
- `back-end/`: Express + TypeScript + Prisma + PostgreSQL + Socket.IO. A maior parte das rotas ainda vive em `src/index.ts`; não faça refatorações amplas incidentais.
- `printer-agent/`: agente TypeScript executado na máquina da loja, inclusive como serviço do Windows, para impressão ESC/POS por rede ou USB.

Infraestrutura, scripts de deploy e Compose ficam em `deploy/`. Documentação funcional e operacional fica em `docs/`.

Não presuma que o `README.md` está atualizado. Em divergências, use nesta ordem: código e testes, manifests (`package.json`, schema Prisma e Compose), documentação específica em `docs/`, depois o README.

## Mapa do frontend

- `front-end/app/`: rotas finas do Next.js. Em geral, cada `page.tsx` apenas monta uma página de `src/modules`.
- `front-end/src/modules/admin/`: painel e fluxos administrativos.
- `front-end/src/modules/shop/`: loja pública, carrinho, checkout e acompanhamento de pedidos.
- `front-end/src/modules/saas/`: landing page.
- `front-end/src/core/`: configurações, hooks, stores e tipos transversais.
- `front-end/src/shared/`: componentes UI e utilitários compartilhados.
- Alias de importação: `@/*` aponta para `front-end/src/*`.

Preserve a separação entre route wrappers em `app/` e implementação em `src/modules/`. Componentes que usam estado, efeitos ou APIs do navegador precisam de `"use client"` no limite correto.

## Mapa do backend e dados

- `back-end/src/index.ts`: bootstrap, middlewares, rotas HTTP, Socket.IO e regras ainda não extraídas.
- `back-end/src/middlewares/`: autenticação e resolução de tenant.
- `back-end/src/utils/`: regras reutilizáveis e testáveis, como horários, caixa e montagem guiada.
- `back-end/src/services/`: integrações/serviços de domínio.
- `back-end/prisma/schema.prisma`: modelo canônico dos dados.
- `back-end/prisma/migrations/`: histórico imutável de migrations aplicadas.

O tenancy usa `restaurantId` e, nos fluxos públicos, o slug/cabeçalho resolvido pelo tenant middleware. Toda leitura ou escrita de dados pertencentes a uma loja deve ser limitada ao tenant autenticado/resolvido. Nunca aceite um `restaurantId` do cliente como autorização suficiente.

## Regras invariantes

- Preserve isolamento multi-tenant em consultas, mutations, eventos Socket.IO, relatórios, arquivos e impressão.
- Preserve RBAC e os limites entre `SUPER_ADMIN`, `OWNER`, `MANAGER`, `CASHIER` e `EMPLOYEE`.
- Não enfraqueça autenticação, cookies, CORS, rate limits, idempotência de pedidos nem auditoria.
- Valores monetários e totais devem ser calculados/validados no backend; não confie em preço ou total enviado pelo cliente. Mantenha o comportamento monetário existente salvo tarefa explícita de migração.
- Fluxos de caixa, cancelamento/estorno, baixa de estoque e criação de pedidos exigem atomicidade e atenção a concorrência e idempotência.
- PIX é direto para a chave da loja e tem confirmação manual; não invente gateway, webhook ou confirmação automática.
- Tokens, senhas, chaves PIX, credenciais de banco e dados pessoais nunca devem aparecer em logs, fixtures, commits ou respostas. Não leia nem exponha `.env`; use `.env.example` para conhecer variáveis.
- Não altere nem apague migrations já existentes. Mudanças de schema exigem uma nova migration Prisma revisável.
- Não execute `prisma migrate reset`, remoção de volumes, restauração de backup, deploy ou comandos destrutivos sem pedido e confirmação explícitos.
- Não modifique dados de produção nem publique/deploye como consequência implícita de uma tarefa de código.

## Convenções de implementação

- TypeScript estrito. Evite introduzir `any`; valide e estreite dados vindos de HTTP, JSON, Prisma `Json` e armazenamento local.
- Siga o estilo do arquivo tocado; não reformate arquivos inteiros nem faça renomeações não relacionadas.
- Reutilize componentes, helpers, formatos de resposta e tratamento de erro existentes antes de criar abstrações.
- Mantenha textos de interface em português do Brasil e preserve acentos/UTF-8.
- Use nomes de domínio claros em inglês no código e rotas, seguindo a base existente.
- Para mudanças de regra compartilhada entre frontend e backend, verifique ambos os lados e os tipos envolvidos.
- Ao corrigir bug, prefira adicionar teste de regressão no nível mais próximo da regra.
- Não edite artefatos gerados: `.next/`, `dist/`, `*.tsbuildinfo`, Prisma Client, logs, uploads, backups ou arquivos em `node_modules/`.
- Não adicione dependência sem justificar a necessidade e verificar se uma dependência existente resolve o problema.

## Banco e migrations

Ao mudar `schema.prisma`:

1. Entenda o impacto nos dados existentes e no isolamento por tenant.
2. Crie uma nova migration; não reescreva o histórico.
3. Prefira mudanças compatíveis com deploy gradual. Para alteração destrutiva ou `NOT NULL` em dados existentes, planeje backfill e transição.
4. Revise índices, constraints, `onDelete` e unicidade composta por tenant.
5. Rode `npx prisma validate` e gere o client quando necessário.

## Comandos úteis

Execute comandos no diretório da aplicação correspondente.

### Frontend (`front-end/`)

- Instalar: `npm ci`
- Desenvolvimento: `npm run dev`
- Build/typecheck de produção: `npm run build`
- Lint: `npx eslint .` (o script `npm run lint` pode estar incompatível com versões atuais do Next)
- Teste da loja: `npm run test:shop-ui`
- Verificação focada da loja: `npm run verify:shop-ui`

### Backend (`back-end/`)

- Instalar: `npm ci`
- Desenvolvimento: `npm run dev`
- Build/typecheck: `npm run build`
- Todos os testes: `npm test`
- Validar Prisma: `npx prisma validate`
- Gerar client: `npx prisma generate`
- Aplicar migrations locais existentes: `npm run migrate:prod`

### Agente de impressão (`printer-agent/`)

- Instalar: `npm ci`
- Build/typecheck: `npm run build`
- Diagnóstico: `npm run doctor`
- Execução local: `npm run dev`

### Stack Docker local (raiz)

- Subir: `docker compose -f deploy/docker-compose.yml up -d`
- Logs: `docker compose -f deploy/docker-compose.yml logs -f`
- Parar sem apagar dados: `docker compose -f deploy/docker-compose.yml down`

O Compose local expõe normalmente frontend em `3001`, backend em `8001` e PostgreSQL em `5433` no host.

## Verificação proporcional

Antes de concluir, rode a menor combinação que cubra a mudança e informe exatamente o que foi executado:

- Frontend: teste focado quando houver + `npx tsc --noEmit` ou `npm run build`; lint nos arquivos tocados ou no projeto quando viável.
- Backend: teste focado + `npm run build`; use `npm test` para mudanças transversais.
- Prisma: `npx prisma validate`, backend build e testes da regra afetada.
- Impressão: `npm run build`; use `doctor` ou modo arquivo apenas quando houver configuração segura disponível.
- Mudanças full-stack: verifique os contratos dos dois lados e teste o fluxo afetado.

Não declare sucesso se o comando falhou. Diferencie falha introduzida pela mudança, dívida já existente e limitação do ambiente.

## Git e colaboração simultânea

- Comece com `git status --short` e preserve alterações preexistentes do usuário ou de outro agente.
- Não reverta, sobrescreva, faça stash nem inclua no commit mudanças que não são suas.
- Não crie commit, push, PR, merge ou deploy sem solicitação explícita.
- Use commits pequenos e convencionais quando solicitado: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `ci:`.
- Codex e Claude Code não devem editar o mesmo worktree ao mesmo tempo. Para trabalho realmente paralelo, use worktrees e branches separados; uma pessoa integra as mudanças depois.
- Se ambos precisarem atuar no mesmo worktree, serialize as tarefas, delimite arquivos e sempre releia `git status` e o diff antes de editar.
- Registre decisões duráveis em documentação ou código; não dependa do histórico de conversa de um agente.

## Critério de conclusão

Uma entrega está pronta quando o pedido foi implementado sem ampliar o escopo, invariantes foram preservadas, verificações relevantes passaram e o resumo final lista arquivos alterados, testes executados e riscos ou pendências reais.
