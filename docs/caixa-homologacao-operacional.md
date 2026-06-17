# Roteiro de Homologacao Operacional - Caixa

## Objetivo

Validar o modulo de caixa em fluxo real de operacao, cobrindo regras de negocio, seguranca operacional, auditoria e impressao.

## Escopo

- Abertura de caixa
- Movimentos (suprimento, sangria, ajuste)
- Venda direta (dinheiro, PIX, cartao)
- Fechamento com divergencia
- Historico e filtros
- Impressao e auditoria
- Permissoes por perfil
- Concorrencia na abertura

## Pre-condicoes

- API e front-end rodando com banco atualizado
- Migration aplicada ate `20260617123000_enforce_single_open_cash_session`
- Usuarios de teste ativos:
  - OWNER
  - MANAGER
  - EMPLOYEE
- Produtos ativos cadastrados (com e sem controle de estoque)
- Threshold de divergencia conhecido em settings (`cashDifferenceNoteThreshold`)

## Matriz de Permissoes (esperado)

- OWNER: pode abrir, fechar, movimentar, venda direta, consultar historico e relatorio
- MANAGER: pode abrir, fechar, movimentar, venda direta, consultar historico e relatorio
- EMPLOYEE: pode movimentar, venda direta, consultar historico e relatorio; nao pode abrir/fechar

## Casos de Teste

### CT-01 - Abrir caixa exige valor > 0

Passos:

1. Ir para tela Caixa sem sessao aberta.
2. Tentar abrir com campo vazio.
3. Tentar abrir com 0,00.
4. Abrir com valor valido (ex.: 100,00).

Resultado esperado:

- Campo vazio/0,00: bloqueio no front e erro no back.
- Valor valido: sessao aberta com sucesso.

### CT-02 - Concorrencia: impedir dupla abertura

Passos:

1. Abrir duas abas com usuario autorizado.
2. Em ambas, preencher valor valido.
3. Disparar abertura quase simultanea.

Resultado esperado:

- Apenas uma abertura com sucesso.
- Segunda tentativa retorna conflito (409) informando sessao ja aberta.

### CT-03 - Permissao: EMPLOYEE nao abre/fecha

Passos:

1. Login como EMPLOYEE.
2. Tentar abrir caixa.
3. Com sessao aberta por outro perfil, tentar fechar caixa.

Resultado esperado:

- API retorna 403 para abrir e fechar.
- Operacoes permitidas para EMPLOYEE continuam funcionando.

### CT-04 - Movimento: valor obrigatorio > 0

Passos:

1. Com sessao aberta, tentar registrar movimento com valor vazio/0.
2. Registrar suprimento com valor valido.

Resultado esperado:

- Valor invalido bloqueado.
- Valor valido registrado com sucesso.

### CT-05 - Movimento: motivo obrigatorio para sangria/ajuste

Passos:

1. Selecionar tipo SANGRIA e deixar motivo vazio.
2. Selecionar tipo AJUSTE e deixar motivo vazio.
3. Repetir ambos com motivo preenchido.

Resultado esperado:

- Sem motivo: bloqueio front e erro 400 no back.
- Com motivo: registro concluido.

### CT-06 - Venda direta: validacoes financeiras

Passos:

1. Tentar registrar venda sem itens.
2. Em dinheiro, informar valor recebido menor que total.
3. Em dinheiro, informar valor recebido igual/maior que total.
4. Registrar venda em PIX.
5. Registrar venda em cartao.

Resultado esperado:

- Sem itens: bloqueio.
- Dinheiro abaixo do total: bloqueio.
- Dinheiro valido: venda concluida com troco correto.
- PIX/cartao: venda concluida.

### CT-07 - Venda direta com estoque

Passos:

1. Selecionar produto com `trackStock=true` e estoque limitado.
2. Vender quantidade dentro do estoque.
3. Tentar vender acima do estoque.

Resultado esperado:

- Dentro do estoque: sucesso e decremento do saldo.
- Acima do estoque: erro de estoque insuficiente.

### CT-08 - Fechamento sem divergencia

Passos:

1. Informar valor de fechamento igual ao esperado.
2. Fechar caixa.

Resultado esperado:

- Fechamento com sucesso sem exigir justificativa.

### CT-09 - Fechamento com divergencia relevante

Passos:

1. Informar valor com divergencia >= threshold.
2. Tentar fechar sem justificativa.
3. Fechar com justificativa preenchida.

Resultado esperado:

- Sem justificativa: bloqueio front/back.
- Com justificativa: fechamento concluido.

### CT-10 - Historico e filtros

Passos:

1. Validar listagem de sessoes.
2. Filtrar por status, operador e periodo.
3. Trocar pagina.

Resultado esperado:

- Filtros e pagina retornam dados corretos.

### CT-11 - Impressao de fechamento

Passos:

1. No historico, acionar impressao de uma sessao fechada.
2. Gerar em modo termico.
3. Gerar em modo A4.

Resultado esperado:

- Ambos os formatos imprimem resumo financeiro e movimentos.
- Relatorio contem bloco de assinatura do operador.
- A4 contem bloco de conferencia de gerencia.

### CT-12 - Auditoria de eventos criticos

Passos:

1. Executar abertura, movimento, venda direta, fechamento e impressao.
2. Consultar trilha de auditoria no painel.

Resultado esperado:

- Eventos aparecem com acao, ator e horario.
- Impressao aparece com tipo e formato.

## Criterio de Aprovacao

- Todos os CT-01 a CT-12 aprovados
- Nenhum erro 500 nos fluxos homologados
- Sem inconsistencias de saldo esperado x movimentos x vendas em dinheiro

## Evidencias Recomendadas

- Captura da tela de cada CT
- IDs de sessao de caixa testadas
- Log de auditoria dos eventos
- Registro do perfil executante (OWNER/MANAGER/EMPLOYEE)

## Registro de Execucao (template)

- Data:
- Ambiente:
- Responsavel:
- CT aprovados:
- CT com falha:
- Observacoes:
- Acao corretiva:
