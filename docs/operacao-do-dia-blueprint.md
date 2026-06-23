# Blueprint - Operacao do Dia (Pedidos + Caixa)

## 1) Objetivo

Consolidar a rotina de loja em uma unica tela operacional, onde o operador:

- abre o caixa no inicio do turno
- acompanha pedidos online em tempo real
- registra vendas de balc ao
- registra movimentos (suprimento, sangria, ajuste)
- fecha o caixa com conferencia e justificativa de divergencia

Meta: reduzir troca de tela, reduzir erro operacional e aumentar rastreabilidade.

## 2) Estado atual (resumo)

Hoje a operacao esta fragmentada:

- Pedidos online em tela separada
- Caixa e venda direta em outra tela

Porem, no backend, os dados ja estao conectados:

- Caixa soma vendas por status contado
- Venda direta ja cria pedido e impacta caixa

Conclusao: a unificacao e evolutiva, sem reescrever o core.

## 3) Desenho da tela unica

Nome sugerido de rota: /admin/operacao

### Bloco A - Sessao de Caixa (topo)

- Status da sessao: ABERTO / FECHADO
- Botao Abrir Caixa (se nao houver sessao aberta)
- Valor de abertura
- Indicadores em tempo real:
  - Faturamento da sessao
  - Vendas em dinheiro
  - Esperado em caixa
  - Divergencia parcial
- Acoes:
  - Fechar caixa
  - Imprimir relatorio da sessao

### Bloco B - Fila de Pedidos Online (coluna principal)

- Filtros rapidos: Novos, Em preparo, Entregues, Cancelados
- Lista de pedidos com:
  - horario
  - cliente
  - forma de pagamento
  - valor
  - itens
- Acoes de status (dependem da modalidade):
  - DELIVERY: PENDING -> CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
  - PICKUP: PENDING -> CONFIRMED -> PREPARING -> READY -> RETIRED (entregue no balcao)
  - cancelar pedido (permitido ate antes da conclusao)
- Alertas sonoros/visuais para novos pedidos (ja existente)

### Bloco C - Balcao e Movimentos (coluna lateral)

- Venda direta:
  - selecao de produtos
  - quantidade
  - pagamento (cash/pix/cartao)
  - troco (quando cash)
  - confirmar venda
- Movimentos de caixa:
  - SUPPLY
  - WITHDRAWAL
  - ADJUSTMENT
  - motivo obrigatorio para sangria e ajuste

### Bloco D - Fechamento assistido (modal)

- Inputs:
  - dinheiro contado
  - total cartao informado
  - total pix informado
  - justificativa (obrigatoria se divergencia >= threshold)
- Resumo de conferencia Sistema x Informado
- Confirmacao final com auditoria

## 4) Regras de negocio

1. So pode existir 1 sessao OPEN por restaurante.
2. Abertura exige valor > 0.
3. Fechamento exige sessao OPEN.
4. Divergencia em dinheiro acima do threshold exige justificativa.
5. Status de pedidos contados no caixa: DELIVERED, RETIRED (entregue no balcao) e PAID.
6. Venda direta obrigatoriamente vinculada a sessao OPEN.
7. Permissoes:
   - operar pedidos e movimentos: SUPER_ADMIN, OWNER, MANAGER, EMPLOYEE
   - abrir/fechar caixa: SUPER_ADMIN, OWNER, MANAGER

### 4.1) Fluxo por modalidade (cliente x loja)

#### 4.1.1 DELIVERY (entrega)

Cliente:

1. Pedido Recebido
2. Pedido Confirmado
3. Em Preparo
4. Saiu para Entrega
5. Entregue

Loja:

1. Novo Pedido
2. Confirmar Pedido
3. Em Preparo
4. Marcar como Saiu para Entrega
5. Marcar como Entregue

Transicoes validas no backend:

- PENDING -> CONFIRMED
- CONFIRMED -> PREPARING
- PREPARING -> OUT_FOR_DELIVERY
- OUT_FOR_DELIVERY -> DELIVERED
- (PENDING|CONFIRMED|PREPARING|OUT_FOR_DELIVERY) -> CANCELLED

#### 4.1.2 PICKUP (retirada)

Cliente:

1. Pedido Recebido
2. Pedido Confirmado
3. Em Preparo
4. Pronto para Retirada
5. Entregue no balcao

Loja:

1. Novo Pedido
2. Confirmar Pedido
3. Em Preparo
4. Pronto para Retirada
5. Entregue no balcao

Transicoes validas no backend:

- PENDING -> CONFIRMED
- CONFIRMED -> PREPARING
- PREPARING -> READY
- READY -> RETIRED (entregue no balcao)
- (PENDING|CONFIRMED|PREPARING|READY) -> CANCELLED

#### 4.1.3 DINE_IN (consumo local)

- Definir em fase posterior (sugestao inicial: PENDING -> CONFIRMED -> PREPARING -> SERVED -> PAID).
- Ate a definicao final, nao reutilizar READY/OUT_FOR_DELIVERY sem regra explicita.

## 5) Contratos de API (reuso + gaps)

## Reusar ja existentes

- GET /api/cashier/session
- POST /api/cashier/session/open
- POST /api/cashier/movements
- POST /api/cashier/direct-sales
- POST /api/cashier/session/close
- GET /api/orders
- PATCH /api/orders/:id

## Novo endpoint recomendado (fase 2)

- GET /api/operations/day
  - retorna payload unico para tela unica (sessao, totais, pedidos, movimentos, cards)
  - reduz round-trips no carregamento

## Ajuste recomendado no endpoint existente

- PATCH /api/orders/:id
  - validar transicao de status com base em address.type
  - bloquear saltos invalidos (ex.: PREPARING -> DELIVERED em PICKUP sem passar por READY)
  - registrar tentativa invalida no AuditLog

## 6) Modelo de UX operacional

1. Ao entrar na tela:
   - se sessao nao existe: destaque Abrir Caixa
   - se sessao existe: mostrar operacao ativa
2. Pedido novo chega:
   - entra na fila de pedidos
   - alerta visual/sonoro
3. Operador processa pedido online e vendas de balcao na mesma tela.
4. No fechamento:
   - operador confere valores
   - registra informado
   - justifica divergencia relevante
   - confirma e imprime

## 6.1) Comportamento esperado da fila por modalidade

1. Cartao DELIVERY deve exibir CTA conforme etapa:

- PENDING: Confirmar
- CONFIRMED: Iniciar Preparo
- PREPARING: Saiu para Entrega
- OUT_FOR_DELIVERY: Marcar Entregue

2. Cartao PICKUP deve exibir CTA conforme etapa:

- PENDING: Confirmar
- CONFIRMED: Iniciar Preparo
- PREPARING: Pronto para Retirada
- READY: Marcar Entregue no Balcao

3. Timeline do cliente deve espelhar exatamente o mesmo fluxo da loja, com labels amigaveis.
4. Status READY deve ser exclusivo de PICKUP.
5. Status OUT_FOR_DELIVERY deve ser exclusivo de DELIVERY.

## 7) Roadmap em 3 fases

## Fase 1 - Unificacao de UI (rapida)

- Criar pagina /admin/operacao
- Compor a tela usando os modulos atuais de Orders + Cashier
- Manter rotas antigas /admin/orders e /admin/caixa funcionando

Criterio de aceite:

- Operador consegue executar ciclo completo sem trocar de pagina.

## Fase 2 - Qualidade de dados e performance

- Criar GET /api/operations/day
- Paginacao de pedidos na tela unica
- Filtros por periodo e operador dentro da propria tela

Criterio de aceite:

- Carregamento inicial mais rapido e sem duplicidade de fetch.

## Fase 3 - Fechamento profissional

- Snapshot imutavel no fechamento (totais por forma de pagamento)
- Relatorio passa a usar snapshot como fonte primaria
- Painel de divergencia por sessao e por operador

Criterio de aceite:

- Historico de fechamento consistente e auditavel.

## 8) Riscos e mitigacao

- Risco: tela unica ficar poluida.
  - Mitigacao: layout por blocos com foco em prioridades operacionais.
- Risco: regressao no fluxo atual.
  - Mitigacao: manter rotas antigas durante migracao.
- Risco: inconsistencias de conferencia historica.
  - Mitigacao: snapshot de fechamento na fase 3.

## 9) Checklist de implementacao

- [x] Criar rota /admin/operacao
- [x] Criar container de pagina unica (A/B/C/D)
- [x] Reusar hooks e chamadas atuais de pedidos e caixa
- [x] Garantir permissao por role (herdado dos modulos internos)
- [x] Header fixo com status da sessao e indicadores em tempo real
- [x] Layout desktop com colunas (65% pedidos / 35% caixa)
- [x] Layout mobile com abas (Pedidos / Caixa)
- [x] Banner de aviso quando caixa estiver fechado
- [x] Botao de refresh manual
- [ ] Testar ciclo completo: abrir -> operar -> fechar -> imprimir
- [ ] Testar virada de dia com sessao aberta
- [ ] Publicar feature flag para rollout gradual

## 10) KPI de sucesso

- Menos cliques para operacao completa por turno
- Menor tempo medio de fechamento de caixa
- Menor taxa de divergencia sem justificativa
- Menor erro operacional por troca de tela

## 11) Desenho de tela (UX Operador V2)

Objetivo do desenho: reduzir carga cognitiva e permitir que o operador execute o turno sem "pensar na navegacao".

### 11.1 Hierarquia visual (ordem de atencao)

1. Estado do caixa (aberto/fechado) - sempre no topo e fixo.
2. Fila de pedidos pendentes - area mais visivel da tela.
3. Acoes rapidas (aceitar pedido, concluir, registrar venda, sangria).
4. Conferencia financeira parcial (esperado x informado).
5. Historico e detalhes secundarios.

### 11.2 Layout recomendado (desktop)

```text
+-----------------------------------------------------------------------------------+
| HEADER FIXO: Sessao #123 | ABERTO | Abertura R$ 150,00 | Esperado R$ 842,10     |
| [Registrar Venda Balcao] [Suprimento] [Sangria] [Fechar Caixa] [Imprimir]       |
+--------------------------------------+--------------------------------------------+
| COLUNA ESQUERDA (65%)                | COLUNA DIREITA (35%)                       |
| PEDIDOS ONLINE                       | PAINEL DO CAIXA                            |
| [Novos][Preparo][Entregues]          | - Faturamento da sessao                    |
|--------------------------------------| - Dinheiro esperado                        |
| Card Pedido #501                     | - Dinheiro informado                       |
| Cliente, hora, pagamento, valor      | - Divergencia atual                        |
| [Aceitar] [Cancelar]                 |--------------------------------------------|
|--------------------------------------| MOVIMENTOS RAPIDOS                         |
| Card Pedido #502                     | [Suprimento] [Sangria] [Ajuste]            |
| ...                                  |--------------------------------------------|
|--------------------------------------| VENDA BALCAO (compacta)                    |
| Scroll infinito + paginacao          | Produto + qtd + pagamento + confirmar      |
+--------------------------------------+--------------------------------------------+
| RODAPE FIXO: Atalhos teclado | Alertas sonoros | Ultima sincronizacao           |
+-----------------------------------------------------------------------------------+
```

### 11.3 Layout recomendado (tablet/mobile)

1. Barra superior fixa com status do caixa e botao "Fechar".
2. Segmented control com 3 abas:

- Pedidos
- Balcao
- Caixa

3. Botao flutuante de acao primaria contextual:

- Na aba Pedidos: "Atualizar fila"
- Na aba Balcao: "Registrar venda"
- Na aba Caixa: "Fechar sessao"

### 11.4 Fluxo operacional ideal (passo a passo)

1. Entrou na tela -> se caixa fechado, bloqueia pedidos com banner: "Abra o caixa para iniciar".
2. Caixa aberto -> fila de pedidos habilitada e venda de balcao liberada.
3. Pedido novo chega -> destaca card por 6s + alerta sonoro + contador no topo.
4. Pedido aceito -> move para "Preparo" sem sair da tela.
5. Pedido concluido -> vira "Entregue" e impacta totais do caixa.
6. Fechamento -> modal com conferencia e justificativa obrigatoria se divergencia >= limite.

### 11.5 Estados de interface obrigatorios

1. Estado vazio de pedidos:

- Texto: "Nenhum pedido no momento" + CTA "Registrar venda de balcao".

2. Estado critico:

- Caixa aberto sem movimento por X horas.
- Divergencia acima do limite em destaque vermelho.

3. Estado offline/degradado:

- Exibir banner "Conexao instavel".
- Permitir refresh manual da fila.

### 11.6 Regras de usabilidade

1. Nunca esconder o status da sessao de caixa.
2. Nunca exigir troca de rota para a acao principal do turno.
3. Confirmacoes so para acoes irreversiveis:

- cancelar pedido
- fechar caixa

4. Inputs monetarios sempre com mascara e preview numerico.
5. Cores sem ambiguidades:

- verde: confirmado
- amarelo: atencao
- vermelho: bloqueio/erro

### 11.7 Atalhos operacionais sugeridos

1. F2: foco em "Pedidos Novos".
2. F4: abrir modal de venda de balcao.
3. F8: abrir modal de fechamento.
4. Ctrl + R: recarregar fila de pedidos.

### 11.8 Critereos de aceitacao de UX

1. Operador novo consegue completar turno guiado em ate 10 minutos de treinamento.
2. Fluxo abrir -> operar -> fechar sem sair da rota /admin/operacao.
3. Tempo medio para aceitar pedido novo menor que no layout anterior.
4. Reducao de erros de fechamento por campos nao preenchidos.

## 12) Pedidos anteriores a abertura do caixa

### 12.1 Problema identificado

Pedidos online criados antes da abertura da sessao de caixa sao contabilizados
pelo criterio `createdAt >= openedAt`. Isso significa que um pedido feito as 08:45
e entregue depois da abertura das 09:00 nao entra nos totais da sessao.

Cenario real de perda de rastreabilidade:

```
08:45 - Pedido #501 (R$ 45,00) criado por cliente online
09:00 - Operador abre o caixa
09:05 - Operador aceita e entrega o pedido #501
09:30 - Caixa fechado com faturamento R$ 0,00 (incorreto)
```

### 12.2 Solucao implementada

Campo `countFromDate` adicionado ao modelo `CashSession`.

- Quando nulo: comportamento original (usa `openedAt`)
- Quando definido: todas as queries financeiras partem deste timestamp

Fluxo:

1. Operador clica em Abrir Caixa
2. Backend cria a sessao e retorna lista de pedidos PENDING/PREPARING anteriores
3. Se existirem pedidos anteriores, o sistema automaticamente chama o endpoint
   de count-from usando o timestamp do pedido mais antigo (sem intervencao do operador)
4. Modal informativo exibe os pedidos incluidos e o total agregado
5. Operador clica "Entendido" — sem opcao de ignorar ou recusar

### 12.3 Endpoints novos

- `PATCH /api/cashier/sessions/:id/count-from`
  - Body: `{ countFromDate: ISO_DATE_STRING }`
  - Permissao: SUPER_ADMIN, OWNER, MANAGER
  - Valida que a data e anterior ao `openedAt`
  - Registra na auditoria

### 12.4 Impacto

- Todos os totais (GET /api/cashier/session, close, relatorio) usam `countFromDate ?? openedAt`
- Retrocompativel: sessoes existentes nao tem countFromDate, funcionam como antes
- Auditado: acao registrada no AuditLog com o timestamp escolhido
