import 'dotenv/config';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { usb, type Device, type Interface, type OutEndpoint } from 'usb';

type ConnectionType = 'NETWORK' | 'USB';

type PrinterInfo = {
  id: number;
  name: string;
  connectionType: ConnectionType;
  ipAddress: string | null;
  port: number | null;
  usbVendorId: string | null;
  usbProductId: string | null;
  paperWidthMm: number;
};

type PrintJob = {
  id: number;
  subjectType: string;
  subjectId: number | null;
  template: 'ORDER_TICKET' | 'CASH_CLOSING_REPORT' | 'TEST_TICKET';
  printMode: 'THERMAL' | 'A4';
  status: string;
  copies: number;
  payload: any;
};

type NextJobResponse = {
  printer: PrinterInfo;
  job: PrintJob;
};

const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/$/, '');
const PRINTER_TOKEN = process.env.PRINTER_TOKEN || '';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 3000);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 10000);
const USB_INTERFACE_NUMBER = Number(process.env.USB_INTERFACE_NUMBER || 0);
const SHOULD_LIST_USB = process.argv.includes('--list-usb');
const SHOULD_RUN_DOCTOR = process.argv.includes('--doctor');
const OUTPUT_MODE = (process.env.OUTPUT_MODE || 'printer').trim().toLowerCase();
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';

if (!SHOULD_LIST_USB && !SHOULD_RUN_DOCTOR && !BACKEND_URL) {
  throw new Error('BACKEND_URL nao configurado no .env do printer-agent.');
}

if (!SHOULD_LIST_USB && !SHOULD_RUN_DOCTOR && !PRINTER_TOKEN) {
  throw new Error('PRINTER_TOKEN nao configurado no .env do printer-agent.');
}

let isStopping = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripAccents(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\n]/g, '');
}

function formatUsbHex(value: number | undefined) {
  if (typeof value !== 'number') return '----';
  return value.toString(16).padStart(4, '0');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

function formatCnpj(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 14) return value || '';
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function widthForPrinter(paperWidthMm: number) {
  return paperWidthMm >= 80 ? 48 : 32;
}

function separator(width: number) {
  return '-'.repeat(width);
}

function center(text: string, width: number) {
  const clean = stripAccents(text).slice(0, width);
  const left = Math.max(0, Math.floor((width - clean.length) / 2));
  return `${' '.repeat(left)}${clean}`;
}

function twoCols(left: string, right: string, width: number) {
  const leftClean = stripAccents(left);
  const rightClean = stripAccents(right);
  const available = Math.max(1, width - rightClean.length - 1);
  const leftCut = leftClean.length > available ? `${leftClean.slice(0, Math.max(0, available - 1))}…` : leftClean;
  return `${leftCut}${' '.repeat(Math.max(1, width - leftCut.length - rightClean.length))}${rightClean}`;
}

function wrapText(text: string, width: number) {
  const words = stripAccents(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    const next = `${current} ${word}`;
    if (next.length <= width) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function isPaidTicket(payload: any) {
  return String(payload?.paymentStatusLabel || '').toUpperCase() === 'PAGO';
}

function renderOrderTicket(payload: any, width: number) {
  const lines: string[] = [];
  lines.push(center(payload?.restaurant?.name || 'FOOD SYSTEM', width));
  if (payload?.restaurant?.corporateName) lines.push(center(String(payload.restaurant.corporateName), width));
  if (payload?.restaurant?.cnpj) lines.push(center(`CNPJ ${formatCnpj(payload.restaurant.cnpj)}`, width));
  if (payload?.restaurant?.phone) lines.push(center(String(payload.restaurant.phone), width));
  lines.push(separator(width));
  lines.push(center(`PEDIDO #${payload?.orderId || '-'}`, width));
  lines.push(stripAccents(new Date(payload?.createdAt || Date.now()).toLocaleString('pt-BR')));
  lines.push(separator(width));
  lines.push('RESUMO DO PEDIDO');
  lines.push(`Cliente: ${stripAccents(payload?.customerName || 'Cliente')}`);
  if (payload?.phone) lines.push(`Fone: ${stripAccents(String(payload.phone))}`);
  lines.push(`Status pedido: ${stripAccents(String(payload?.status || '-'))}`);
  lines.push(`Financeiro: ${stripAccents(String(payload?.paymentStatusLabel || '-'))}`);
  lines.push(`Pagamento: ${stripAccents(String(payload?.paymentLabel || payload?.paymentMethod || '-'))}`);
  if (payload?.cpf) lines.push(`CPF: ${stripAccents(String(payload.cpf))}`);
  if (payload?.changeFor) lines.push(`Troco para: ${stripAccents(String(payload.changeFor))}`);
  lines.push(separator(width));

  lines.push(isPaidTicket(payload) ? 'ENTREGA LIBERADA: SIM' : 'ENTREGA LIBERADA: COBRAR/PENDENTE');
  lines.push(`Entrega: ${stripAccents(String(payload?.addressLabel || 'Nao informado'))}`);
  for (const addressLine of asArray(payload?.addressLines)) {
    if (stripAccents(String(addressLine)).toUpperCase() === stripAccents(String(payload?.addressLabel || '')).toUpperCase()) continue;
    for (const line of wrapText(String(addressLine), width)) lines.push(line);
  }
  if (payload?.notes) {
    lines.push(separator(width));
    lines.push('OBSERVACOES DO PEDIDO');
    for (const line of wrapText(String(payload.notes), width)) lines.push(line);
  }
  lines.push(separator(width));
  lines.push('ITENS PARA PRODUCAO');
  lines.push(separator(width));

  for (const item of asArray(payload?.items)) {
    lines.push(`${item.quantity}x ${stripAccents(String(item.name || 'Item'))}`);

    if (item.variation) {
      for (const line of wrapText(`Tamanho/variacao: ${item.variation}`, width - 2)) lines.push(`  ${line}`);
    }

    for (const guided of asArray(item.guidedAssemblySelections)) {
      for (const line of wrapText(`Montagem: ${guided}`, width - 2)) lines.push(`  ${line}`);
    }

    for (const addon of asArray(item.addons)) {
      for (const line of wrapText(`Adicionar: ${addon}`, width - 2)) lines.push(`  ${line}`);
    }

    for (const removal of asArray(item.removals)) {
      for (const line of wrapText(`Remover: ${removal}`, width - 2)) lines.push(`  ${line}`);
    }

    if (item.observations) {
      for (const line of wrapText(`Obs item: ${item.observations}`, width - 2)) lines.push(`  ${line}`);
    }

    lines.push(stripAccents(`  Total item: ${formatCurrency(Number(item.totalPrice || 0))}`));
    lines.push(separator(width));
  }

  lines.push(twoCols('Subtotal', formatCurrency(Number(payload?.totals?.subtotal || 0)), width));
  lines.push(twoCols('Taxa entrega', formatCurrency(Number(payload?.totals?.deliveryFee || 0)), width));
  lines.push(twoCols('TOTAL', formatCurrency(Number(payload?.totals?.total || 0)), width));
  lines.push(separator(width));
  lines.push(center('Food System 80mm', width));
  return lines;
}

function renderCashClosingReport(payload: any, width: number) {
  const lines: string[] = [];
  lines.push(center(payload?.restaurant?.name || 'FOOD SYSTEM', width));
  if (payload?.restaurant?.corporateName) lines.push(center(String(payload.restaurant.corporateName), width));
  if (payload?.restaurant?.cnpj) lines.push(center(`CNPJ ${formatCnpj(payload.restaurant.cnpj)}`, width));
  lines.push(center(`FECHAMENTO CAIXA #${payload?.session?.id || '-'}`, width));
  lines.push(separator(width));
  lines.push(`Status: ${stripAccents(String(payload?.session?.status || '-'))}`);
  lines.push(`Abertura: ${stripAccents(new Date(payload?.session?.openedAt || Date.now()).toLocaleString('pt-BR'))}`);
  if (payload?.session?.closedAt) lines.push(`Fechamento: ${stripAccents(new Date(payload.session.closedAt).toLocaleString('pt-BR'))}`);
  if (payload?.session?.openedBy?.name) lines.push(`Aberto por: ${stripAccents(payload.session.openedBy.name)}`);
  if (payload?.session?.closedBy?.name) lines.push(`Fechado por: ${stripAccents(payload.session.closedBy.name)}`);
  lines.push(separator(width));
  lines.push(twoCols('Abertura', formatCurrency(Number(payload?.session?.openingAmount || 0)), width));
  lines.push(twoCols('Suprimentos', formatCurrency(Number(payload?.totals?.supplies || 0)), width));
  lines.push(twoCols('Sangrias', formatCurrency(Number(payload?.totals?.withdrawals || 0)), width));
  lines.push(twoCols('Ajustes', formatCurrency(Number(payload?.totals?.adjustments || 0)), width));
  lines.push(twoCols('Vendas caixa', formatCurrency(Number(payload?.totals?.cashSales || 0)), width));
  lines.push(twoCols('Esperado', formatCurrency(Number(payload?.totals?.expectedAmount || 0)), width));
  lines.push(twoCols('Informado', formatCurrency(Number(payload?.session?.closingAmount || 0)), width));
  lines.push(twoCols('Diferenca', formatCurrency(Number(payload?.totals?.differenceAmount || 0)), width));
  lines.push(separator(width));
  lines.push('Vendas por pagamento');
  for (const entry of asArray(payload?.totals?.salesByPayment)) {
    lines.push(twoCols(String(entry.method || '-'), formatCurrency(Number(entry.total || 0)), width));
  }
  if (asArray(payload?.movements).length > 0) {
    lines.push(separator(width));
    lines.push('Movimentos');
    for (const movement of asArray(payload.movements).slice(0, 12)) {
      lines.push(twoCols(String(movement.type || '-'), formatCurrency(Number(movement.amount || 0)), width));
      if (movement.reason) {
        for (const line of wrapText(String(movement.reason), width - 2)) lines.push(`  ${line}`);
      }
    }
  }
  lines.push(separator(width));
  return lines;
}

function renderTestTicket(payload: any, width: number) {
  const lines: string[] = [];
  lines.push(center(payload?.storeName || 'FOOD SYSTEM', width));
  lines.push(center(payload?.title || 'TESTE DE IMPRESSAO', width));
  lines.push(separator(width));
  if (payload?.printerName) lines.push(`Impressora: ${stripAccents(String(payload.printerName))}`);
  if (payload?.generatedAt) lines.push(stripAccents(new Date(payload.generatedAt).toLocaleString('pt-BR')));
  lines.push('');
  for (const line of wrapText(String(payload?.message || 'Teste concluido.'), width)) lines.push(line);
  lines.push(separator(width));
  return lines;
}

function buildPrintableLines(job: PrintJob, printer: PrinterInfo) {
  const width = widthForPrinter(printer.paperWidthMm);
  const payload = job.payload || {};

  switch (job.template) {
    case 'ORDER_TICKET':
      return renderOrderTicket(payload, width);
    case 'CASH_CLOSING_REPORT':
      return renderCashClosingReport(payload, width);
    case 'TEST_TICKET':
    default:
      return renderTestTicket(payload, width);
  }
}

function buildEscPosBuffer(job: PrintJob, printer: PrinterInfo) {
  const lines = buildPrintableLines(job, printer);
  const text = `${lines.join('\n')}\n\n\n`;
  const init = Buffer.from([0x1b, 0x40]);
  const cut = Buffer.from([0x1d, 0x56, 0x00]);
  return Buffer.concat([init, Buffer.from(stripAccents(text), 'ascii'), cut]);
}

async function saveJobAsText(printer: PrinterInfo, job: PrintJob) {
  const lines = buildPrintableLines(job, printer);
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTemplate = job.template.toLowerCase();
  const fileName = `${now}-job-${job.id}-${safeTemplate}.txt`;
  const outputPath = path.resolve(process.cwd(), OUTPUT_DIR, fileName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const content = `${lines.join('\n')}\n`;
  await fs.writeFile(outputPath, content, 'utf8');
  return outputPath;
}

async function request<T>(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-printer-token': PRINTER_TOKEN,
        ...(init?.headers || {}),
      },
    });

    if (response.status === 204) {
      return null as T;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

type DoctorCheckResult = {
  label: string;
  ok: boolean;
  detail: string;
};

function doctorPrinterInfo(): PrinterInfo {
  return {
    id: 0,
    name: 'Diagnostico local',
    connectionType: 'NETWORK',
    ipAddress: '127.0.0.1',
    port: 9100,
    usbVendorId: null,
    usbProductId: null,
    paperWidthMm: 80,
  };
}

function doctorPrintJob(): PrintJob {
  return {
    id: 0,
    subjectType: 'DIAGNOSTIC',
    subjectId: null,
    template: 'TEST_TICKET',
    printMode: 'THERMAL',
    status: 'PENDING',
    copies: 1,
    payload: {
      storeName: 'FOOD SYSTEM',
      title: 'DIAGNOSTICO DO AGENTE',
      printerName: 'Preview local',
      generatedAt: new Date().toISOString(),
      message: 'Este cupom confirma que o agente conseguiu renderizar e salvar uma saida local sem precisar da impressora fisica.',
    },
  };
}

async function runDoctor() {
  const checks: DoctorCheckResult[] = [];

  if (!BACKEND_URL) {
    checks.push({ label: 'Backend acessivel', ok: false, detail: 'BACKEND_URL nao configurado.' });
    checks.push({ label: 'Token valido', ok: false, detail: 'Nao validado porque o backend nao foi configurado.' });
  } else {
    try {
      const response = await fetchWithTimeout(`${BACKEND_URL}/api/print/agent/jobs/next`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-printer-token': PRINTER_TOKEN,
        },
      });

      if (response.status === 200 || response.status === 204) {
        checks.push({ label: 'Backend acessivel', ok: true, detail: `${BACKEND_URL} respondeu com HTTP ${response.status}.` });
      } else {
        checks.push({ label: 'Backend acessivel', ok: false, detail: `${BACKEND_URL} respondeu com HTTP ${response.status}.` });
      }

      if (!PRINTER_TOKEN) {
        checks.push({ label: 'Token valido', ok: false, detail: 'PRINTER_TOKEN nao configurado.' });
      } else if (response.status === 401 || response.status === 403) {
        checks.push({ label: 'Token valido', ok: false, detail: `Token recusado pelo backend com HTTP ${response.status}.` });
      } else if (response.status === 200 || response.status === 204) {
        checks.push({ label: 'Token valido', ok: true, detail: 'Token aceito pelo endpoint do agente.' });
      } else {
        checks.push({ label: 'Token valido', ok: false, detail: `Nao foi possivel confirmar o token. HTTP ${response.status}.` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida';
      checks.push({ label: 'Backend acessivel', ok: false, detail: message });
      checks.push({ label: 'Token valido', ok: false, detail: 'Nao validado porque o backend nao respondeu.' });
    }
  }

  try {
    const outputPath = path.resolve(process.cwd(), OUTPUT_DIR, '.doctor-write-test.tmp');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, 'doctor ok\n', 'utf8');
    await fs.unlink(outputPath);
    checks.push({ label: 'Diretorio de saida', ok: true, detail: path.resolve(process.cwd(), OUTPUT_DIR) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida';
    checks.push({ label: 'Diretorio de saida', ok: false, detail: message });
  }

  if (OUTPUT_MODE === 'file') {
    checks.push({ label: 'Modo de saida', ok: true, detail: 'OUTPUT_MODE=file ativo para homologacao sem hardware.' });
  } else if (OUTPUT_MODE === 'printer') {
    checks.push({
      label: 'Configuracao de impressao',
      ok: true,
      detail: 'OUTPUT_MODE=printer ativo. A impressora final sera determinada pela configuracao vinda do backend.',
    });
  } else {
    checks.push({ label: 'Modo de saida', ok: false, detail: `OUTPUT_MODE invalido: ${OUTPUT_MODE}` });
  }

  try {
    const diagnosticPath = await saveJobAsText(doctorPrinterInfo(), doctorPrintJob());
    checks.push({ label: 'Cupom de diagnostico', ok: true, detail: diagnosticPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida';
    checks.push({ label: 'Cupom de diagnostico', ok: false, detail: message });
  }

  if (OUTPUT_MODE === 'printer') {
    const devices = usb.getDeviceList();
    checks.push({
      label: 'Dispositivos USB locais',
      ok: devices.length > 0,
      detail: devices.length > 0 ? `${devices.length} dispositivo(s) USB detectado(s).` : 'Nenhum dispositivo USB detectado.',
    });
  }

  console.log('[printer-agent] Resultado do doctor:');
  for (const check of checks) {
    console.log(`- ${check.ok ? 'OK' : 'FALHA'} | ${check.label}: ${check.detail}`);
  }

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

async function sendToNetworkPrinter(printer: PrinterInfo, buffer: Buffer, copies: number) {
  if (!printer.ipAddress || !printer.port) {
    throw new Error('Impressora de rede sem IP/porta configurados.');
  }

  for (let index = 0; index < Math.max(1, copies); index += 1) {
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host: printer.ipAddress!, port: printer.port! }, () => {
        socket.write(buffer);
        socket.end();
      });

      socket.setTimeout(REQUEST_TIMEOUT_MS);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Timeout ao conectar na impressora ${printer.ipAddress}:${printer.port}`));
      });
      socket.on('error', reject);
      socket.on('close', (hadError) => {
        if (!hadError) resolve();
      });
    });
  }
}

function parseUsbHexId(value: string | null, label: string) {
  if (!value) {
    throw new Error(`${label} nao configurado para impressora USB.`);
  }

  const normalized = value.trim().toLowerCase().replace(/^0x/, '');
  const parsed = Number.parseInt(normalized, 16);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} invalido para impressora USB: ${value}`);
  }

  return parsed;
}

function closeUsbDeviceSafe(device: Device, usbInterface?: Interface | null) {
  try {
    if (usbInterface?.isKernelDriverActive?.()) {
      try {
        usbInterface.release(true, () => undefined);
      } catch {
        // noop
      }
    } else if (usbInterface) {
      try {
        usbInterface.release(true, () => undefined);
      } catch {
        // noop
      }
    }
  } catch {
    // noop
  }

  try {
    device.close();
  } catch {
    // noop
  }
}

function getUsbPrinterEndpoint(device: Device) {
  const interfaces = device.interfaces || [];
  const chosenInterface = interfaces.find((entry) => entry.interfaceNumber === USB_INTERFACE_NUMBER) || interfaces[0];
  if (!chosenInterface) {
    throw new Error('Nenhuma interface USB encontrada para a impressora.');
  }

  try {
    if (chosenInterface.isKernelDriverActive()) {
      chosenInterface.detachKernelDriver();
    }
  } catch {
    // alguns sistemas/drivers nao suportam essa operacao
  }

  chosenInterface.claim();
  const endpoint = chosenInterface.endpoints.find((entry): entry is OutEndpoint => entry.direction === 'out') as OutEndpoint | undefined;
  if (!endpoint) {
    throw new Error('Nenhum endpoint de saida encontrado para a impressora USB.');
  }

  return { chosenInterface, endpoint };
}

async function sendToUsbPrinter(printer: PrinterInfo, buffer: Buffer, copies: number) {
  const vendorId = parseUsbHexId(printer.usbVendorId, 'Vendor ID');
  const productId = parseUsbHexId(printer.usbProductId, 'Product ID');
  const device = usb.getDeviceList().find((entry) => {
    const descriptor = entry.deviceDescriptor;
    return descriptor.idVendor === vendorId && descriptor.idProduct === productId;
  });

  if (!device) {
    throw new Error(`Impressora USB ${printer.usbVendorId}/${printer.usbProductId} nao encontrada neste computador.`);
  }

  let chosenInterface: Interface | null = null;

  try {
    device.open();
    const setup = getUsbPrinterEndpoint(device);
    chosenInterface = setup.chosenInterface;

    for (let index = 0; index < Math.max(1, copies); index += 1) {
      await new Promise<void>((resolve, reject) => {
        setup.endpoint.transfer(buffer, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  } finally {
    closeUsbDeviceSafe(device, chosenInterface);
  }
}

function listUsbDevices() {
  const devices = usb.getDeviceList();

  if (devices.length === 0) {
    console.log('[printer-agent] Nenhum dispositivo USB detectado.');
    return;
  }

  console.log(`[printer-agent] ${devices.length} dispositivo(s) USB detectado(s):`);
  for (const device of devices) {
    const descriptor = device.deviceDescriptor;
    const interfaceNumbers = (device.interfaces || []).map((entry) => entry.interfaceNumber).join(', ');
    console.log(
      [
        `- vendor=${formatUsbHex(descriptor.idVendor)}`,
        `product=${formatUsbHex(descriptor.idProduct)}`,
        `interfaces=[${interfaceNumbers || '-'}]`,
      ].join(' ')
    );
  }
}

async function markComplete(jobId: number) {
  await request(`/api/print/agent/jobs/${jobId}/complete`, { method: 'POST', body: JSON.stringify({}) });
}

async function markFailed(jobId: number, errorMessage: string) {
  await request(`/api/print/agent/jobs/${jobId}/fail`, {
    method: 'POST',
    body: JSON.stringify({ errorMessage: errorMessage.slice(0, 500) }),
  });
}

async function processJob(data: NextJobResponse) {
  const { printer, job } = data;
  console.log(`[printer-agent] Processando job #${job.id} (${job.template}) em ${printer.name}`);

  if (OUTPUT_MODE === 'file') {
    const outputPath = await saveJobAsText(printer, job);
    console.log(`[printer-agent] Job #${job.id} salvo em arquivo: ${outputPath}`);
    return;
  }

  const buffer = buildEscPosBuffer(job, printer);

  if (printer.connectionType === 'USB') {
    await sendToUsbPrinter(printer, buffer, job.copies || 1);
    return;
  }

  await sendToNetworkPrinter(printer, buffer, job.copies || 1);
}

async function pollOnce() {
  const data = await request<NextJobResponse | null>('/api/print/agent/jobs/next');
  if (!data?.job) {
    return;
  }

  try {
    await processJob(data);
    await markComplete(data.job.id);
    console.log(`[printer-agent] Job #${data.job.id} concluido com sucesso.`);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida na impressao';
    console.error(`[printer-agent] Falha no job #${data.job.id}: ${message}`);
    await markFailed(data.job.id, message).catch((markError) => {
      console.error('[printer-agent] Nao foi possivel registrar falha no backend:', markError);
    });
  }
}

async function main() {
  if (SHOULD_LIST_USB) {
    listUsbDevices();
    return;
  }

  if (SHOULD_RUN_DOCTOR) {
    await runDoctor();
    return;
  }

  console.log('[printer-agent] Iniciando agente local de impressao...');
  console.log(`[printer-agent] Backend: ${BACKEND_URL}`);
  console.log(`[printer-agent] Polling: ${POLL_INTERVAL_MS}ms`);

  while (!isStopping) {
    try {
      await pollOnce();
    } catch (error) {
      console.error('[printer-agent] Erro no polling:', error);
    }

    if (!isStopping) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.log('[printer-agent] Agente finalizado.');
}

process.on('SIGINT', () => {
  isStopping = true;
});

process.on('SIGTERM', () => {
  isStopping = true;
});

void main();