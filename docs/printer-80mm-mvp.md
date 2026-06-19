# Impressora 80mm MVP

## Como funciona

1. O painel admin salva a impressora da loja em Configuracoes.
2. O backend cria jobs em `print_jobs` para pedidos/testes/impressos termicos.
3. Um agente local na loja consulta `GET /api/print/agent/jobs/next` com o header `x-printer-token`.
4. Quando houver job, o agente imprime na termica via ESC/POS.
5. O agente confirma o resultado em:
   - `POST /api/print/agent/jobs/:id/complete`
   - `POST /api/print/agent/jobs/:id/fail`

## Endpoints do painel

- `GET /api/print/settings`
- `PUT /api/print/settings`
- `POST /api/print/settings/test`
- `GET /api/print/jobs`

## Header do agente local

- `x-printer-token: TOKEN_DA_IMPRESSORA`

## Exemplo de payload de falha

```json
{
  "errorMessage": "Nao foi possivel conectar na impressora 192.168.0.100:9100"
}
```

## Agente local sugerido

Tecnologia recomendada para MVP:

- Node.js
- Biblioteca ESC/POS compatível com USB e rede
- Polling a cada 2-5 segundos

## Fluxo recomendado de deploy

1. Configurar a impressora no painel.
2. Copiar o token do agente.
3. Rodar o agente local na maquina da loja.
4. Testar via botao `Testar Impressao`.
5. Validar se o job muda para `COMPLETED`.

## Observacoes

- A VPS nao imprime diretamente na loja.
- O agente local e obrigatorio para USB e geralmente tambem para rede local.
- O sistema atual enfileira jobs termicos quando a UI registra `print-events` com `THERMAL`.
