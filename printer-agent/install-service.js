// Instala o Printer Agent como um Servico do Windows.
// Roda em segundo plano, sem janela/terminal visivel, e inicia sozinho
// toda vez que o Windows liga.
//
// Uso: node install-service.js  (ou npm run install-service)
// Requer: rodar com permissao de Administrador.

require('dotenv/config');
const path = require('path');
const { Service } = require('node-windows');

if (process.platform !== 'win32') {
  console.error('[install-service] Este instalador funciona apenas no Windows.');
  process.exit(1);
}

if (!process.env.BACKEND_URL || !process.env.PRINTER_TOKEN) {
  console.error('[install-service] ERRO: configure o arquivo .env (BACKEND_URL e PRINTER_TOKEN) antes de instalar o servico.');
  console.error('[install-service] Copie .env.example para .env e preencha os valores.');
  process.exit(1);
}

const svc = new Service({
  name: 'FoodSystemPrinterAgent',
  description: 'Agente local de impressao termica 80mm do Food System. Busca pedidos na fila e envia para a impressora da loja.',
  script: path.join(__dirname, 'dist', 'index.js'),
  nodeOptions: [],
  env: [
    { name: 'BACKEND_URL', value: process.env.BACKEND_URL },
    { name: 'PRINTER_TOKEN', value: process.env.PRINTER_TOKEN },
    { name: 'OUTPUT_MODE', value: process.env.OUTPUT_MODE || 'printer' },
    { name: 'OUTPUT_DIR', value: process.env.OUTPUT_DIR || './output' },
    { name: 'POLL_INTERVAL_MS', value: process.env.POLL_INTERVAL_MS || '3000' },
    { name: 'REQUEST_TIMEOUT_MS', value: process.env.REQUEST_TIMEOUT_MS || '10000' },
    { name: 'USB_INTERFACE_NUMBER', value: process.env.USB_INTERFACE_NUMBER || '0' },
  ],
});

svc.on('install', () => {
  console.log('[install-service] Servico instalado com sucesso. Iniciando...');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('[install-service] Servico ja estava instalado. Iniciando...');
  svc.start();
});

svc.on('start', () => {
  console.log('');
  console.log('========================================================');
  console.log(' Servico "FoodSystemPrinterAgent" esta rodando!');
  console.log(' Ele vai iniciar sozinho sempre que o Windows ligar.');
  console.log(' Nao precisa deixar nenhum terminal aberto.');
  console.log('========================================================');
});

svc.on('error', (err) => {
  console.error('[install-service] Erro ao instalar/iniciar o servico:', err);
});

console.log('[install-service] Instalando servico "FoodSystemPrinterAgent"...');
svc.install();
