// Remove o Servico do Windows do Printer Agent.
// Uso: node uninstall-service.js  (ou npm run uninstall-service)
// Requer: rodar com permissao de Administrador.

const path = require('path');
const { Service } = require('node-windows');

if (process.platform !== 'win32') {
  console.error('[uninstall-service] Este script funciona apenas no Windows.');
  process.exit(1);
}

const svc = new Service({
  name: 'FoodSystemPrinterAgent',
  script: path.join(__dirname, 'dist', 'index.js'),
});

svc.on('uninstall', () => {
  console.log('[uninstall-service] Servico removido com sucesso.');
});

svc.on('error', (err) => {
  console.error('[uninstall-service] Erro ao remover o servico:', err);
});

console.log('[uninstall-service] Removendo servico "FoodSystemPrinterAgent"...');
svc.uninstall();
