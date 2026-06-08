# Roadmap Super‑Admin — Food System

Objetivo: organizar e priorizar as melhorias do painel do Super‑Admin para controlar clientes, lojas e provisionamento.

Prioridade (curto → médio):

1. Painel KPI (cards + tendência)
2. Gerenciamento de clientes (busca, filtros, bulk actions)
3. Painel de provisionamento por tenant (status, logs, retry)
4. Auditoria / Logs de atividade
5. Notificações e emails automatizados
6. Ações críticas UX (undo / soft delete)

Tarefas detalhadas

- Painel KPI — Implementar cards e gráficos
  - O que: cards com total de clientes, pendentes, lojas ativas, lojas pendentes, counts por provisioningStatus; gráfico de criação por semana.
  - Aceitação: cards atualizam via `/api/admin/kpis`; gráfico mostra 30 dias; link rápido para filas pendentes.
  - Arquivos: `back-end/src/index.ts` (endpoints), `front-end/src/modules/admin/pages/Dashboard/index.tsx` (componente), estilos.
  - Estimativa: 1-2 dias.

- Gerenciamento de clientes
  - O que: lista com search por nome/email, filtros (status), ordenação, seleção em massa e ações (aprovar/recusar/excluir/editar em lote).
  - Aceitação: operações em lote funcionais e protegidas por `SUPER_ADMIN`.
  - Arquivos: `front-end/src/modules/admin/pages/Clients/*`, `back-end/src/index.ts` (endpoints de bulk).
  - Estimativa: 2-3 dias.

- Painel de provisionamento por tenant
  - O que: tela que lista cada `restaurant` com `databaseName`, `provisioningStatus`, botão `retry provisioning`, e logs de provisionamento.
  - Aceitação: re-try dispara job (ou endpoint) e atualiza `provisioningStatus`; logs consultáveis.
  - Arquivos: backend (worker + endpoint), frontend (novo componente `ProvisioningPanel`).
  - Estimativa: 3-5 dias (inclui design de job/worker).

- Auditoria / Logs de atividade
  - O que: guardar eventos (userId, action, targetId, before, after, timestamp). UI para buscar e exportar.
  - Aceitação: histórico consultável e exportável com permissões.
  - Arquivos: nova tabela `AuditLog` no Prisma, endpoints e UI.
  - Estimativa: 2-4 dias.

- Notificações e emails automáticos
  - O que: templates, envio via provider (SMTP/Sendgrid), opção para enviar e-mail ao aprovar/recusar.
  - Aceitação: e-mails disparados em fluxos de aprovação e erro de provisionamento.
  - Estimativa: 1-2 dias.

Próximos passos sugeridos

- Confirmar prioridade e aprovar início do item 2 (Gerenciamento de clientes) ou item 1 (KPI) — eu já implementei o básico do KPI.
- Se aprovar, começo a criar branches e PRs (ou aplico alterações direto aqui) e atualizo o todo list.

Se quiser, abro issues locais com títulos e descrições para cada item (arquivo `docs/` já criado). Qual é a prioridade final que quer seguir agora?
