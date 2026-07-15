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

## Instalação na máquina da loja

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

## Rodando como Serviço do Windows (recomendado para lojas)

Deixar um terminal aberto o tempo todo não é uma opção realista numa loja — se alguém fechar a janela ou reiniciar o PC, a impressão para. Para isso, o agente pode ser instalado como um **Serviço do Windows**: roda em segundo plano, sem janela nem ícone visível, e inicia sozinho toda vez que o computador liga.

### Instalação (mais fácil — duplo clique)

1. Complete os passos 1 a 4 da seção acima (instale dependências e preencha o `.env`).
2. Dê duplo clique em **`instalar-servico.bat`**.
3. O Windows vai pedir permissão de Administrador (UAC) — clique em **Sim**.
4. O script instala as dependências, compila e registra o serviço automaticamente.

Pronto. O serviço `FoodSystemPrinterAgent` já está rodando e vai iniciar sozinho em todo boot do Windows. Não é preciso deixar nada aberto.

### Instalação (via terminal, para quem preferir)

```bash
npm install
npm run build
npm run install-service
```

> Precisa rodar o PowerShell/CMD **como Administrador** para instalar o serviço.

### Verificando se o serviço está rodando

Abra o **Gerenciador de Tarefas** → aba **Serviços**, ou rode no PowerShell:

```powershell
Get-Service FoodSystemPrinterAgent
```

Os logs do serviço ficam na pasta `daemon/` dentro de `printer-agent` (arquivos `.log` gerados pelo `node-windows`).

### Removendo o serviço

Dê duplo clique em **`desinstalar-servico.bat`**, ou rode:

```bash
npm run uninstall-service
```

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
