# Roadmap Caixa Completo (PDV)

## Objetivo

Transformar o painel administrativo em um caixa completo para operação diária de loja (balcao, retirada e apoio a delivery), com trilha financeira, controle por turno e governanca.

## Escopo Atual (mapeado)

- Pedidos em tempo real com mudanca de status e alertas sonoros.
- Cadastro de produtos/categorias e configuracoes operacionais.
- Dashboard com KPIs de vendas e pedidos.
- Auditoria administrativa e perfis de acesso.

## Lacunas para virar Caixa

- Frente de caixa (PDV) de balcao com fluxo rapido de venda.
- Sessao de caixa por turno (abertura, sangria, suprimento, fechamento).
- Fechamento financeiro por operador e meio de pagamento.
- Impressao operacional real (comanda/comprovante).
- Historico de eventos de pedido orientado a operacao.
- Permissoes granulares para acoes sensiveis (cancelar/estornar).

## Fases de Implementacao

### Fase 1 - Caixa Operacional (MVP)

- Nova area Caixa no admin.
- Comanda de balcao com criacao rapida de venda local.
- Abertura/fechamento de caixa (estado por sessao).
- Registro de movimentos: sangria e suprimento.
- Impressao de comanda/comprovante (web print inicial).

### Fase 2 - Caixa Financeiro (Concluído ✅)

- Fechamento por turno com resumo por meio de pagamento (Dinheiro, PIX, Débito, Crédito).
- Pagamento múltiplo no mesmo pedido (split).
- Regras de estorno/cancelamento por perfil.
- Divergência entre valor esperado x informado no fechamento.
- Conciliação assistida com conferência independente de Cartão e PIX.

### Fase 3 - Caixa Escalavel

- [x] KDS single-station (`/admin/cozinha`): kanban Confirmados/Em preparo/Prontos,
  tempo real via socket, alerta sonoro de pedido novo. Reaproveita os mesmos
  endpoints de pedidos (`GET /orders`, `PATCH /orders/:id`), sem rota nova.
- [ ] KDS por etapa (cozinha/expedicao/balcao) — multi-estacao ainda nao implementado;
  hoje existe uma unica tela de cozinha, sem separacao por posto fisico.
- SLA por etapa e gargalos operacionais.
- Integracoes externas (fiscal/ERP/TEF) conforme estrategia.

## Plano de Refinamento (pos-MVP)

### Refinamento 1 - Ergonomia de Impressao

- Modal unico de formato (A4/Thermal) para pedidos e caixa.
- Persistencia da preferencia de formato por usuario.
- Opcao de impressao direta sem perguntar apenas para pedidos em preparo.
- Indicadores visuais no topo com formato atual e status da impressao direta.

Critérios de aceite:

- Operador consegue identificar o modo atual sem abrir modal.
- Pedido em preparo imprime com 1 clique quando impressao direta estiver ativa.
- Demais status continuam com confirmacao de formato.

### Refinamento 2 - Governanca Operacional

- Reimpressao rapida no historico de sessoes de caixa.
- Marcacao de impressao realizada por pedido (evento de auditoria).
- Bloqueio opcional para evitar reimpressao acidental em pedidos finalizados.

Critérios de aceite:

- Historico de sessao permite reimpressao em ate 2 cliques.
- Auditoria registra operador, horario e tipo de impressao.

### Refinamento 3 - Fechamento Assistido

- Checklist de fechamento (conferencia de fisico x esperado).
- Campo de justificativa obrigatoria para divergencia acima de limite.
- Relatorio de fechamento com resumo por forma de pagamento e assinatura do operador.

Critérios de aceite:

- Nao fecha caixa com divergencia relevante sem justificativa.
- Relatorio final atende impressao termica e A4.

## Backlog Priorizado (curto prazo)

1. Criar rota Caixa no admin e navegacao dedicada.
2. Definir modelo de dados de sessao de caixa e movimentos.
3. Implementar endpoints de abertura/fechamento e movimentos.
4. Exibir painel operacional de caixa (sessao atual + resumo).
5. Ligar acao de impressao no modulo de pedidos.
6. Adicionar trilha de auditoria para eventos de caixa.

## Contratos de Dados (propostos)

- CashSession
  - id, restaurantId, openedBy, openedAt, openingAmount, status, closedBy, closedAt, closingAmount, expectedAmount, difference
- CashMovement
  - id, cashSessionId, type (SUPRIMENTO|SANGRIA|AJUSTE), amount, reason, createdBy, createdAt
- OrderStatusHistory
  - id, orderId, previousStatus, newStatus, changedBy, reason, createdAt
- PaymentTransaction
  - id, orderId, method, amount, status, externalRef, createdAt

## Riscos e Mitigacoes

- Concorrencia em caixa compartilhado por operadores.
  - Mitigar com sessao ativa unica por operador e locks transacionais.
- Erro humano no fechamento.
  - Mitigar com confirmacoes, validacoes e trilha de auditoria.
- Dependencia de impressora local.
  - Mitigar com fallback de impressao em navegador e fila de impressao.

## Definition of Done por Entrega

- Fluxo funcional ponta a ponta (frontend + backend + persistencia).
- Auditoria dos eventos criticos.
- Mensagens claras de erro para operacao.
- Teste manual guiado com roteiro de homologacao.

## Roteiro de Homologacao

- Documento operacional: `docs/caixa-homologacao-operacional.md`
- Executar CT-01 a CT-12 antes de aprovar release de caixa.

## Status de Execucao

- [x] Planejamento e documentacao do roadmap.
- [x] Inicio da Fase 1 com area Caixa no admin.
- [x] Modelos e migracao de sessao de caixa.
- [x] Endpoints de abertura/fechamento/movimentos.
- [x] Impressao operacional integrada.
- [x] Historico de caixa com filtros (status, operador e periodo).
- [x] Relatorio de fechamento com resumo por meio de pagamento.
- [x] Refinamento 1 concluido (modal compartilhado, preferencia persistida, impressao direta em preparo e indicadores visuais).
- [x] Refinamento 2 concluido (auditoria de impressao, marcacao de itens impressos, confirmacoes sensiveis e venda direta no caixa com mini-PDV por produtos).
- [x] Refinamento 3 concluido (justificativa obrigatoria para divergencia relevante, checklist visual, limite configuravel via settings e fechamento baseado em dinheiro fisico).
- [x] Roteiro de homologacao operacional documentado (CT-01 a CT-12).
