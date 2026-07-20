# Impressora 80mm (Guia Real de Instalacao e Operacao)

## Visao geral

Este fluxo imprime cupons termicos de pedidos e testes usando um agente local na loja.

1. O painel Admin salva os dados da impressora (rede ou USB) e gera um token do agente.
2. O backend enfileira jobs termicos (`print_jobs`).
3. O `printer-agent` rodando no computador da loja busca jobs com `x-printer-token`.
4. O agente imprime localmente via ESC/POS.
5. O agente confirma no backend com sucesso (`complete`) ou falha (`fail`).

Importante: a VPS nao imprime direto na impressora da loja. Quem imprime de fato e o agente local.

## Arquitetura do fluxo

1. Painel: `GET /api/print/settings`, `PUT /api/print/settings`, `POST /api/print/settings/test`, `GET /api/print/jobs`.
2. Agente: `GET /api/print/agent/jobs/next`.
3. Finalizacao do job: `POST /api/print/agent/jobs/:id/complete`.
4. Registro de erro: `POST /api/print/agent/jobs/:id/fail`.

Header usado pelo agente:

- `x-printer-token: TOKEN_DA_IMPRESSORA`

## Pre-requisitos para instalacao real

1. Computador Windows na loja (onde a impressora esta conectada).
2. Node.js LTS instalado.
3. Acesso de rede do computador da loja ate o backend (`BACKEND_URL`).
4. Impressora configurada no painel Admin (nome, tipo de conexao e parametros).
5. Token do agente copiado do painel de impressora.

## Passo a passo (Windows, recomendado)

### 1. Configurar a impressora no painel

1. Ir em Admin > Configuracoes > Impressora 80mm.
2. Informar tipo de conexao:

- `NETWORK`: preencher IP e porta (normalmente `9100`).
- `USB`: preencher Vendor ID e Product ID.

3. Salvar a configuracao.
4. Copiar o token do agente (mostrar token antes de copiar).

### 2. Preparar o printer-agent no computador da loja

Na pasta `printer-agent`:

```bash
npm install
copy .env.example .env
```

Preencher o `.env`:

```env
BACKEND_URL=https://SEU_BACKEND
PRINTER_TOKEN=TOKEN_COPIADO_DO_PAINEL
OUTPUT_MODE=printer
```

Notas:

1. `BACKEND_URL` deve ser a URL base sem `/api` no final.
2. `OUTPUT_MODE=printer` imprime no equipamento real.

### 3. Rodar diagnostico antes de instalar servico

```bash
npm run doctor
```

Esse comando valida:

1. Acesso ao backend.
2. Aceitacao do token.
3. Escrita em disco local.
4. Geracao de cupom de diagnostico.

### 4. Instalar como servico do Windows

Opcao mais simples (recomendada):

1. Dar duplo clique em `instalar-servico.bat`.
2. Aceitar o UAC (Administrador).
3. Aguardar instalar dependencias, build e servico.

Opcao terminal (Administrador):

```bash
npm run build
npm run install-service
```

### 5. Validar servico em execucao

```powershell
Get-Service FoodSystemPrinterAgent
```

Status esperado: `Running`.

Logs: pasta `printer-agent/daemon`.

### 6. Testar impressao real

1. No painel, clicar em "Testar Impressao".
2. Confirmar que o cupom foi impresso.
3. Confirmar em fila/jobs que o status foi para `COMPLETED`.

## Como funciona no dia a dia

1. Um pedido/evento termico gera job `PENDING`.
2. O agente faz polling (padrao: 3000 ms).
3. Ao pegar o job, backend marca `PROCESSING`.
4. Se imprimir corretamente: `COMPLETED`.
5. Se falhar: `FAILED` com mensagem de erro.

Exemplo de erro retornado pelo agente:

```json
{
  "errorMessage": "Nao foi possivel conectar na impressora 192.168.0.100:9100"
}
```

## Rede vs USB (resumo pratico)

### NETWORK

1. Mais simples para loja com LAN estavel.
2. Definir IP fixo na impressora para evitar quebra por DHCP.
3. Porta comum: `9100`.

### USB

1. Exige Vendor ID e Product ID corretos.
2. Descobrir IDs com:

```bash
npm run list-usb
```

3. Em alguns ambientes Windows pode exigir driver/libusb compativel para acesso raw.

## Operacao e suporte

1. Se reiniciar o computador, o servico sobe sozinho.
2. Se parar de imprimir, primeiro validar:

- servico `FoodSystemPrinterAgent` em `Running`.
- `BACKEND_URL` acessivel da loja.
- token ainda valido (se mudou impressora/token no painel, atualizar `.env` e reinstalar/reiniciar servico).

3. Para remover servico:

- `desinstalar-servico.bat` ou `npm run uninstall-service`.

## Homologacao sem impressora fisica

Para validar fluxo sem hardware:

```env
OUTPUT_MODE=file
OUTPUT_DIR=./output
```

Ou executar:

```bash
OUTPUT_MODE=file npm start
```

Os cupons serao gerados em `.txt` na pasta de saida.
