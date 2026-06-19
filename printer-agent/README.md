# Printer Agent 80mm

Agente local para consumir jobs de impressão térmica do Food System.

## MVP atual

- Suporte funcional a impressora de rede via TCP/IP (`NETWORK`)
- Suporte funcional a impressora USB por `Vendor ID` e `Product ID`
- Polling no backend usando `x-printer-token`
- Renderização textual ESC/POS para:
  - `ORDER_TICKET`
  - `CASH_CLOSING_REPORT`
  - `TEST_TICKET`

## Uso

### Instalação na máquina da loja

1. Entre na pasta do agente.

```bash
cd printer-agent
```

2. Instale as dependências.

```bash
npm install
```

3. Crie o arquivo de configuração.

```bash
copy .env.example .env
```

4. Preencha o `.env` com os dados reais.

```env
BACKEND_URL=http://SEU_BACKEND
PRINTER_TOKEN=TOKEN_COPIADO_DO_PAINEL
OUTPUT_MODE=printer
```

5. Teste a configuração.

```bash
npm run doctor
```

6. Compile e inicie o agente.

```bash
npm run build
npm start
```

### Se a impressora for USB

1. Rode o diagnóstico de USB.

```bash
npm run list-usb
```

2. Pegue o `vendor` e o `product` do dispositivo correto.
3. Preencha `Vendor ID` e `Product ID` no painel de configuração da impressora 80mm.

### Se quiser homologar sem impressora

Use o modo arquivo para validar o fluxo antes do equipamento chegar.

```bash
OUTPUT_MODE=file npm start
```

O cupom será salvo em `.txt` na pasta definida por `OUTPUT_DIR`.

## Homologação sem impressora

Se você ainda não tem a impressora física, pode mandar o agente salvar o cupom em arquivo texto:

```bash
OUTPUT_MODE=file npm start
```

Ou configure no `.env`:

```env
OUTPUT_MODE=file
OUTPUT_DIR=./output
```

Cada job será salvo como `.txt` dentro da pasta configurada, o que permite validar layout, conteúdo e fluxo completo sem hardware.

## Diagnóstico USB

Para listar rapidamente os dispositivos USB detectados na máquina local:

```bash
npm run list-usb
```

Use o `vendor` e `product` exibidos para preencher `Vendor ID` e `Product ID` no painel.

## Variáveis

- `BACKEND_URL`: URL do backend sem `/api` no final
- `PRINTER_TOKEN`: token copiado do painel Admin > Configurações > Impressora 80mm
- `POLL_INTERVAL_MS`: intervalo entre consultas
- `REQUEST_TIMEOUT_MS`: timeout HTTP do agente
- `USB_INTERFACE_NUMBER`: interface USB usada para envio bruto, padrão `0`
- `OUTPUT_MODE`: `printer` para imprimir de verdade ou `file` para salvar o cupom em `.txt`
- `OUTPUT_DIR`: diretório onde os arquivos `.txt` serão gerados quando `OUTPUT_MODE=file`

## Fluxo

1. Busca `GET /api/print/agent/jobs/next`
2. Imprime localmente
3. Confirma sucesso em `POST /api/print/agent/jobs/:id/complete`
4. Ou registra falha em `POST /api/print/agent/jobs/:id/fail`

## Observações USB

- No Windows, a impressora pode precisar de driver/libusb compatível para acesso raw.
- No Linux, pode ser necessário rodar com permissões adequadas ou udev rules.
- O agente usa a primeira interface/endpoint de saída disponível, ou a interface definida em `USB_INTERFACE_NUMBER`.
