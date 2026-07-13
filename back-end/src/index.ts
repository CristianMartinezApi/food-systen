import express from 'express';

import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { OrderStatus, PaymentMethod } from '@prisma/client';
import { prisma } from './lib/prisma';
import { tenantMiddleware, TenantRequest } from './middlewares/tenant.middleware';
import { authMiddleware, AuthRequest } from './middlewares/auth.middleware';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { getNextOpeningLabel, isRestaurantOpenNow, normalizeOperatingHours } from './utils/hours';
import { validateGuidedSelections } from './utils/guided-assembly';

dotenv.config();

// --- VALIDAÇÃO DE SEGURANÇA ---

// Gera um token criptográfico seguro para reset de senha
function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Valida força da senha (mín 8 chars, maiúscula, minúscula, número e caractere especial)
function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Pelo menos 1 letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Pelo menos 1 letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Pelo menos 1 número');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Pelo menos 1 caractere especial (!@#$%^&* etc)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function normalizeCnpj(value: unknown): string | null {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length ? digits : null;
}

function normalizeSlug(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getUniqueCategorySlug(restaurantId: number, value: unknown, ignoreCategoryId?: number): Promise<string> {
  const baseSlug = normalizeSlug(value) || `categoria-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.category.findFirst({
      where: {
        restaurantId,
        slug: candidate,
        ...(ignoreCategoryId ? { id: { not: ignoreCategoryId } } : {})
      },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function getGuidedAssemblyGroups(product: any, category: any) {
  const configuredGroups = Array.isArray(product?.guidedAssemblyConfig)
    ? product.guidedAssemblyConfig
    : Array.isArray(category?.guidedAssemblyConfig)
      ? category.guidedAssemblyConfig
      : [];

  if (configuredGroups.length > 0) {
    return configuredGroups.map((group: any) => ({
      id: group.id || group.name,
      name: group.name,
      minSelections: Number(group.minSelections ?? 0),
      maxSelections: Number(group.maxSelections ?? group.options?.length ?? 1),
      options: Array.isArray(group.options) ? group.options : [],
    }));
  }

  const normalizedCategory = `${category?.name || ''} ${category?.slug || ''}`.toLowerCase();
  if (!normalizedCategory.includes('pasteis')) {
    return null;
  }

  return [
    { id: 'base', name: 'Ingredientes Base', minSelections: 2, maxSelections: 2 },
    { id: 'queijo', name: 'Tipo de Queijo', minSelections: 1, maxSelections: 1 },
    { id: 'complemento', name: 'Complemento', minSelections: 1, maxSelections: 1 },
  ];
}

function normalizeGuidedAssemblySelections(item: any) {
  const selections = Array.isArray(item?.guidedAssemblySelections)
    ? item.guidedAssemblySelections
    : [];

  if (selections.length > 0) {
    return selections.map((selection: any) => ({
      groupId: selection.groupId || selection.groupName || selection.step,
      optionIds: Array.isArray(selection.selected)
        ? selection.selected.map((entry: any) => entry.id || entry.name)
        : [selection.selected?.id || selection.selected?.name].filter(Boolean),
    }));
  }

  const customization = Array.isArray(item?.customization) ? item.customization : [];
  if (customization.length === 0) {
    return [];
  }

  const grouped = customization.reduce((acc: Record<string, any[]>, entry: any) => {
    const groupId = entry.step || entry.groupId || 'complemento';
    acc[groupId] = acc[groupId] || [];
    acc[groupId].push(entry);
    return acc;
  }, {});

  return Object.entries(grouped).map(([groupId, selected]) => ({
    groupId,
    optionIds: (selected as any[]).map((entry: any) => entry.id || entry.name),
  }));
}

function isValidCnpj(value: string): boolean {
  if (!/^\d{14}$/.test(value)) return false;
  if (/^(\d)\1{13}$/.test(value)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const sum = base
      .split('')
      .reduce((acc, digit, idx) => acc + Number(digit) * factors[idx], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcDigit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcDigit(value.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return value.endsWith(`${d1}${d2}`);
}

const app = express();
const httpServer = createServer(app);

// ✅ SEGURO: JWT_SECRET validação
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('❌ CRÍTICO: JWT_SECRET must be defined in environment variables. Use: openssl rand -base64 32');
}

const PORT = Number(process.env.PORT || 8000);
if (Number.isNaN(PORT) || PORT <= 0) {
  throw new Error('❌ CRÍTICO: PORT must be a valid positive number');
}

// Inicialização e Correção do Banco de Dados
async function bootstrap() {
  try {
    // Garante que o cargo CASHIER existe no Enum do Postgres (correção manual para evitar erros de migração Prisma 7)
    await prisma.$executeRawUnsafe("ALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'CASHIER'");
    console.log('✅ Banco de Dados: Enum UserRole atualizado com CASHIER');
  } catch (e) {
    // Ignora se já existir ou se o provider não for Postgres
    console.log('ℹ️ Banco de Dados: Verificação de Enum concluída');
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "categories"
        ADD COLUMN IF NOT EXISTS "typeMontagem" TEXT DEFAULT 'padrao',
        ADD COLUMN IF NOT EXISTS "guidedAssemblyConfig" JSONB
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "usesGuidedAssembly" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "guidedAssemblyConfig" JSONB
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "order_items"
        ADD COLUMN IF NOT EXISTS "guidedAssemblySelections" JSONB
    `);
    console.log('✅ Banco de Dados: Campos de montagem guiada verificados');
  } catch (e) {
    console.warn('⚠️ Banco de Dados: Não foi possível verificar campos de montagem guiada', e);
  }
}

bootstrap();

const DEFAULT_CASH_DIFFERENCE_NOTE_THRESHOLD = 5;
const AUDIT_DEFAULT_DAYS = Math.min(90, Math.max(1, Number(process.env.AUDIT_DEFAULT_DAYS || 7)));
const AUDIT_EXPORT_MAX_ROWS = Math.min(20000, Math.max(500, Number(process.env.AUDIT_EXPORT_MAX_ROWS || 5000)));
const AUDIT_ASYNC_EXPORT_MAX_ROWS = Math.min(100000, Math.max(1000, Number(process.env.AUDIT_ASYNC_EXPORT_MAX_ROWS || 20000)));
const AUDIT_ASYNC_EXPORT_BATCH_SIZE = Math.min(5000, Math.max(200, Number(process.env.AUDIT_ASYNC_EXPORT_BATCH_SIZE || 1000)));
const AUDIT_EXPORT_JOB_TTL_MINUTES = Math.min(180, Math.max(5, Number(process.env.AUDIT_EXPORT_JOB_TTL_MINUTES || 30)));
const AUDIT_EXPORT_MAX_CONCURRENT_JOBS = Math.min(5, Math.max(1, Number(process.env.AUDIT_EXPORT_MAX_CONCURRENT_JOBS || 1)));
const AUDIT_RETENTION_ENABLED = process.env.AUDIT_RETENTION_ENABLED !== 'false';
const AUDIT_RETENTION_DAYS = Math.min(3650, Math.max(7, Number(process.env.AUDIT_RETENTION_DAYS || 180)));
const AUDIT_RETENTION_INTERVAL_HOURS = Math.min(168, Math.max(1, Number(process.env.AUDIT_RETENTION_INTERVAL_HOURS || 24)));
const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

function sanitizeAssetFolder(folder?: string): string {
  return String(folder || 'general')
    .toLowerCase()
    .replace(/[^a-z0-9-_/]/g, '')
    .replace(/\.{2,}/g, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '') || 'general';
}

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}
const PUBLIC_STORE_CACHE_TTL_MS = Math.min(60000, Math.max(5000, Number(process.env.PUBLIC_STORE_CACHE_TTL_MS || 15000)));
const CASH_COUNTED_ORDER_STATUSES: OrderStatus[] = ['OPEN', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'PAID', 'RETIRED' as OrderStatus];
const CASHIER_OPERATION_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'EMPLOYEE']);
const CASHIER_OPEN_CLOSE_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER']);

const publicStoreCache = new Map<string, { expiresAt: number; payload: unknown }>();

function getPublicStoreCacheKey(type: 'settings' | 'categories' | 'products', restaurantId?: number) {
  return `${type}:${restaurantId || 'unknown'}`;
}

function readPublicStoreCache<T>(type: 'settings' | 'categories' | 'products', restaurantId?: number): T | null {
  const key = getPublicStoreCacheKey(type, restaurantId);
  const cached = publicStoreCache.get(key);

  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    publicStoreCache.delete(key);
    return null;
  }

  return cached.payload as T;
}

function writePublicStoreCache(type: 'settings' | 'categories' | 'products', restaurantId: number | undefined, payload: unknown) {
  if (!restaurantId) return;

  const key = getPublicStoreCacheKey(type, restaurantId);
  publicStoreCache.set(key, {
    payload,
    expiresAt: Date.now() + PUBLIC_STORE_CACHE_TTL_MS,
  });
}

function invalidatePublicStoreCache(restaurantId?: number) {
  if (!restaurantId) return;

  publicStoreCache.delete(getPublicStoreCacheKey('settings', restaurantId));
  publicStoreCache.delete(getPublicStoreCacheKey('categories', restaurantId));
  publicStoreCache.delete(getPublicStoreCacheKey('products', restaurantId));
}

type OrderMode = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

const ORDER_STATUS_FLOW_BY_MODE: Record<OrderMode, Record<string, string[]>> = {
  DELIVERY: {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    OPEN: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  },
  PICKUP: {
    PENDING: ['CONFIRMED', 'CANCELLED', 'PAID'],
    OPEN: ['CONFIRMED', 'CANCELLED', 'PAID'],
    CONFIRMED: ['PREPARING', 'CANCELLED', 'PAID'],
    PREPARING: ['READY', 'CANCELLED', 'PAID'],
    READY: ['RETIRED', 'CANCELLED', 'PAID'],
    PAID: ['RETIRED', 'DELIVERED'],
    RETIRED: ['PAID'],
  },
  DINE_IN: {
    PENDING: ['OPEN', 'CONFIRMED', 'CANCELLED', 'PAID'],
    OPEN: ['CONFIRMED', 'CANCELLED', 'PAID'],
    CONFIRMED: ['PREPARING', 'CANCELLED', 'PAID'],
    PREPARING: ['DELIVERED', 'CANCELLED', 'PAID', 'READY'],
    READY: ['DELIVERED', 'PAID', 'CANCELLED'],
    DELIVERED: ['PAID', 'CANCELLED'],
    PAID: ['DELIVERED'],
  },
};

function getOrderModeFromAddress(address: unknown): OrderMode {
  if (!address || typeof address !== 'object') return 'DELIVERY';
  const typeRaw = (address as any)?.type;
  if (typeRaw === 'PICKUP') return 'PICKUP';
  if (typeRaw === 'DINE_IN') return 'DINE_IN';
  return 'DELIVERY';
}

type AuditExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

type AuditExportJob = {
  id: string;
  status: AuditExportJobStatus;
  createdAt: Date;
  expiresAt: Date;
  processedRows: number;
  totalRows: number;
  csvContent?: string;
  error?: string;
  cancelRequested?: boolean;
  where: any;
};

const auditExportJobs = new Map<string, AuditExportJob>();

function ensureCashierPermission(
  req: AuthRequest,
  res: express.Response,
  allowedRoles: Set<string>,
  actionLabel: string
): boolean {
  console.log(`[PermissionCheck] User: ${req.userId}, Role: ${req.userRole}, Action: ${actionLabel}, Allowed: ${Array.from(allowedRoles).join(',')}`);
  if (!req.userRole || !allowedRoles.has(req.userRole)) {
    console.error(`[PermissionCheck] Denied: ${req.userRole} lacks permission for ${actionLabel}`);
    res.status(403).json({ error: `Sem permissão para ${actionLabel}.` });
    return false;
  }

  return true;
}

function parseAuditDateInput(value: string, endOfDay = false): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (endOfDay) {
      parsed.setHours(23, 59, 59, 999);
    } else {
      parsed.setHours(0, 0, 0, 0);
    }
  }

  return parsed;
}

function buildAuditDateRange(query: any): { from: Date; to: Date } | null {
  const now = new Date();
  const fallbackTo = new Date(now);
  fallbackTo.setHours(23, 59, 59, 999);

  const fallbackFrom = new Date(fallbackTo);
  fallbackFrom.setDate(fallbackFrom.getDate() - (AUDIT_DEFAULT_DAYS - 1));
  fallbackFrom.setHours(0, 0, 0, 0);

  const dateFromRaw = query.dateFrom?.toString().trim() || '';
  const dateToRaw = query.dateTo?.toString().trim() || '';

  const from = dateFromRaw ? parseAuditDateInput(dateFromRaw, false) : fallbackFrom;
  const to = dateToRaw ? parseAuditDateInput(dateToRaw, true) : fallbackTo;

  if (!from || !to || from > to) {
    return null;
  }

  return { from, to };
}

function buildAuditWhere(search: string, subjectType: string | undefined, dateRange: { from: Date; to: Date }) {
  const where: any = {};
  where.createdAt = { gte: dateRange.from, lte: dateRange.to };

  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { actorEmail: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (subjectType) {
    where.subjectType = subjectType;
  }

  return where;
}

function cleanupExpiredAuditExportJobs() {
  const now = new Date();
  for (const [id, job] of auditExportJobs.entries()) {
    if (job.expiresAt.getTime() <= now.getTime()) {
      auditExportJobs.delete(id);
    }
  }
}

async function processAuditExportJob(jobId: string) {
  const job = auditExportJobs.get(jobId);
  if (!job) {
    return;
  }

  if (job.cancelRequested || job.status === 'cancelled') {
    job.status = 'cancelled';
    job.error = 'Exportação cancelada pelo usuário.';
    return;
  }

  job.status = 'processing';
  job.processedRows = 0;

  try {
    const total = await prisma.auditLog.count({ where: job.where });
    job.totalRows = total;

    if (total > AUDIT_ASYNC_EXPORT_MAX_ROWS) {
      job.status = 'failed';
      job.error = `Exportação excede o limite assíncrono de ${AUDIT_ASYNC_EXPORT_MAX_ROWS} registros. Refine os filtros.`;
      return;
    }

    const header = 'id,actorId,actorEmail,action,subjectType,subjectId,details,createdAt\n';
    const rows: string[] = [];

    for (let skip = 0; skip < total; skip += AUDIT_ASYNC_EXPORT_BATCH_SIZE) {
      const currentJob = auditExportJobs.get(jobId);
      if (!currentJob || currentJob.cancelRequested || currentJob.status === 'cancelled') {
        if (currentJob) {
          currentJob.status = 'cancelled';
          currentJob.error = 'Exportação cancelada pelo usuário.';
          currentJob.csvContent = undefined;
        }
        return;
      }

      const batch = await prisma.auditLog.findMany({
        where: job.where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: AUDIT_ASYNC_EXPORT_BATCH_SIZE,
      });

      rows.push(
        ...batch.map((l) => `${l.id},${l.actorId ?? ''},"${(l.actorEmail || '').replace(/"/g, '""')}","${l.action}","${l.subjectType}",${l.subjectId ?? ''},"${JSON.stringify(l.details || {}).replace(/"/g, '""')}",${l.createdAt.toISOString()}`)
      );

      job.processedRows += batch.length;
    }

    job.csvContent = header + rows.join('\n');
    job.status = 'completed';
  } catch (error: any) {
    job.status = 'failed';
    job.error = error?.message || 'Falha ao processar exportação de auditoria.';
  }
}

function getAuditRetentionCutoff(): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUDIT_RETENTION_DAYS);
  return cutoff;
}

async function runAuditRetentionCleanup(trigger: 'startup' | 'scheduled') {
  if (!AUDIT_RETENTION_ENABLED) {
    return;
  }

  try {
    const cutoff = getAuditRetentionCutoff();
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      console.log(`[AUDIT_RETENTION] ${result.count} log(s) removido(s) no gatilho ${trigger}.`);
    }
  } catch (error) {
    console.error('[AUDIT_RETENTION] Falha ao executar limpeza de auditoria:', error);
  }
}

function scheduleAuditRetentionCleanup() {
  if (!AUDIT_RETENTION_ENABLED) {
    console.log('[AUDIT_RETENTION] Limpeza automática desativada por configuração.');
    return;
  }

  const intervalMs = AUDIT_RETENTION_INTERVAL_HOURS * 60 * 60 * 1000;
  runAuditRetentionCleanup('startup');
  setInterval(() => {
    runAuditRetentionCleanup('scheduled');
  }, intervalMs);
}

// ✅ SEGURO: CORS configurado explicitamente
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  optionsSuccessStatus: 200
}));
app.use('/uploads', express.static(UPLOADS_ROOT, { maxAge: '7d', immutable: false }));
app.use('/api/uploads', express.static(UPLOADS_ROOT, { maxAge: '7d', immutable: false }));

// ✅ SEGURO: Socket.io com CORS configurado
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper para criar entradas de auditoria (audit logs)
async function createAudit(req: AuthRequest | any, action: string, subjectType: string, subjectId?: number | null, details?: any) {
  try {
    const actorId = req?.userId;
    let actorEmail: string | undefined = undefined;
    if (actorId) {
      const actor = await prisma.user.findUnique({ where: { id: actorId } });
      actorEmail = actor?.email || undefined;
    }

    await prisma.auditLog.create({
      data: {
        actorId: actorId || undefined,
        actorEmail: actorEmail || null,
        action,
        subjectType,
        subjectId: subjectId || undefined,
        details: details || undefined
      }
    });
  } catch (e) {
    console.warn('Failed to write audit log', e);
  }
}

const PRINTABLE_SUBJECT_TYPES = new Set(['order', 'cash_session']);
// const PRINTER_CONNECTION_TYPES = new Set(['NETWORK', 'USB']);
// const PRINT_TEMPLATES = new Set(['ORDER_TICKET', 'CASH_CLOSING_REPORT', 'TEST_TICKET']);
// const PRINT_MODES = new Set(['THERMAL', 'A4']);
// const ACTIVE_PRINT_JOB_STATUSES = new Set(['PENDING', 'PROCESSING']);

function normalizePrintTemplate(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'ORDER_TICKET' || normalized === 'CASH_CLOSING_REPORT' || normalized === 'TEST_TICKET') {
    return normalized;
  }
  return null;
}

function normalizePrintMode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'THERMAL' || normalized === 'A4') {
    return normalized;
  }
  return null;
}

function normalizeConnectionType(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'NETWORK' || normalized === 'USB') {
    return normalized;
  }
  return null;
}

function generatePrinterAgentToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

async function getPrimaryPrintDevice(restaurantId: number) {
  // TODO: Configurar impressoras - tabela printDevice não existe ainda
  return null;
}

function formatCurrencyForPrint(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

function formatItemDetailsForPrint(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry: any) => {
      const name = String(entry?.name || '').trim();
      if (!name) return null;
      const price = Number(entry?.price || 0);
      return price > 0 ? `${name} (${formatCurrencyForPrint(price)})` : name;
    })
    .filter(Boolean) as string[];
}

function formatOrderAddressForPrint(address: any) {
  if (!address) return 'Nao informado';
  if (typeof address === 'string') return address;

  if (address?.type === 'PICKUP') return 'RETIRADA / PARA VIAGEM';
  if (address?.type === 'DINE_IN') return 'CONSUMO NO LOCAL';

  const details = address?.details || address;
  return [details.street, details.number, details.neighborhood, details.city]
    .filter(Boolean)
    .join(', ') || 'Nao informado';
}

async function buildOrderTicketPayload(restaurantId: number, orderId: number) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: {
      items: true,
      customer: true,
      restaurant: {
        select: { id: true, name: true, corporateName: true, cnpj: true, phone: true },
      },
    },
  });

  if (!order) {
    throw new Error('ORDER_PRINT_SOURCE_NOT_FOUND');
  }

  return {
    type: 'order_ticket',
    orderId: order.id,
    restaurant: order.restaurant,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customer?.name || order.customerName || 'Cliente',
    phone: order.phone || null,
    paymentMethod: order.paymentMethod,
    status: order.status,
    addressLabel: formatOrderAddressForPrint(order.address),
    notes: order.notes || null,
    cpf: order.cpf || null,
    changeFor: order.changeFor || null,
    items: (order.items || []).map((item: any) => ({
      quantity: item.quantity,
      name: item.name || `Produto #${item.productId}`,
      variation: item.variation || null,
      observations: item.observations || null,
      addons: formatItemDetailsForPrint(item.addons),
      removals: formatItemDetailsForPrint(item.removals),
      unitPrice: Number(item.price || 0),
      totalPrice: Number((Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)),
    })),
    totals: {
      subtotal: Number(order.subtotal || 0),
      deliveryFee: Number(order.deliveryFee || 0),
      total: Number(order.total || 0),
    },
  };
}

async function buildCashClosingPayload(restaurantId: number, sessionId: number) {
  const session = await prisma.cashSession.findFirst({
    where: { id: sessionId, restaurantId },
    include: {
      openedBy: { select: { id: true, name: true, email: true } },
      closedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!session) {
    throw new Error('CASH_SESSION_PRINT_SOURCE_NOT_FOUND');
  }

  const movements = await prisma.cashMovement.findMany({
    where: { cashSessionId: session.id },
    orderBy: { createdAt: 'asc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  const [restaurant, suppliesAgg, withdrawalsAgg, adjustmentsAgg, salesAgg, cashSalesAgg, salesByPaymentRaw] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, corporateName: true, cnpj: true, phone: true },
    }),
    prisma.cashMovement.aggregate({ where: { cashSessionId: session.id, type: 'SUPPLY' }, _sum: { amount: true } }),
    prisma.cashMovement.aggregate({ where: { cashSessionId: session.id, type: 'WITHDRAWAL' }, _sum: { amount: true } }),
    prisma.cashMovement.aggregate({ where: { cashSessionId: session.id, type: 'ADJUSTMENT' }, _sum: { amount: true } }),
    prisma.order.aggregate({
      where: {
        restaurantId,
        createdAt: { gte: session.countFromDate ?? session.openedAt, ...(session.closedAt ? { lte: session.closedAt } : {}) },
        status: { in: CASH_COUNTED_ORDER_STATUSES },
      },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        restaurantId,
        createdAt: { gte: session.countFromDate ?? session.openedAt, ...(session.closedAt ? { lte: session.closedAt } : {}) },
        status: { in: CASH_COUNTED_ORDER_STATUSES },
        paymentMethod: 'CASH',
      },
      _sum: { total: true },
    }),
    prisma.order.groupBy({
      by: ['paymentMethod'],
      where: {
        restaurantId,
        createdAt: { gte: session.countFromDate ?? session.openedAt, ...(session.closedAt ? { lte: session.closedAt } : {}) },
        status: { in: CASH_COUNTED_ORDER_STATUSES },
      },
      _sum: { total: true },
    }),
  ]);

  const supplies = Number(suppliesAgg._sum.amount || 0);
  const withdrawals = Number(withdrawalsAgg._sum.amount || 0);
  const adjustments = Number(adjustmentsAgg._sum.amount || 0);
  const sales = Number(salesAgg._sum.total || 0);
  const cashSales = Number(cashSalesAgg._sum.total || 0);
  const expectedAmount = Number((session.openingAmount + supplies - withdrawals + adjustments + cashSales).toFixed(2));
  const closingAmount = Number(session.closingAmount || 0);
  const informedCardAmount = Number(session.informedCardAmount || 0);
  const informedPixAmount = Number(session.informedPixAmount || 0);
  const differenceAmount = Number(((session.closingAmount ?? expectedAmount) - expectedAmount).toFixed(2));

  const paymentMethods = ['PIX', 'CASH', 'CARD'];
  const salesByPayment = paymentMethods.map((method) => {
    const row = salesByPaymentRaw.find((entry) => entry.paymentMethod === method);
    const total = Number(row?._sum.total || 0);
    let difference = 0;
    if (method === 'CARD' && session.status === 'CLOSED') difference = Number((informedCardAmount - total).toFixed(2));
    if (method === 'PIX' && session.status === 'CLOSED') difference = Number((informedPixAmount - total).toFixed(2));

    return {
      method,
      total,
      informed: method === 'CASH' ? closingAmount : (method === 'CARD' ? informedCardAmount : informedPixAmount),
      difference,
    };
  });

  return {
    type: 'cash_closing_report',
    restaurant,
    session: {
      id: session.id,
      status: session.status,
      openingAmount: Number(session.openingAmount || 0),
      closingAmount,
      informedCardAmount,
      informedPixAmount,
      notes: session.notes || null,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() || null,
      openedBy: session.openedBy,
      closedBy: session.closedBy,
    },
    movements: movements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      amount: Number(movement.amount || 0),
      reason: movement.reason || null,
      notes: movement.notes || null,
      createdAt: movement.createdAt.toISOString(),
      createdBy: movement.createdBy,
    })),
    totals: {
      supplies,
      withdrawals,
      adjustments,
      sales,
      cashSales,
      expectedAmount,
      differenceAmount,
      salesByPayment,
    },
  };
}

async function buildPrintJobPayload(params: {
  restaurantId: number;
  subjectType: string;
  subjectId?: number | null;
  template: string | null;
  fallbackPayload?: any;
}) {
  // TODO: Configurar impressoras - função suspensa
  return params.fallbackPayload || {};
}

async function enqueuePrintJob(params: {
  restaurantId: number;
  printerId?: number | null;
  requestedById?: number | null;
  subjectType: string;
  subjectId?: number | null;
  template: string | null;
  printMode: string | null;
  payload: any;
  copies?: number;
}) {
  // TODO: Configurar impressoras - tabela printJob não existe ainda
  return { id: 0 };
}

async function getPrintDeviceFromAgentToken(req: express.Request) {
  // TODO: Configurar impressoras - tabela printDevice não existe ainda
  return null;
}

// --- SEEDER INICIAL ---
const seedSettings = async () => {
  // Planos comerciais padrão para início de operação.
  const desiredPlans = [
    { name: 'Start', tier: 'BASIC' as const, price: 89, maxProducts: 120, maxOrders: 900 },
    { name: 'Pro', tier: 'PRO' as const, price: 179, maxProducts: 350, maxOrders: 2500 },
    { name: 'Scale', tier: 'ENTERPRISE' as const, price: 349, maxProducts: 1000, maxOrders: 6000 }
  ];

  const startPlanByName = await prisma.plan.findUnique({ where: { name: 'Start' } });
  const legacyFreePlan = await prisma.plan.findUnique({ where: { name: 'Free Plan' } });

  if (!startPlanByName && legacyFreePlan) {
    await prisma.plan.update({
      where: { id: legacyFreePlan.id },
      data: {
        name: 'Start',
        tier: 'BASIC',
        price: 89,
        maxProducts: 120,
        maxOrders: 900
      }
    });
  }

  for (const planData of desiredPlans) {
    await prisma.plan.upsert({
      where: { name: planData.name },
      update: {},
      create: planData
    });
  }

  const startPlan = await prisma.plan.findUnique({ where: { name: 'Start' } });
  if (!startPlan) {
    throw new Error('Falha ao inicializar plano Start');
  }

  const restaurantCount = await prisma.restaurant.count();
  if (restaurantCount === 0) {
    // ✅ SEGURO: Admin password gerado de forma segura
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('🔐 Admin inicial criado (email: admin@foodsystem.com).');
    console.log('⚠️ Defina/rotacione a senha via fluxo seguro imediatamente após o primeiro login.');

    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'FoodSystem Burger',
        slug: 'foodsystem-burger',
        logo: '/logo.foodsystem.png',
        provisioningStatus: 'READY',
        databaseName: 'foodsystem-burger',
        planId: startPlan.id,
        users: {
          create: {
            name: 'Admin',
            email: 'admin@foodsystem.com',
            password: hashedPassword,
            role: 'OWNER',
            isApproved: true
          }
        },
        settings: {
          create: {
            storeName: 'FoodSystem Burger',
            phone: '(11) 99999-9999',
            address: 'Rua das Flores, 123 - Centro',
            bio: 'O melhor hambúrguer artesanal da região, feito com ingredientes frescos e selecionados.',
            bannerBadge: 'O mais desejado de 2024',
            bannerTitleLine1: 'Sabor que',
            bannerTitleLine2: 'Transforma',
            bannerDescription: 'Experiência gastronômica executiva com ingredientes selecionados e preparo artesanal.',
            bannerCtaLabel: 'Explorar Menu',
            bannerImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2000',
            logo: '/logo.foodsystem.png',
            operatingHours: {
              seg: { enabled: true, shifts: [{ open: '18:00', close: '23:00' }] },
              ter: { enabled: true, shifts: [{ open: '18:00', close: '23:00' }] },
              qua: { enabled: true, shifts: [{ open: '18:00', close: '23:00' }] },
              qui: { enabled: true, shifts: [{ open: '18:00', close: '23:00' }] },
              sex: { enabled: true, shifts: [{ open: '18:00', close: '00:00' }] },
              sab: { enabled: true, shifts: [{ open: '12:00', close: '00:00' }] },
              dom: { enabled: true, shifts: [{ open: '12:00', close: '23:00' }] }
            },
            deliveryFee: 5.0,
            minOrderValue: 20.0,
            isOpen: true,
            deliveryEtaMinutes: 35,
            primaryColor: '#ef4444',
            latitude: -23.55052,
            longitude: -46.633308
          }
        }
      }
    });
    console.log('✅ Restaurante e Settings inicializados');

    // Adicionar categorias e produtos se não existirem
    const category = await prisma.category.create({
      data: {
        name: 'Hambúrgueres',
        slug: 'hamburgueres',
        restaurantId: restaurant.id,
        order: 1
      }
    });

    await prisma.product.create({
      data: {
        name: 'Classic Burger',
        description: 'Pão brioche, blend 180g, queijo cheddar e maionese da casa.',
        price: 32.0,
        categoryId: category.id,
        restaurantId: restaurant.id,
        isActive: true,
        isFeatured: true,
        ingredients: ['Alface', 'Tomate', 'Cebola Roxa'],
        sizes: [
          { name: 'Individual', price: 32.0 },
          { name: 'Duplo', price: 45.0 }
        ],
        addons: [
          { name: 'Bacon Extra', price: 4.5 },
          { name: 'Ovo Frito', price: 3.0 },
          { name: 'Queijo Cheddar', price: 2.5 }
        ]
      }
    });
    console.log('✅ Categorias e Produtos iniciais criados');
  }

  const superAdminEmail = 'superadmin@foodsystem.com';
  // ✅ SEGURO: SuperAdmin password gerado de forma segura
  const superAdminPassword = await bcrypt.hash(
    process.env.INITIAL_SUPERADMIN_PASSWORD || crypto.randomBytes(16).toString('hex'),
    10
  );

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      isApproved: true,
      role: 'SUPER_ADMIN',
      password: superAdminPassword,
    },
    create: {
      name: 'Super Admin',
      email: superAdminEmail,
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      isApproved: true,
    }
  });
};
seedSettings();

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('📱 Cliente conectado:', socket.id);
});

// --- ROUTES ---

const apiRouter = express.Router();

// Auth (Não protegidas por tenant middleware diretamente no apiRouter)
app.post('/api/auth/register', async (req, res) => {
  return res.status(403).json({ error: 'Cadastro público desativado. O acesso deve ser liberado pelo super admin.' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { restaurant: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!user.isApproved && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Conta aguardando liberação do super admin' });
    }

    if (!user.isActive && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Conta desativada. Contate o Super Admin.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, restaurantId: user.restaurantId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Nunca expor hash de senha no payload de resposta.
    const { password: _password, ...safeUser } = user;

    res.json({ user: safeUser, token, restaurant: user.restaurant });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Solicitar reset de senha
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Por segurança, sempre retorna sucesso mesmo se email não existe
    if (!user) {
      return res.json({
        message: 'Se o email existir em nosso sistema, você receberá um link de reset de senha.'
      });
    }

    // Limpar tokens antigos (não utilizados, expirados ou usados há mais de 24h)
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        ]
      }
    });

    // Gerar token de reset
    const token = generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        email: user.email,
        token,
        expiresAt
      }
    });

    // TODO: Integrar com serviço de email (SendGrid, AWS SES, etc)
    // Em produção, nunca registrar token/link de reset em log.
    console.log(`📧 Solicitação de reset registrada para ${user.email}. Token válido por 1 hora.`);

    await createAudit(req, 'forgot_password_requested', 'user', user.id, { email: user.email });

    res.json({
      message: 'Se o email existir em nosso sistema, você receberá um link de reset de senha.'
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

// Resetar senha com token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Senhas não correspondem' });
    }

    // Validar força da nova senha
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Senha fraca',
        requirements: passwordValidation.errors
      });
    }

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken) {
      return res.status(404).json({ error: 'Token inválido ou expirado' });
    }

    if (resetToken.used) {
      return res.status(400).json({ error: 'Este link de reset já foi utilizado' });
    }

    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ error: 'Link de reset expirou' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha do usuário
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    });

    // Marcar token como utilizado
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        used: true,
        usedAt: new Date()
      }
    });

    // Auditoria
    await createAudit(undefined, 'password_reset', 'user', resetToken.userId, {
      email: resetToken.email,
      success: true
    });

    res.json({ message: 'Senha resetada com sucesso. Faça login com sua nova senha.' });
  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
});

app.get('/api/admin/users', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = Math.min(200, Math.max(5, Number(req.query.perPage || 20)));
  const search = (req.query.search || '').toString();
  const filter = (req.query.filter || 'all').toString();

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (filter === 'approved') where.isApproved = true;
  if (filter === 'pending') where.isApproved = false;

  const total = await prisma.user.count({ where });
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { restaurant: true },
    skip: (page - 1) * perPage,
    take: perPage
  });

  res.json({ data: users, total, page, perPage });
});

// Export users as CSV (filtered)
app.get('/api/admin/users/export', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const search = (req.query.search || '').toString();
  const filter = (req.query.filter || 'all').toString();

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (filter === 'approved') where.isApproved = true;
  if (filter === 'pending') where.isApproved = false;

  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, include: { restaurant: true } });

  const header = 'id,name,email,role,isApproved,restaurantId,restaurantName,createdAt\n';
  const rows = users.map(u => `${u.id},"${u.name.replace(/"/g, '""')}","${u.email}",${u.role},${u.isApproved},${u.restaurantId || ''},"${u.restaurant?.name?.replace(/"/g, '""') || ''}",${u.createdAt.toISOString()}`).join('\n');
  const csv = header + rows;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
  res.send(csv);
});

// Auditoria - listar logs (SUPER_ADMIN)
app.get('/api/admin/audit-logs', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = Math.min(200, Math.max(5, Number(req.query.perPage || 20)));
  const search = (req.query.search || '').toString();
  const subjectType = req.query.subjectType?.toString();
  const dateRange = buildAuditDateRange(req.query);

  if (!dateRange) {
    return res.status(400).json({ error: 'Intervalo de datas inválido para auditoria.' });
  }

  const where = buildAuditWhere(search, subjectType, dateRange);

  const total = await prisma.auditLog.count({ where });
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * perPage,
    take: perPage
  });

  res.json({
    data: logs,
    total,
    page,
    perPage,
    dateFrom: dateRange.from.toISOString(),
    dateTo: dateRange.to.toISOString(),
  });
});

// Export audit logs as CSV (filtered)
app.get('/api/admin/audit-logs/export', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const search = (req.query.search || '').toString();
  const subjectType = req.query.subjectType?.toString();
  const dateRange = buildAuditDateRange(req.query);

  if (!dateRange) {
    return res.status(400).json({ error: 'Intervalo de datas inválido para auditoria.' });
  }

  const where = buildAuditWhere(search, subjectType, dateRange);

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: AUDIT_EXPORT_MAX_ROWS + 1,
  });

  if (logs.length > AUDIT_EXPORT_MAX_ROWS) {
    return res.status(400).json({
      error: `Exportação excede o limite de ${AUDIT_EXPORT_MAX_ROWS} registros. Refine os filtros de busca e período.`,
    });
  }

  const header = 'id,actorId,actorEmail,action,subjectType,subjectId,details,createdAt\n';
  const rows = logs.map(l => `${l.id},${l.actorId ?? ''},"${(l.actorEmail || '').replace(/"/g, '""')}","${l.action}","${l.subjectType}",${l.subjectId ?? ''},"${JSON.stringify(l.details || {}).replace(/"/g, '""')}",${l.createdAt.toISOString()}`).join('\n');
  const csv = header + rows;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit_logs_export.csv"');
  res.send(csv);
});

// Export audit logs as async job (filtered)
app.post('/api/admin/audit-logs/export-jobs', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  cleanupExpiredAuditExportJobs();

  const activeJobs = Array.from(auditExportJobs.values()).filter(
    (job) => job.status === 'queued' || job.status === 'processing'
  );

  if (activeJobs.length >= AUDIT_EXPORT_MAX_CONCURRENT_JOBS) {
    return res.status(409).json({
      error: `Já existe exportação em andamento. Limite atual: ${AUDIT_EXPORT_MAX_CONCURRENT_JOBS} job ativo por vez.`,
    });
  }

  const search = (req.body?.search || '').toString();
  const subjectType = req.body?.subjectType?.toString();
  const dateRange = buildAuditDateRange(req.body || {});

  if (!dateRange) {
    return res.status(400).json({ error: 'Intervalo de datas inválido para auditoria.' });
  }

  const where = buildAuditWhere(search, subjectType, dateRange);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUDIT_EXPORT_JOB_TTL_MINUTES * 60 * 1000);
  const jobId = crypto.randomUUID();

  auditExportJobs.set(jobId, {
    id: jobId,
    status: 'queued',
    createdAt: now,
    expiresAt,
    processedRows: 0,
    totalRows: 0,
    where,
  });

  setImmediate(() => {
    processAuditExportJob(jobId);
  });

  res.status(202).json({
    jobId,
    status: 'queued',
    expiresAt: expiresAt.toISOString(),
    maxRows: AUDIT_ASYNC_EXPORT_MAX_ROWS,
  });
});

app.get('/api/admin/audit-logs/export-jobs/:jobId', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  cleanupExpiredAuditExportJobs();

  const job = auditExportJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job de exportação não encontrado ou expirado.' });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    processedRows: job.processedRows,
    totalRows: job.totalRows,
    error: job.error,
    expiresAt: job.expiresAt.toISOString(),
  });
});

app.get('/api/admin/audit-logs/export-jobs/:jobId/download', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  cleanupExpiredAuditExportJobs();

  const job = auditExportJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job de exportação não encontrado ou expirado.' });
  }

  if (job.status === 'failed') {
    return res.status(400).json({ error: job.error || 'Falha no job de exportação.' });
  }

  if (job.status === 'cancelled') {
    return res.status(409).json({ error: job.error || 'Exportação cancelada.' });
  }

  if (job.status !== 'completed' || !job.csvContent) {
    return res.status(409).json({ error: 'Exportação ainda em processamento.' });
  }

  const csvContent = job.csvContent;
  // Remove o job concluído após disponibilizar o arquivo, evitando crescimento em memória.
  auditExportJobs.delete(job.id);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="audit_logs_export_${job.id}.csv"`);
  res.send(csvContent);
});

app.delete('/api/admin/audit-logs/export-jobs/:jobId', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  cleanupExpiredAuditExportJobs();

  const job = auditExportJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job de exportação não encontrado ou expirado.' });
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return res.status(409).json({ error: 'Este job já foi finalizado e não pode ser cancelado.' });
  }

  job.cancelRequested = true;
  job.status = 'cancelled';
  job.error = 'Exportação cancelada pelo usuário.';
  job.csvContent = undefined;

  res.status(200).json({ jobId: job.id, status: job.status });
});

app.post('/api/admin/users', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'OWNER',
      isApproved: false,
    }
  });

  await createAudit(req, 'create_user', 'user', user.id, { name, email });

  res.status(201).json(user);
});

app.patch('/api/admin/users/:id/approve', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const userId = Number(req.params.id);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isApproved: true }
  });

  await createAudit(req, 'approve_user', 'user', userId, { note: 'Approved by super admin' });

  res.json(user);
});

// Ativar usuário (SUPER_ADMIN)
app.patch('/api/admin/users/:id/activate', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const userId = Number(req.params.id);
  try {
    const user = await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    await createAudit(req, 'activate_user', 'user', userId, {});
    res.json(user);
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(400).json({ error: 'Erro ao ativar usuário' });
  }
});

// Pausar usuário (SUPER_ADMIN)
app.patch('/api/admin/users/:id/pause', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const userId = Number(req.params.id);
  try {
    const user = await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    await createAudit(req, 'pause_user', 'user', userId, {});
    res.json(user);
  } catch (error) {
    console.error('Error pausing user:', error);
    res.status(400).json({ error: 'Erro ao pausar usuário' });
  }
});

// Usuário pausa a própria conta (autenticado)
app.post('/api/users/me/pause', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Não autenticado' });

    const user = await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    await createAudit(req, 'self_pause', 'user', userId, {});
    res.json({ message: 'Conta pausada' });
  } catch (error) {
    console.error('Error pausing self:', error);
    res.status(400).json({ error: 'Erro ao pausar conta' });
  }
});

// Usuário muda sua própria senha (autenticado) - COM RATE LIMITING
app.post('/api/users/me/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Não autenticado' });

    // --- RATE LIMITING: 5 tentativas a cada 15 minutos ---
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentAttempts = await prisma.passwordChangeAttempt.count({
      where: {
        userId,
        createdAt: { gte: fifteenMinutesAgo }
      }
    });

    if (recentAttempts >= 5) {
      // Registrar tentativa bloqueada
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      await prisma.passwordChangeAttempt.create({
        data: {
          userId,
          success: false,
          reason: 'Rate limit exceeded',
          ipAddress,
          userAgent
        }
      });

      await createAudit(req, 'rate_limit_exceeded', 'user', userId, {
        reason: 'Too many password change attempts',
        attempts: recentAttempts
      });

      return res.status(429).json({
        error: 'Muitas tentativas de mudança de senha. Tente novamente em 15 minutos.',
        retryAfter: 900
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validações básicas
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Novas senhas não correspondem' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Nova senha deve ser diferente da atual' });
    }

    // Validar força da nova senha
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Senha fraca',
        requirements: passwordValidation.errors
      });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Validar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      // Registrar tentativa falha
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      await prisma.passwordChangeAttempt.create({
        data: {
          userId,
          success: false,
          reason: 'Invalid current password',
          ipAddress,
          userAgent
        }
      });

      await createAudit(req, 'failed_password_change', 'user', userId, { reason: 'Invalid current password' });
      return res.status(401).json({ error: 'Senha atual inválida' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Registrar tentativa bem-sucedida
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await prisma.passwordChangeAttempt.create({
      data: {
        userId,
        success: true,
        ipAddress,
        userAgent
      }
    });

    // Registrar sucesso na auditoria
    await createAudit(req, 'change_password', 'user', userId, {
      success: true,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// Editar usuário (SUPER_ADMIN)
app.patch('/api/admin/users/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const userId = Number(req.params.id);
  const { name, email, role, isApproved } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(role ? { role } : {}),
        ...(typeof isApproved === 'boolean' ? { isApproved } : {})
      }
    });
    console.log(`SuperAdmin ${req.userId} atualizou usuário ${userId}`);
    await createAudit(req, 'update_user', 'user', userId, { name, email, role, isApproved });
    res.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({ error: 'Erro ao atualizar usuário' });
  }
});

// --- GERENCIAMENTO DE EQUIPE (LOJA) ---

// Listar equipe do restaurante
app.get('/api/team', authMiddleware, async (req: AuthRequest, res) => {
  if (!['OWNER', 'MANAGER'].includes(req.userRole!)) {
    return res.status(403).json({ error: 'Acesso restrito a Gerentes ou Donos' });
  }

  try {
    const team = await prisma.user.findMany({
      where: { 
        restaurantId: req.restaurantId,
        role: { in: ['MANAGER', 'EMPLOYEE'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(team);
  } catch (error) {
    console.error('Error listing team:', error);
    res.status(500).json({ error: 'Erro ao listar equipe' });
  }
});

// Adicionar membro à equipe
app.post('/api/team', authMiddleware, async (req: AuthRequest, res) => {
  if (!['OWNER', 'MANAGER'].includes(req.userRole!)) {
    return res.status(403).json({ error: 'Acesso restrito a Gerentes ou Donos' });
  }

  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  if (!['OWNER', 'MANAGER', 'CASHIER', 'EMPLOYEE'].includes(role)) {
    return res.status(400).json({ error: 'Cargo inválido para membro da equipe' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'E-mail já cadastrado no sistema' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
        restaurantId: req.restaurantId,
        isApproved: true,
        isActive: true
      }
    });

    await createAudit(req, 'add_team_member', 'user', newUser.id, { name, role });

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(400).json({ error: 'Erro ao adicionar membro à equipe' });
  }
});

// Alterar cargo ou status de membro da equipe
app.patch('/api/team/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!['OWNER', 'MANAGER'].includes(req.userRole!)) {
    return res.status(403).json({ error: 'Acesso restrito a Gerentes ou Donos' });
  }

  const memberId = Number(req.params.id);
  const { role, isActive } = req.body;

  try {
    const member = await prisma.user.findFirst({
      where: { id: memberId, restaurantId: req.restaurantId }
    });

    if (!member) {
      return res.status(404).json({ error: 'Membro não encontrado na sua loja' });
    }

    if (member.role === 'OWNER') {
      return res.status(403).json({ error: 'Não é possível alterar o status do proprietário' });
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {})
      }
    });

    await createAudit(req, 'update_team_member', 'user', memberId, { role, isActive });

    res.json(updated);
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(400).json({ error: 'Erro ao atualizar membro da equipe' });
  }
});

// Remover membro da equipe (Apenas Owner)
app.delete('/api/team/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'OWNER') {
    return res.status(403).json({ error: 'Acesso restrito ao proprietário' });
  }

  const memberId = Number(req.params.id);

  try {
    const member = await prisma.user.findFirst({
      where: { id: memberId, restaurantId: req.restaurantId }
    });

    if (!member) {
      return res.status(404).json({ error: 'Membro não encontrado na sua loja' });
    }

    if (member.role === 'OWNER') {
      return res.status(403).json({ error: 'O proprietário não pode ser removido' });
    }

    await prisma.user.delete({ where: { id: memberId } });
    await createAudit(req, 'delete_team_member', 'user', memberId, { name: member.name });

    res.json({ message: 'Membro removido com sucesso' });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(400).json({ error: 'Erro ao remover membro da equipe' });
  }
});

// Admin reseta a senha de um usuário (SUPER_ADMIN)
app.post('/api/admin/users/:id/reset-password', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const userId = Number(req.params.id);
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'Nova senha é obrigatória' });
  }

  // Validar força da nova senha
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      error: 'Senha fraca',
      requirements: passwordValidation.errors
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Limpar tokens de reset de senha pendentes para este usuário
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId,
        used: false
      }
    });

    console.log(`SuperAdmin ${req.userId} resetou a senha do usuário ${userId}`);
    await createAudit(req, 'admin_reset_password', 'user', userId, {
      reason: 'Password reset by super admin',
      userEmail: user.email
    });

    res.json({ message: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
});

// Excluir usuário (SUPER_ADMIN)
app.delete('/api/admin/users/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const userId = Number(req.params.id);
  try {
    const result = await prisma.user.deleteMany({ where: { id: userId } });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    console.log(`SuperAdmin ${req.userId} excluiu usuário ${userId}`);
    await createAudit(req, 'delete_user', 'user', userId, {});
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(400).json({ error: 'Erro ao excluir usuário' });
  }
});

// Bulk actions for users (approve, delete)
app.patch('/api/admin/users/bulk', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const { ids, action } = req.body as { ids?: number[]; action?: string };
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids são obrigatórios' });
  }

  try {
    if (action === 'approve') {
      const result = await prisma.user.updateMany({ where: { id: { in: ids } }, data: { isApproved: true } });
      await createAudit(req, 'bulk_approve_users', 'user', null, { ids });
      return res.json({ count: result.count });
    }

    if (action === 'delete') {
      const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await createAudit(req, 'bulk_delete_users', 'user', null, { ids });
      return res.json({ count: result.count });
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (error) {
    console.error('Error in bulk users action:', error);
    res.status(500).json({ error: 'Erro ao executar ação em massa' });
  }
});

// Restaurantes - endpoints de administração (apenas SUPER_ADMIN)
app.get('/api/admin/restaurants', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  try {
    const status = (req.query.status || 'all').toString();

    const where: any = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (['READY', 'IN_PROGRESS', 'PAUSED', 'DENIED', 'PENDING'].includes(status)) {
      where.provisioningStatus = status;
    }

    const restaurants = await prisma.restaurant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { settings: true, users: true, plan: true }
    });

    const restaurantIds = restaurants.map((restaurant) => restaurant.id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let retryLogs: Array<{ restaurantId: number; message: string; createdAt: Date }> = [];
    if (restaurantIds.length > 0) {
      retryLogs = await prisma.provisioningLog.findMany({
        where: {
          restaurantId: { in: restaurantIds },
          message: { contains: 'Motivo:' }
        },
        select: { restaurantId: true, message: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    const [productsByRestaurant, monthlyOrdersByRestaurant] = await Promise.all([
      restaurantIds.length > 0
        ? prisma.product.groupBy({
          by: ['restaurantId'],
          where: { restaurantId: { in: restaurantIds } },
          _count: { _all: true }
        })
        : Promise.resolve([]),
      restaurantIds.length > 0
        ? prisma.order.groupBy({
          by: ['restaurantId'],
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: startOfMonth },
            OR: [
              { notes: null },
              { notes: { not: { startsWith: '[VENDA_DIRETA]' } } }
            ]
          },
          _count: { _all: true }
        })
        : Promise.resolve([])
    ]);

    const productsUsedMap = new Map<number, number>(
      productsByRestaurant.map((item: any) => [Number(item.restaurantId), Number(item._count?._all || 0)])
    );

    const monthlyOrdersMap = new Map<number, number>(
      monthlyOrdersByRestaurant.map((item: any) => [Number(item.restaurantId), Number(item._count?._all || 0)])
    );

    const resolveUsageStatus = (productPercent: number, orderPercent: number) => {
      const highest = Math.max(productPercent, orderPercent);
      if (highest >= 100) return 'limit_reached';
      if (highest >= 95) return 'critical';
      if (highest >= 80) return 'warning';
      return 'ok';
    };

    const latestRetryByRestaurant = new Map<number, { reason: string | null; createdAt: Date }>();

    for (const log of retryLogs) {
      if (latestRetryByRestaurant.has(log.restaurantId)) continue;

      const reason = log.message.includes('Motivo:')
        ? log.message.split('Motivo:')[1]?.trim() || null
        : null;

      latestRetryByRestaurant.set(log.restaurantId, {
        reason,
        createdAt: log.createdAt
      });
    }

    const enrichedRestaurants = restaurants.map((restaurant) => {
      const latestRetry = latestRetryByRestaurant.get(restaurant.id);
      const productsUsed = productsUsedMap.get(restaurant.id) || 0;
      const monthlyOrdersUsed = monthlyOrdersMap.get(restaurant.id) || 0;
      const maxProducts = Number(restaurant.plan?.maxProducts || 0);
      const maxOrders = Number(restaurant.plan?.maxOrders || 0);

      const productUsagePercent = maxProducts > 0
        ? Number(((productsUsed / maxProducts) * 100).toFixed(1))
        : 0;
      const orderUsagePercent = maxOrders > 0
        ? Number(((monthlyOrdersUsed / maxOrders) * 100).toFixed(1))
        : 0;

      return {
        ...restaurant,
        lastRetryReason: latestRetry?.reason || null,
        lastRetryAt: latestRetry?.createdAt || null,
        planUsage: {
          productsUsed,
          monthlyOrdersUsed,
          maxProducts,
          maxOrders,
          productUsagePercent,
          orderUsagePercent,
          status: resolveUsageStatus(productUsagePercent, orderUsagePercent)
        }
      };
    });

    res.json(enrichedRestaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Erro ao buscar restaurantes' });
  }
});

// Planos - endpoints de administração (apenas SUPER_ADMIN)
app.get('/api/admin/plans', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
      include: {
        _count: {
          select: { restaurants: true }
        },
        restaurants: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            users: {
              where: { role: 'OWNER' },
              select: { name: true, email: true },
              take: 1
            }
          }
        }
      }
    });

    const enrichedPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      tier: plan.tier,
      price: plan.price,
      maxProducts: plan.maxProducts,
      maxOrders: plan.maxOrders,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      restaurantsCount: plan._count.restaurants,
      restaurants: plan.restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        ownerName: restaurant.users[0]?.name || null,
        ownerEmail: restaurant.users[0]?.email || null
      }))
    }));

    res.json(enrichedPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Erro ao buscar planos' });
  }
});

app.post('/api/admin/plans', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const { name, tier, price, maxProducts, maxOrders } = req.body;

  try {
    const plan = await prisma.plan.create({
      data: {
        name,
        tier,
        price: Number(price),
        maxProducts: Number(maxProducts),
        maxOrders: Number(maxOrders)
      }
    });
    await createAudit(req, 'create_plan', 'plan', plan.id, { name, tier });
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(400).json({ error: 'Erro ao criar plano' });
  }
});

app.patch('/api/admin/plans/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const planId = Number(req.params.id);
  const { name, tier, price, maxProducts, maxOrders } = req.body;

  try {
    const plan = await prisma.plan.update({
      where: { id: planId },
      data: {
        ...(name ? { name } : {}),
        ...(tier ? { tier } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(maxProducts !== undefined ? { maxProducts: Number(maxProducts) } : {}),
        ...(maxOrders !== undefined ? { maxOrders: Number(maxOrders) } : {})
      }
    });
    await createAudit(req, 'update_plan', 'plan', planId, { name, tier });
    res.json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(400).json({ error: 'Erro ao atualizar plano' });
  }
});

app.delete('/api/admin/plans/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const planId = Number(req.params.id);

  try {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, name: true }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    const linkedRestaurants = await prisma.restaurant.count({ where: { planId } });
    if (linkedRestaurants > 0) {
      return res.status(409).json({
        error: `Não é possível excluir este plano porque ele está vinculado a ${linkedRestaurants} loja(s).`
      });
    }

    await prisma.plan.delete({ where: { id: planId } });
    await createAudit(req, 'delete_plan', 'plan', planId, { name: plan.name });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(400).json({ error: 'Erro ao excluir plano' });
  }
});

app.patch('/api/admin/restaurants/:id/plan', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const restaurantId = Number(req.params.id);
  const { planId } = req.body;

  try {
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { planId: Number(planId) },
      include: { plan: true }
    });
    await createAudit(req, 'update_restaurant_plan', 'restaurant', restaurantId, { planId });
    res.json(restaurant);
  } catch (error) {
    console.error('Error updating restaurant plan:', error);
    res.status(400).json({ error: 'Erro ao atualizar plano do restaurante' });
  }
});

// KPIs para Super Admin
app.get('/api/admin/kpis', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  try {
    const totalUsers = await prisma.user.count();
    const pendingUsers = await prisma.user.count({ where: { isApproved: false } });
    const totalRestaurants = await prisma.restaurant.count();
    const activeRestaurants = await prisma.restaurant.count({ where: { isActive: true } });
    const pendingRestaurants = await prisma.restaurant.count({ where: { isActive: false } });

    const provisioningCounts = await prisma.restaurant.groupBy({
      by: ['provisioningStatus'],
      _count: { provisioningStatus: true }
    });

    const provisioning = provisioningCounts.reduce((acc: any, p: any) => {
      acc[p.provisioningStatus] = p._count.provisioningStatus;
      return acc;
    }, {});

    res.json({
      totalUsers,
      pendingUsers,
      totalRestaurants,
      activeRestaurants,
      pendingRestaurants,
      provisioning
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: 'Erro ao buscar KPIs' });
  }
});

// Trends: new users and restaurants per day for the last N days
app.get('/api/admin/kpis/trends', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const days = Number(req.query.days || 14);
  try {
    // users per day
    const users = await prisma.$queryRawUnsafe(
      `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as day, count(*)::int as count
       FROM "users"
       WHERE "createdAt" >= now() - interval '${days} days'
       GROUP BY day
       ORDER BY day ASC`
    );

    const restaurants = await prisma.$queryRawUnsafe(
      `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as day, count(*)::int as count
       FROM "restaurants"
       WHERE "createdAt" >= now() - interval '${days} days'
       GROUP BY day
       ORDER BY day ASC`
    );

    res.json({ users, restaurants });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Erro ao buscar trends' });
  }
});

// Provisioning summary for Super Admin notices
app.get('/api/admin/provisioning/summary', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  try {
    const pendingStatuses = ['PENDING', 'IN_PROGRESS', 'PAUSED', 'DENIED'];

    const countByStatus = await prisma.restaurant.groupBy({
      by: ['provisioningStatus'],
      where: { provisioningStatus: { in: pendingStatuses } },
      _count: { provisioningStatus: true }
    });

    const statusTotals: Record<string, number> = {
      PENDING: 0,
      IN_PROGRESS: 0,
      PAUSED: 0,
      DENIED: 0
    };

    countByStatus.forEach((row: any) => {
      statusTotals[row.provisioningStatus] = row._count.provisioningStatus;
    });

    const totalPending = Object.values(statusTotals).reduce((sum, value) => sum + value, 0);

    const recentRestaurants = await prisma.restaurant.findMany({
      where: { provisioningStatus: { in: pendingStatuses } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, slug: true, provisioningStatus: true, createdAt: true }
    });

    res.json({
      total: totalPending,
      statusTotals,
      restaurants: recentRestaurants
    });
  } catch (error) {
    console.error('Error fetching provisioning summary:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo de provisioning' });
  }
});

// Provisioning: listar restaurantes com status
app.get('/api/admin/provisioning', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, slug: true, provisioningStatus: true, databaseName: true, isActive: true, createdAt: true }
    });

    const restaurantIds = restaurants.map((restaurant) => restaurant.id);

    let retryLogs: Array<{ restaurantId: number; message: string; createdAt: Date }> = [];
    if (restaurantIds.length > 0) {
      retryLogs = await prisma.provisioningLog.findMany({
        where: {
          restaurantId: { in: restaurantIds },
          message: { contains: 'Motivo:' }
        },
        select: { restaurantId: true, message: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    const latestRetryByRestaurant = new Map<number, { reason: string | null; createdAt: Date }>();

    for (const log of retryLogs) {
      if (latestRetryByRestaurant.has(log.restaurantId)) continue;

      const reason = log.message.includes('Motivo:')
        ? log.message.split('Motivo:')[1]?.trim() || null
        : null;

      latestRetryByRestaurant.set(log.restaurantId, {
        reason,
        createdAt: log.createdAt
      });
    }

    const enrichedRestaurants = restaurants.map((restaurant) => {
      const latestRetry = latestRetryByRestaurant.get(restaurant.id);
      return {
        ...restaurant,
        lastRetryReason: latestRetry?.reason || null,
        lastRetryAt: latestRetry?.createdAt || null
      };
    });

    res.json(enrichedRestaurants);
  } catch (error) {
    console.error('Error fetching provisioning list:', error);
    res.status(500).json({ error: 'Erro ao buscar provisioning' });
  }
});

// Retry provisioning (simple flow): marca IN_PROGRESS e depois READY
app.post('/api/admin/restaurants/:id/retry-provisioning', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const restaurantId = Number(req.params.id);
  const reason = (req.body?.reason || '').toString().trim();

  if (!reason || reason.length < 8) {
    return res.status(400).json({ error: 'Informe um motivo com pelo menos 8 caracteres para reiniciar o provisioning.' });
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, name: true, slug: true, provisioningStatus: true } });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante não encontrado' });
    }

    await prisma.restaurant.update({ where: { id: restaurantId }, data: { provisioningStatus: 'IN_PROGRESS' } });

    // Create a provisioning log entry (start)
    try {
      await prisma.provisioningLog.create({
        data: {
          restaurantId,
          message: `Provisioning retried by super-admin. Motivo: ${reason}`,
          level: 'info'
        }
      });
      await createAudit(req, 'retry_provisioning_start', 'restaurant', restaurantId, {
        note: 'Retry started by super admin',
        reason,
        previousStatus: restaurant.provisioningStatus,
        restaurantSlug: restaurant.slug
      });
    } catch (e) {
      console.warn('Could not create provisioning log (start):', e);
    }

    // Simulate provisioning work (immediate for now)
    const updated = await prisma.restaurant.update({ where: { id: restaurantId }, data: { provisioningStatus: 'READY', isActive: true } });

    // Create a provisioning log entry (ready)
    try {
      await prisma.provisioningLog.create({
        data: {
          restaurantId,
          message: 'Provisioning finished (simulated) - READY',
          level: 'info'
        }
      });
      await createAudit(req, 'retry_provisioning_finish', 'restaurant', restaurantId, {
        note: 'Retry finished (simulated)',
        reason,
        finalStatus: 'READY'
      });
    } catch (e) {
      console.warn('Could not create provisioning log (finish):', e);
    }

    console.log(`SuperAdmin ${req.userId} retried provisioning for restaurant ${restaurantId}`);
    res.json(updated);
  } catch (error) {
    console.error('Error retrying provisioning:', error);
    res.status(400).json({ error: 'Erro ao reiniciar provisioning' });
  }
});

// Get provisioning logs for a restaurant
app.get('/api/admin/restaurants/:id/logs', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const restaurantId = Number(req.params.id);
  try {
    const logs = await prisma.provisioningLog.findMany({ where: { restaurantId }, orderBy: { createdAt: 'desc' } });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching provisioning logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

app.patch('/api/admin/restaurants/:id/approve', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const restaurantId = Number(req.params.id);
  try {
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isActive: true, provisioningStatus: 'READY' }
    });
    console.log(`SuperAdmin ${req.userId} aprovou restaurante ${restaurantId}`);
    await createAudit(req, 'approve_restaurant', 'restaurant', restaurantId, {});
    res.json(restaurant);
  } catch (error) {
    console.error('Error approving restaurant:', error);
    res.status(400).json({ error: 'Erro ao aprovar restaurante' });
  }
});

app.patch('/api/admin/restaurants/:id/deny', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const restaurantId = Number(req.params.id);
  try {
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isActive: false, provisioningStatus: 'DENIED' }
    });
    console.log(`SuperAdmin ${req.userId} negou acesso ao restaurante ${restaurantId}`);
    await createAudit(req, 'deny_restaurant', 'restaurant', restaurantId, {});
    res.json(restaurant);
  } catch (error) {
    console.error('Error denying restaurant:', error);
    res.status(400).json({ error: 'Erro ao negar restaurante' });
  }
});

// Pause a restaurant (SUPER_ADMIN)
app.patch('/api/admin/restaurants/:id/pause', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const restaurantId = Number(req.params.id);
  try {
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isActive: false, provisioningStatus: 'PAUSED' }
    });
    console.log(`SuperAdmin ${req.userId} pausou restaurante ${restaurantId}`);
    await createAudit(req, 'pause_restaurant', 'restaurant', restaurantId, {});
    res.json(restaurant);
  } catch (error) {
    console.error('Error pausing restaurant:', error);
    res.status(400).json({ error: 'Erro ao pausar restaurante' });
  }
});

app.delete('/api/admin/restaurants/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const restaurantId = Number(req.params.id);
  try {
    const result = await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Restaurante não encontrado' });
    }
    console.log(`SuperAdmin ${req.userId} excluiu restaurante ${restaurantId}`);
    await createAudit(req, 'delete_restaurant', 'restaurant', restaurantId, {});
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(400).json({ error: 'Erro ao excluir restaurante' });
  }
});

app.post('/api/onboarding/create-store', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { restaurant: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (!user.isApproved && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Conta ainda não foi liberada' });
    }

    if (user.restaurantId) {
      return res.status(400).json({ error: 'Usuário já possui uma loja vinculada' });
    }

    const { restaurantName, slug, description, phone, logo } = req.body;
    const corporateName = String(req.body?.corporateName || '').trim() || null;
    const instagram = String(req.body?.instagram || '').trim() || null;
    const facebook = String(req.body?.facebook || '').trim() || null;

    if (!restaurantName || !slug) {
      return res.status(400).json({ error: 'Nome da loja e slug são obrigatórios' });
    }

    // Normalize CNPJ: remove non-digits and allow null/empty
    const cnpjString = String(req.body?.cnpj || '').trim();
    const cnpj = cnpjString ? normalizeCnpj(cnpjString) : null;

        if (cnpj && !isValidCnpj(cnpj)) {
      return res.status(400).json({ error: 'CNPJ inválido.' });
    }

    const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingRestaurant) {
      return res.status(400).json({ error: 'Slug já está em uso' });
    }

    if (cnpj) {
      const existingRestaurantByCnpj = await prisma.restaurant.findUnique({ where: { cnpj } });
      if (existingRestaurantByCnpj) {
        return res.status(400).json({ error: 'CNPJ já está em uso por outra loja.' });
      }
    }

    const plan = await prisma.plan.findFirst({ where: { tier: 'FREE' } });

    const restaurant = await prisma.$transaction(async (tx) => {
      const createdRestaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          corporateName,
          cnpj,
          slug,
          description,
          phone,
          logo: logo || '/logo.foodsystem.png',
          provisioningStatus: 'READY',
          databaseName: slug,
          planId: plan?.id,
          isActive: true,
          settings: {
            create: {
              storeName: restaurantName,
              bannerBadge: 'Sua marca, sua operação',
              bannerTitleLine1: 'Comece a vender',
              bannerTitleLine2: 'com controle total',
              bannerDescription: 'Abra sua loja, gerencie pedidos e personalize sua operação com o fluxo aprovado pela plataforma.',
              bannerCtaLabel: 'Publicar Loja',
              bannerImage: 'https://images.unsplash.com/photo-1556742205-9e9352e2f1f0?q=80&w=2000',
              logo: logo || '/logo.foodsystem.png',
              instagram,
              facebook,
            }
          }
        },
        include: {
          settings: true,
          users: true,
        }
      });

      await tx.user.update({
        where: { id: user.id },
        data: { restaurantId: createdRestaurant.id }
      });

      return createdRestaurant;
    });

    // Audit onboarding store creation
    await createAudit(req, 'create_store_onboarding', 'restaurant', restaurant.id, { slug: restaurant.slug, name: restaurant.name });

    const refreshedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { restaurant: true }
    });

    const token = jwt.sign(
      { id: refreshedUser!.id, role: refreshedUser!.role, restaurantId: refreshedUser!.restaurantId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ restaurant, user: refreshedUser, token });
  } catch (error) {
    console.error('Onboarding create-store error:', error);
    res.status(500).json({ error: 'Erro ao criar a loja' });
  }
});

// Aplicar middleware de tenant para todas as rotas subseqüentes /api
app.use('/api', tenantMiddleware);
app.use('/api', apiRouter);

// Settings
app.get('/api/settings', async (req: TenantRequest, res) => {
  const cachedSettings = readPublicStoreCache<any>('settings', req.restaurantId);
  if (cachedSettings) {
    return res.json(cachedSettings);
  }

  let settings = await prisma.settings.findUnique({
    where: { restaurantId: req.restaurantId },
    include: {
      restaurant: {
        select: {
          corporateName: true,
          cnpj: true,
          pixKey: true,
          pixKeyType: true,
          whatsappNumber: true,
          pixInstructions: true,
        },
      },
    },
  });

  // Evita 404 em ambientes de teste quando o registro de settings ainda não existe.
  if (!settings && req.restaurantId) {
    settings = await prisma.settings.create({
      data: {
        restaurantId: req.restaurantId,
        storeName: req.restaurant?.name || 'Minha Loja',
        phone: req.restaurant?.phone || null,
        logo: req.restaurant?.logo || null,
      },
      include: {
        restaurant: {
          select: {
            corporateName: true,
            cnpj: true,
            pixKey: true,
            pixKeyType: true,
            whatsappNumber: true,
            pixInstructions: true,
          },
        },
      },
    });
  }

  if (!settings) {
    return res.status(404).json({ error: 'Configurações não encontradas' });
  }

  const { restaurant, ...plainSettings } = settings;
  const effectivePixKey = plainSettings.pixKey || restaurant?.pixKey || null;
  const effectivePixEnabled = Boolean((plainSettings.pixEnabled && effectivePixKey) || restaurant?.pixKey);

  const responsePayload = {
    ...plainSettings,
    corporateName: restaurant?.corporateName || null,
    cnpj: restaurant?.cnpj || null,
    pixEnabled: effectivePixEnabled,
    pixKey: effectivePixKey,
    pixKeyType: restaurant?.pixKeyType || null,
    whatsappNumber: restaurant?.whatsappNumber || null,
    pixInstructions: restaurant?.pixInstructions || null,
    operatingHours: normalizeOperatingHours(plainSettings.operatingHours),
    isOpen: isRestaurantOpenNow(plainSettings.operatingHours),
    nextOpeningLabel: getNextOpeningLabel(plainSettings.operatingHours),
  };

  writePublicStoreCache('settings', req.restaurantId, responsePayload);
  res.json(responsePayload);
});

app.patch('/api/settings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, restaurantId, createdAt, updatedAt, nextOpeningLabel, isOpen, corporateName, cnpj, ...updateData } = req.body;
    const {
      pixKeyType,
      whatsappNumber,
      pixInstructions,
      restaurant: _ignoredRestaurant,
      ...settingsData
    } = updateData;
    const operatingHours = normalizeOperatingHours(updateData.operatingHours);
    const parsedDifferenceThreshold = Number(settingsData.cashDifferenceNoteThreshold);
    const cashDifferenceNoteThreshold = Number.isFinite(parsedDifferenceThreshold) && parsedDifferenceThreshold >= 0
      ? parsedDifferenceThreshold
      : DEFAULT_CASH_DIFFERENCE_NOTE_THRESHOLD;
    
    // Normalize CNPJ: remove non-digits and allow null/empty
    const cnpjString = String(cnpj || '').trim();
    const normalizedCnpj = cnpjString ? normalizeCnpj(cnpjString) : null;

    if (normalizedCnpj && !isValidCnpj(normalizedCnpj)) {
      return res.status(400).json({ error: 'CNPJ inválido.' });
    }

    if (normalizedCnpj) {
      const existingRestaurantByCnpj = await prisma.restaurant.findFirst({
        where: {
          cnpj: normalizedCnpj,
          id: { not: req.restaurantId },
        },
        select: { id: true },
      });

      if (existingRestaurantByCnpj) {
        return res.status(400).json({ error: 'CNPJ já está em uso por outra loja.' });
      }
    }

    const settings = await prisma.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id: req.restaurantId },
        data: {
          corporateName: String(corporateName || '').trim() || null,
          cnpj: normalizedCnpj,
        },
      });

      return tx.settings.update({
        where: { restaurantId: req.restaurantId },
        data: {
          ...settingsData,
          cashDifferenceNoteThreshold,
          operatingHours,
          isOpen: isRestaurantOpenNow(operatingHours),
          deliveryEtaMinutes: settingsData.deliveryEtaMinutes || 35,
        },
        include: {
          restaurant: {
            select: {
              corporateName: true,
              cnpj: true,
            },
          },
        },
      });
    });

    const { restaurant, ...plainSettings } = settings;
    invalidatePublicStoreCache(req.restaurantId);

    io.emit(`settings_updated_${req.restaurant?.slug}`, {
      ...plainSettings,
      corporateName: restaurant?.corporateName || null,
      cnpj: restaurant?.cnpj || null,
    });
    res.json({
      ...plainSettings,
      corporateName: restaurant?.corporateName || null,
      cnpj: restaurant?.cnpj || null,
      operatingHours: normalizeOperatingHours(plainSettings.operatingHours),
      isOpen: isRestaurantOpenNow(plainSettings.operatingHours),
      nextOpeningLabel: getNextOpeningLabel(plainSettings.operatingHours),
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(400).json({ error: 'Erro ao atualizar configurações.' });
  }
});

// Categories
app.get('/api/categories', async (req: TenantRequest, res) => {
  try {
    const cachedCategories = readPublicStoreCache<any[]>('categories', req.restaurantId);
    if (cachedCategories) {
      return res.json(cachedCategories);
    }

    const categories = await prisma.category.findMany({
      where: { restaurantId: req.restaurantId },
      include: { _count: { select: { products: true } } },
      orderBy: { order: 'asc' }
    });
    writePublicStoreCache('categories', req.restaurantId, categories);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

app.post('/api/categories', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    const { id, restaurantId: bodyRestaurantId, status, createdAt, updatedAt, products, _count, ...categoryData } = req.body;

    if (req.body.typeMontagem !== undefined) {
      categoryData.typeMontagem = req.body.typeMontagem;
    }

    if (req.body.guidedAssemblyConfig !== undefined) {
      categoryData.guidedAssemblyConfig = req.body.guidedAssemblyConfig;
    }

    if (categoryData.name) {
      categoryData.name = categoryData.name.toUpperCase().trim();
    }

    categoryData.slug = await getUniqueCategorySlug(
      restaurantId,
      categoryData.slug || categoryData.name
    );

    // Verificar limite de categorias do plano
    const categoryCount = await prisma.category.count({
      where: { restaurantId }
    });

    const maxCategories = req.restaurant?.plan?.maxCategories || 5;

    if (categoryCount >= maxCategories) {
      return res.status(403).json({
        error: `Limite de categorias atingido (${maxCategories}). Faça upgrade do seu plano.`
      });
    }

    const category = await prisma.category.create({
      data: { ...categoryData, restaurantId }
    });
    invalidatePublicStoreCache(restaurantId);
    res.status(201).json(category);
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(400).json({ error: error?.message || 'Erro ao criar categoria.' });
  }
});

app.patch('/api/categories/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    const id = parseInt(req.params.id);
    const { id: bodyId, restaurantId: bodyRestaurantId, products, status, createdAt, updatedAt, _count, ...updateData } = req.body;

    if (req.body.typeMontagem !== undefined) {
      updateData.typeMontagem = req.body.typeMontagem;
    }

    if (req.body.guidedAssemblyConfig !== undefined) {
      updateData.guidedAssemblyConfig = req.body.guidedAssemblyConfig;
    }

    if (updateData.name) {
      updateData.name = updateData.name.toUpperCase().trim();
    }

    if (updateData.slug || updateData.name) {
      updateData.slug = await getUniqueCategorySlug(
        restaurantId,
        updateData.slug || updateData.name,
        id
      );
    }

    const result = await prisma.category.updateMany({
      where: {
        id,
        restaurantId
      },
      data: updateData
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada ou sem permissão.' });
    }

    const category = await prisma.category.findUnique({ where: { id } });
    invalidatePublicStoreCache(restaurantId);
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(400).json({ error: 'Erro ao atualizar categoria.' });
  }
});

app.delete('/api/categories/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await prisma.category.deleteMany({
      where: {
        id: parseInt(req.params.id),
        restaurantId: req.restaurantId
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada ou sem permissão.' });
    }

    invalidatePublicStoreCache(req.restaurantId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(400).json({ error: 'Erro ao excluir categoria. Ela pode conter produtos vinculados.' });
  }
});

// Products
app.get('/api/products', async (req: TenantRequest, res) => {
  try {
    const cachedProducts = readPublicStoreCache<any[]>('products', req.restaurantId);
    if (cachedProducts) {
      return res.json(cachedProducts);
    }

    const products = await prisma.product.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: [
        { categoryId: 'asc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        isActive: true,
        isFeatured: true,
        discountPercent: true,
        stockQuantity: true,
        trackStock: true,
        restaurantId: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
        addons: true,
        ingredients: true,
        sizes: true,
        usesGuidedAssembly: true,
        guidedAssemblyConfig: true,
      }
    });
    writePublicStoreCache('products', req.restaurantId, products);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/products', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, restaurantId, status, createdAt, updatedAt, category, ...productData } = req.body;

    if (req.body.usesGuidedAssembly !== undefined) {
      productData.usesGuidedAssembly = req.body.usesGuidedAssembly;
    }

    if (req.body.guidedAssemblyConfig !== undefined) {
      productData.guidedAssemblyConfig = req.body.guidedAssemblyConfig;
    }

    // Converter categoryId para Int se vier como string
    if (productData.categoryId) {
      productData.categoryId = parseInt(productData.categoryId);
    }

    // Normalizar para CAIXA ALTA
    if (productData.name) productData.name = productData.name.toUpperCase().trim();
    if (productData.addons) productData.addons = (productData.addons as any[]).map(a => ({ ...a, name: a.name.toUpperCase().trim() }));
    if (productData.sizes) productData.sizes = (productData.sizes as any[]).map(s => ({ ...s, name: s.name.toUpperCase().trim() }));
    if (productData.ingredients) productData.ingredients = (productData.ingredients as string[]).map(i => i.toUpperCase().trim());
    productData.discountPercent = Math.max(0, Math.min(100, Number(productData.discountPercent || 0)));

    if (productData.usesGuidedAssembly && productData.guidedAssemblyConfig) {
      const category = await prisma.category.findFirst({
        where: { id: productData.categoryId, restaurantId: req.restaurantId },
        select: { id: true, name: true, typeMontagem: true }
      }) as any;
      if (!category || category.typeMontagem !== 'guiada_por_etapas') {
        return res.status(400).json({ error: 'Produtos com montagem guiada precisam estar em uma categoria com tipo_montagem = guiada_por_etapas.' });
      }
    }

    // Verificar limite de produtos do plano
    const productCount = await prisma.product.count({
      where: { restaurantId: req.restaurantId }
    });

    const maxProducts = req.restaurant?.plan?.maxProducts || 10;

    if (productCount >= maxProducts) {
      return res.status(403).json({
        error: `Limite de produtos atingido (${maxProducts}). Faça upgrade do seu plano.`
      });
    }

    const product = await prisma.product.create({
      data: { ...productData, restaurantId: req.restaurantId }
    });
    invalidatePublicStoreCache(req.restaurantId);
    const allProducts = await prisma.product.findMany({ where: { restaurantId: req.restaurantId } });
    io.emit(`products_updated_${req.restaurant?.slug}`, allProducts);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ error: 'Erro ao criar produto. Verifique se todos os campos foram preenchidos corretamente.' });
  }
});

app.patch('/api/products/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { id: bodyId, restaurantId, createdAt, updatedAt, category, status, ...updateData } = req.body;

    if (req.body.usesGuidedAssembly !== undefined) {
      updateData.usesGuidedAssembly = req.body.usesGuidedAssembly;
    }

    if (req.body.guidedAssemblyConfig !== undefined) {
      updateData.guidedAssemblyConfig = req.body.guidedAssemblyConfig;
    }

    // Converter categoryId para Int se vier como string
    if (updateData.categoryId) {
      updateData.categoryId = parseInt(updateData.categoryId);
    }

    // Normalizar para CAIXA ALTA
    if (updateData.name) updateData.name = updateData.name.toUpperCase().trim();
    if (updateData.addons) updateData.addons = (updateData.addons as any[]).map(a => ({ ...a, name: a.name.toUpperCase().trim() }));
    if (updateData.sizes) updateData.sizes = (updateData.sizes as any[]).map(s => ({ ...s, name: s.name.toUpperCase().trim() }));
    if (updateData.ingredients) updateData.ingredients = (updateData.ingredients as string[]).map(i => i.toUpperCase().trim());
    updateData.discountPercent = Math.max(0, Math.min(100, Number(updateData.discountPercent || 0)));

    // Usamos updateMany para garantir que o produto pertence ao restaurante
    const result = await prisma.product.updateMany({
      where: {
        id,
        restaurantId: req.restaurantId
      },
      data: updateData
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Produto não encontrado ou sem permissão.' });
    }

    const product = await prisma.product.findUnique({ where: { id } });
  invalidatePublicStoreCache(req.restaurantId);
    const allProducts = await prisma.product.findMany({ where: { restaurantId: req.restaurantId } });
    io.emit(`products_updated_${req.restaurant?.slug}`, allProducts);
    res.json(product);
  } catch (error: any) {
    console.error('Error updating product:', error);
    const errorMessage = error?.code === 'P2002' 
      ? 'Um produto com este nome já existe nesta categoria.' 
      : error?.message || 'Erro ao atualizar produto.';
    res.status(400).json({ error: errorMessage });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await prisma.product.deleteMany({
      where: {
        id: parseInt(req.params.id),
        restaurantId: req.restaurantId
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Produto não encontrado ou sem permissão.' });
    }

    invalidatePublicStoreCache(req.restaurantId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(400).json({ error: 'Erro ao excluir produto.' });
  }
});

// Orders
app.get('/api/customer/orders/:phone', async (req: TenantRequest, res) => {
  try {
    const { phone } = req.params;
    const customerName = typeof req.query.customerName === 'string' ? req.query.customerName.trim() : '';
    const orders = await prisma.order.findMany({
      where: {
        phone,
        restaurantId: req.restaurantId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: true,
          }
        },
        customer: true,
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

app.get('/api/orders', authMiddleware, async (req: AuthRequest, res) => {
  const { filter } = req.query;
  
  const where: any = { restaurantId: req.restaurantId };
  
  // Se o filtro for 'today', mostramos apenas pedidos de hoje ou pedidos que não estão finalizados/cancelados
  if (filter === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pegamos a sessão aberta para filtrar os pedidos de hoje por ela
    const activeSession = await prisma.cashSession.findFirst({
      where: { restaurantId: req.restaurantId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' }
    });
    
    where.AND = [
      { restaurantId: req.restaurantId },
      {
        OR: [
          // 1. Pedidos desta sessão que ainda NÃO foram totalmente finalizados (Entregues/Pagos)
          ...(activeSession ? [{ 
            AND: [
              { cashSessionId: activeSession.id },
              { status: { notIn: ['PAID', 'DELIVERED', 'RETIRED', 'CANCELLED'] } }
            ]
          }] : []),
          
          // 2. Pedidos "Sobreviventes": Criados hoje (ou antes), mas que ainda estão ativos/pendentes
          { 
            status: { in: ['PENDING', 'OPEN', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] }
          }
        ]
      }
    ];

    // Removemos o restaurantId do nível superior pois já está dentro do AND
    delete where.restaurantId;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      },
      customer: true
    }
  });
  res.json(orders);
});

app.post('/api/orders', async (req: TenantRequest, res) => {
  try {
    const { customerName, phone, address, paymentMethod, items, subtotal, deliveryFee, total, notes, cpf, changeFor, tableNumber } = req.body;

    const normalizedItems = Array.isArray(items)
      ? items.map((item: any) => ({
        productId: Number(item.productId || item.id),
        name: item.name,
        variation: item.variation,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        observations: item.observations,
        addons: item.addons,
        removals: item.removals,
        guidedAssemblySelections: normalizeGuidedAssemblySelections(item),
      }))
      : [];

    if (normalizedItems.length === 0) {
      return res.status(400).json({ error: 'Pedido sem itens.' });
    }

    if (normalizedItems.some((item: any) => !item.productId || item.quantity <= 0)) {
      return res.status(400).json({ error: 'Itens do pedido inválidos.' });
    }

    // --- CHECK ORDER LIMIT (MONTHLY) ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const orderCount = await prisma.order.count({
      where: {
        restaurantId: req.restaurantId!,
        createdAt: { gte: startOfMonth },
        OR: [
          { notes: null },
          { notes: { not: { startsWith: '[VENDA_DIRETA]' } } }
        ]
      }
    });

    const maxOrders = req.restaurant?.plan?.maxOrders || 1000;

    if (orderCount >= maxOrders) {
      console.warn(`[OrderLimit] Bloqueando pedido para restaurantId=${req.restaurantId}. Count=${orderCount}, Limit=${maxOrders}`);
      return res.status(403).json({
        error: `Limite de pedidos mensais atingido (${maxOrders}). Faça upgrade do seu plano para continuar recebendo pedidos.`
      });
    }
    // -----------------------------------

    const settings = await prisma.settings.findUnique({
      where: { restaurantId: req.restaurantId! }
    });

    if (settings && !isRestaurantOpenNow(settings.operatingHours)) {
      console.warn(`[OrderBlocked] Restaurante fechado: restaurantId=${req.restaurantId}`);
      return res.status(403).json({
        error: 'Restaurante fechado no momento.',
        nextOpeningLabel: getNextOpeningLabel(settings.operatingHours)
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      const productIds = [...new Set(normalizedItems.map((item: any) => item.productId))];

      const products = await tx.product.findMany({
        where: {
          restaurantId: req.restaurantId!,
          id: { in: productIds },
        },
        select: {
          id: true,
          name: true,
          trackStock: true,
          stockQuantity: true,
          categoryId: true,
        },
      });

      const productMap = new Map(products.map((product: any) => [product.id, product]));

      for (const item of normalizedItems) {
        const product = productMap.get(item.productId);

        if (product) {
          const productWithConfig = await tx.product.findUnique({
            where: { id: product.id },
            select: { id: true, categoryId: true, addons: true, guidedAssemblyConfig: true, usesGuidedAssembly: true }
          });

          const category = await tx.category.findUnique({
            where: { id: productWithConfig?.categoryId },
            select: { id: true, name: true, slug: true, guidedAssemblyConfig: true, typeMontagem: true }
          }) as any;

          if ((item.guidedAssemblySelections?.length || 0) > 0) {
            const guidedGroups = getGuidedAssemblyGroups(productWithConfig, category);
            const selections = normalizeGuidedAssemblySelections(item);

            if (guidedGroups) {
              validateGuidedSelections(guidedGroups, selections);
            }
          }
        }

        if (!product) {
          throw new Error('PRODUCT_NOT_FOUND');
        }

        if (product.trackStock) {
          const stockUpdated = await tx.product.updateMany({
            where: {
              id: item.productId,
              restaurantId: req.restaurantId!,
              trackStock: true,
              stockQuantity: { gte: item.quantity },
            },
            data: {
              stockQuantity: { decrement: item.quantity },
            },
          });

          if (stockUpdated.count === 0) {
            throw new Error(`OUT_OF_STOCK:${product.name}`);
          }
        }
      }

      let customerId: number | undefined;
      const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';

      if (normalizedPhone) {
        const existingCustomer = await tx.customer.findFirst({
          where: {
            restaurantId: req.restaurantId!,
            phone: normalizedPhone,
          },
        });

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const createdCustomer = await tx.customer.create({
            data: {
              restaurantId: req.restaurantId!,
              name: customerName || 'Cliente',
              phone: normalizedPhone,
            },
          });
          customerId = createdCustomer.id;
        }
      }

    const activeSession = await prisma.cashSession.findFirst({
      where: {
        restaurantId: req.restaurantId,
        status: 'OPEN',
      },
      orderBy: { openedAt: 'desc' },
    });

    return tx.order.create({
      data: {
        customerName,
        phone,
        address,
        paymentMethod,
        cpf,
        changeFor,
        subtotal: subtotal || (total - (deliveryFee || 0)),
        deliveryFee: deliveryFee || 0,
        total,
        notes,
        tableNumber: tableNumber ? Number(tableNumber) : null,
        restaurantId: req.restaurantId!,
        customerId,
        cashSessionId: activeSession ? activeSession.id : null,
        status: 'PENDING',
        items: {
            create: normalizedItems.map((item: any) => ({
              productId: item.productId,
              name: item.name,
              variation: item.variation,
              quantity: item.quantity,
              price: item.price,
              observations: item.observations,
              addons: item.addons,
              removals: item.removals,
              guidedAssemblySelections: item.guidedAssemblySelections,
            })),
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });
    });

    const responseOrder = {
      ...order,
      estimatedDeliveryMinutes: settings?.deliveryEtaMinutes || 35,
    };

    // TODO: Auto-print de pedidos quando impressoras forem configuradas
    // const activePrintDevice = await getPrimaryPrintDevice(req.restaurantId!);
    // if (activePrintDevice?.autoPrintOrders) { ... }

    io.emit(`new_order_${req.restaurant?.slug}`, responseOrder);
    res.status(201).json(responseOrder);
  } catch (error) {
    console.error('Error creating order:', error);

    if (error instanceof Error) {
      if (error.message.startsWith('OUT_OF_STOCK:')) {
        const productName = error.message.split(':')[1] || 'produto';
        return res.status(409).json({ error: `Estoque insuficiente para ${productName}.` });
      }

      if (error.message === 'PRODUCT_NOT_FOUND') {
        return res.status(400).json({ error: 'Um ou mais itens do pedido não existem mais.' });
      }
    }

    res.status(400).json({ error: 'Erro ao processar pedido. Verifique os dados.' });
  }
});

// Mesas
app.get('/api/tables', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { restaurantId: req.restaurantId },
      select: { tableCount: true },
    });

    const activeOrders = await prisma.order.findMany({
      where: {
        restaurantId: req.restaurantId,
        tableNumber: { not: null },
        status: { notIn: ['PAID', 'CANCELLED', 'DELIVERED', 'RETIRED'] },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    const tableCount = settings?.tableCount || 0;
    const tables = Array.from({ length: tableCount }, (_, i) => {
      const tableNumber = i + 1;
      const orders = activeOrders.filter((o) => o.tableNumber === tableNumber);
      return {
        tableNumber,
        isOccupied: orders.length > 0,
        orders,
      };
    });

    res.json(tables);
  } catch (error) {
    console.error('Erro ao buscar mesas:', error);
    res.status(500).json({ error: 'Erro ao buscar mesas.' });
  }
});

// Adicionar itens a um pedido existente (Mesa em Aberto)
app.post('/api/orders/:id/items', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const orderId = Number.parseInt(req.params.id, 10);
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Nenhum item informado.' });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: req.restaurantId },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const normalizedItems = items.map((item: any) => ({
      orderId,
      productId: Number(item.productId || item.id),
      name: item.name,
      variation: item.variation,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      observations: item.observations,
      addons: item.addons,
      removals: item.removals,
    }));

    const result = await prisma.$transaction(async (tx) => {
      // Registrar os novos itens
      await tx.orderItem.createMany({
        data: normalizedItems,
      });

      // Recalcular totais do pedido
      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const newSubtotal = allItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const newTotal = newSubtotal + (order.deliveryFee || 0);

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: newSubtotal,
          total: newTotal,
        },
        include: {
          items: true,
          customer: true,
        },
      });

      return updatedOrder;
    });

    if (order.status !== 'PAID') {
      io.emit(`new_order_${req.restaurant?.slug}`, result);
    }
    
    io.emit(`order_updated_${req.restaurant?.slug}`, result);
    res.json(result);
  } catch (error) {
    console.error('Erro ao adicionar itens ao pedido:', error);
    res.status(400).json({ error: 'Erro ao adicionar itens.' });
  }
});

app.patch('/api/orders/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const orderId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(orderId)) {
      return res.status(400).json({ error: 'ID do pedido inválido.' });
    }

    const nextStatus = String(req.body?.status || '').trim().toUpperCase();
    const paymentMethod = req.body?.paymentMethod ? String(req.body.paymentMethod).toUpperCase() : null;

    if (!nextStatus) {
      return res.status(400).json({ error: 'Status é obrigatório.' });
    }

    if (nextStatus === 'PAID' && !paymentMethod) {
      // Se estiver finalizando o pedido (PAID), a forma de pagamento passa a ser obrigatória
      const existingPayment = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentMethod: true } });
      if (!existingPayment?.paymentMethod) {
        return res.status(400).json({ error: 'Forma de pagamento é obrigatória para finalizar o pedido.' });
      }
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: req.restaurantId,
      },
      select: {
        id: true,
        status: true,
        address: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const orderMode = getOrderModeFromAddress(order.address);
    const allowedTransitions = ORDER_STATUS_FLOW_BY_MODE[orderMode][order.status] || [];

    if (!allowedTransitions.includes(nextStatus)) {
      // Se for um pedido antigo (RETIRED ou DELIVERED) e estivermos tentando marcar como PAID,
      // abrimos uma exceção para permitir a liquidação financeira.
      const isForcePaid = nextStatus === 'PAID' && ['RETIRED', 'DELIVERED'].includes(order.status);
      
      if (!isForcePaid) {
        return res.status(409).json({
          error: `Transição inválida para ${orderMode}.`,
          currentStatus: order.status,
          attemptedStatus: nextStatus,
          orderMode,
          allowedTransitions,
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: {
        id: orderId,
        restaurantId: req.restaurantId,
      },
      data: { 
        status: nextStatus as OrderStatus,
        paymentMethod: (paymentMethod ? (paymentMethod as PaymentMethod) : undefined) as any,
        // Ao marcar como pago ou mudar status durante um turno, garante que o pedido se vincule ao caixa atual se ainda não tiver vínculo
        ...(nextStatus === 'PAID' ? {
          cashSessionId: await prisma.cashSession.findFirst({
            where: { restaurantId: req.restaurantId, status: 'OPEN' },
            orderBy: { openedAt: 'desc' },
            select: { id: true }
          }).then(s => s?.id || null)
        } : {})
      },
    });

    io.emit(`order_status_updated_${req.restaurant?.slug}`, updatedOrder);
    res.json(updatedOrder);
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(400).json({ error: 'Erro ao atualizar status do pedido.' });
  }
});

// Cashier (Caixa)
app.get('/api/cashier/session', authMiddleware, async (req: AuthRequest, res) => {
  if (!ensureCashierPermission(req, res, CASHIER_OPERATION_ROLES, 'consultar o caixa')) {
    return;
  }

  try {
    const activeSession = await prisma.cashSession.findFirst({
      where: {
        restaurantId: req.restaurantId,
        status: 'OPEN',
      },
      orderBy: { openedAt: 'desc' },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!activeSession) {
      return res.json({
        session: null,
        totals: {
          supplies: 0,
          withdrawals: 0,
          adjustments: 0,
          movementsCount: 0,
          sales: 0,
          cashSales: 0,
          expectedAmount: 0,
        },
      });
    }

    const movements = await prisma.cashMovement.findMany({
      where: { cashSessionId: activeSession.id },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      take: 20,
    });

    const [suppliesAgg, withdrawalsAgg, adjustmentsAgg, salesAgg, cashSalesAgg, cardSalesAgg, debitSalesAgg, creditSalesAgg, pixSalesAgg, movementsCount, sessionOrders] = await Promise.all([
      prisma.cashMovement.aggregate({
        where: { cashSessionId: activeSession.id, type: 'SUPPLY' },
        _sum: { amount: true },
      }),
      prisma.cashMovement.aggregate({
        where: { cashSessionId: activeSession.id, type: 'WITHDRAWAL' },
        _sum: { amount: true },
      }),
      prisma.cashMovement.aggregate({
        where: { cashSessionId: activeSession.id, type: 'ADJUSTMENT' },
        _sum: { amount: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          cashSessionId: activeSession.id,
          status: { in: CASH_COUNTED_ORDER_STATUSES },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          cashSessionId: activeSession.id,
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CASH',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          cashSessionId: activeSession.id,
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CARD',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          cashSessionId: activeSession.id,
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'DEBIT',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          cashSessionId: activeSession.id,
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CREDIT',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          cashSessionId: activeSession.id,
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'PIX',
        },
        _sum: { total: true },
      }),
      prisma.cashMovement.count({
        where: { cashSessionId: activeSession.id },
      }),
      prisma.order.findMany({
        where: {
          restaurantId: req.restaurantId,
          cashSessionId: activeSession.id,
          status: { in: CASH_COUNTED_ORDER_STATUSES },
        },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
        take: 50,
      }),
    ]);

    const supplies = Number(suppliesAgg._sum.amount || 0);
    const withdrawals = Number(withdrawalsAgg._sum.amount || 0);
    const adjustments = Number(adjustmentsAgg._sum.amount || 0);
    const sales = Number(salesAgg._sum.total || 0);
    const cashSales = Number(cashSalesAgg._sum.total || 0);
    const cardSales = Number(cardSalesAgg._sum.total || 0);
    const debitSales = Number(debitSalesAgg._sum.total || 0);
    const creditSales = Number(creditSalesAgg._sum.total || 0);
    const pixSales = Number(pixSalesAgg._sum.total || 0);
    const expectedAmount = Number((activeSession.openingAmount + supplies - withdrawals + adjustments + cashSales).toFixed(2));

    return res.json({
      session: activeSession,
      movements,
      orders: sessionOrders,
      totals: {
        supplies,
        withdrawals,
        adjustments,
        movementsCount,
        sales,
        cashSales,
        cardSales,
        debitSales,
        creditSales,
        pixSales,
        expectedAmount,
      },
    });
  } catch (error) {
    console.error('Error fetching cashier session:', error);
    res.status(500).json({ error: 'Erro ao carregar sessão de caixa.' });
  }
});

app.post('/api/cashier/session/open', authMiddleware, async (req: AuthRequest, res) => {
  if (!ensureCashierPermission(req, res, CASHIER_OPEN_CLOSE_ROLES, 'abrir o caixa')) {
    return;
  }

  try {
    const openingAmount = Number(req.body?.openingAmount);
    const notes = req.body?.notes ? String(req.body.notes) : null;

    if (Number.isNaN(openingAmount) || openingAmount <= 0) {
      return res.status(400).json({ error: 'Valor de abertura inválido.' });
    }

    const existing = await prisma.cashSession.findFirst({
      where: {
        restaurantId: req.restaurantId,
        status: 'OPEN',
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Já existe uma sessão de caixa aberta.' });
    }

    const session = await prisma.cashSession.create({
      data: {
        restaurantId: req.restaurantId!,
        openedById: req.userId,
        openingAmount,
        notes,
        status: 'OPEN',
      },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await createAudit(req, 'open_cash_session', 'cash_session', session.id, {
      openingAmount,
      notes,
    });

    // Verificar pedidos pendentes criados antes da abertura desta sessão
    const preOpeningOrders = await prisma.order.findMany({
      where: {
        restaurantId: req.restaurantId!,
        status: { in: ['PENDING', 'PREPARING'] },
        createdAt: { lt: session.openedAt },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        id: true,
        customerName: true,
        total: true,
        createdAt: true,
        paymentMethod: true,
        status: true,
      },
    });

    res.status(201).json({ ...session, preOpeningOrders });
  } catch (error) {
    if ((error as any)?.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe uma sessão de caixa aberta.' });
    }

    console.error('Error opening cashier session:', error);
    res.status(500).json({ error: 'Erro ao abrir sessão de caixa.' });
  }
});

app.post('/api/cashier/movements', authMiddleware, async (req: AuthRequest, res) => {
  if (!ensureCashierPermission(req, res, CASHIER_OPERATION_ROLES, 'registrar movimentos de caixa')) {
    return;
  }

  try {
    const type = String(req.body?.type || '');
    const amount = Number(req.body?.amount || 0);
    const reason = req.body?.reason ? String(req.body.reason).trim() : null;
    const notes = req.body?.notes ? String(req.body.notes) : null;

    if (!['SUPPLY', 'WITHDRAWAL', 'ADJUSTMENT'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de movimento inválido.' });
    }

    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valor do movimento inválido.' });
    }

    if (['WITHDRAWAL', 'ADJUSTMENT'].includes(type) && !reason) {
      return res.status(400).json({ error: 'Motivo é obrigatório para sangria e ajuste.' });
    }

    const activeSession = await prisma.cashSession.findFirst({
      where: {
        restaurantId: req.restaurantId,
        status: 'OPEN',
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!activeSession) {
      return res.status(409).json({ error: 'Nenhuma sessão de caixa aberta.' });
    }

    const movement = await prisma.cashMovement.create({
      data: {
        cashSessionId: activeSession.id,
        restaurantId: req.restaurantId!,
        createdById: req.userId,
        type: type as any,
        amount,
        reason,
        notes,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await createAudit(req, 'create_cash_movement', 'cash_movement', movement.id, {
      type,
      amount,
      reason,
      cashSessionId: activeSession.id,
    });

    res.status(201).json(movement);
  } catch (error) {
    console.error('Error creating cash movement:', error);
    res.status(500).json({ error: 'Erro ao registrar movimento de caixa.' });
  }
});

app.post('/api/cashier/direct-sales', authMiddleware, async (req: AuthRequest, res) => {
  if (!ensureCashierPermission(req, res, CASHIER_OPERATION_ROLES, 'registrar venda direta')) {
    return;
  }

  try {
    const paymentMethod = String(req.body?.paymentMethod || '').toUpperCase();
    const items = Array.isArray(req.body?.items)
      ? req.body.items.map((item: any) => ({
        productId: Number(item.productId || item.id),
        quantity: Number(item.quantity || 0),
        observations: item.observations ? String(item.observations).trim() : null,
        addons: Array.isArray(item.addons) ? item.addons : [],
        removals: Array.isArray(item.removals) ? item.removals : [],
      }))
      : [];
    const cashReceivedAmount = req.body?.cashReceivedAmount !== undefined && req.body?.cashReceivedAmount !== null
      ? Number(req.body.cashReceivedAmount)
      : null;
    const customerName = req.body?.customerName ? String(req.body.customerName).trim() : 'Venda Balcao';
    const notes = req.body?.notes ? String(req.body.notes).trim() : null;
    const tableNumber = req.body?.tableNumber ? Number(req.body.tableNumber) : null;
    const sendToKitchen = Boolean(req.body?.sendToKitchen);

    // Permitir pagamento nulo apenas se for uma mesa ou se solicitado explicitamente como 'OPEN' (Venda Balcão Pendente)
    const isValidPayment = ['PIX', 'CASH', 'CARD', 'DEBIT', 'CREDIT'].includes(paymentMethod);
    const isPendingPayment = paymentMethod === 'OPEN';

    if (!isValidPayment && !isPendingPayment && !tableNumber) {
      return res.status(400).json({ error: 'Forma de pagamento obrigatoria para vendas sem mesa.' });
    }

    if (items.length === 0 || items.some((item: any) => !item.productId || item.quantity <= 0)) {
      return res.status(400).json({ error: 'Informe ao menos 1 produto valido para a venda direta.' });
    }

    const activeSession = await prisma.cashSession.findFirst({
      where: {
        restaurantId: req.restaurantId,
        status: 'OPEN',
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!activeSession) {
      return res.status(409).json({ error: 'Abra o caixa antes de registrar venda direta.' });
    }

    const order = await prisma.$transaction(async (tx) => {
      const productIds = Array.from(new Set<number>(
        items
          .map((item: any) => Number(item.productId))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      ));

      const products = await tx.product.findMany({
        where: {
          restaurantId: req.restaurantId!,
          id: { in: productIds },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          discountPercent: true,
          trackStock: true,
          stockQuantity: true,
        },
      });

      const productMap = new Map(products.map((product: any) => [product.id, product]));

      const normalizedItems = items.map((itemSnapshot: any) => {
        const product = productMap.get(itemSnapshot.productId);
        if (!product) {
          throw new Error('PRODUCT_NOT_FOUND');
        }

        const unitPrice = Number((product.price * (1 - (Number(product.discountPercent || 0) / 100))).toFixed(2));
        const addonsTotal = Array.isArray(itemSnapshot.addons)
          ? itemSnapshot.addons.reduce((acc: number, a: any) => acc + (Number(a.price) || 0), 0)
          : 0;
        const finalUnitPrice = unitPrice + addonsTotal;

        return {
          productId: product.id,
          name: product.name,
          quantity: itemSnapshot.quantity,
          price: finalUnitPrice,
          total: Number((finalUnitPrice * itemSnapshot.quantity).toFixed(2)),
          trackStock: Boolean(product.trackStock),
          observations: itemSnapshot.observations,
          addons: itemSnapshot.addons || [],
          removals: itemSnapshot.removals || [],
        };
      });

      for (const item of normalizedItems) {
        if (item.trackStock) {
          const stockUpdated = await tx.product.updateMany({
            where: {
              id: item.productId,
              restaurantId: req.restaurantId!,
              trackStock: true,
              stockQuantity: { gte: item.quantity },
            },
            data: {
              stockQuantity: { decrement: item.quantity },
            },
          });

          if (stockUpdated.count === 0) {
            throw new Error(`OUT_OF_STOCK:${item.name}`);
          }
        }
      }

      const subtotal = Number(normalizedItems.reduce((acc: number, item: any) => acc + item.total, 0).toFixed(2));

      if (paymentMethod === 'CASH' && (cashReceivedAmount === null || Number.isNaN(cashReceivedAmount) || cashReceivedAmount < subtotal)) {
        throw new Error('INVALID_CASH_RECEIVED');
      }

      const changeDue = paymentMethod === 'CASH' && cashReceivedAmount !== null
        ? Number((cashReceivedAmount - subtotal).toFixed(2))
        : 0;

      return tx.order.create({
        data: {
          customerName,
          paymentMethod: (isValidPayment ? (paymentMethod as PaymentMethod) : null) as any,
          subtotal,
          deliveryFee: 0,
          total: subtotal,
          notes: notes ? `[VENDA_DIRETA] ${notes}` : '[VENDA_DIRETA]',
          tableNumber,
          changeFor: paymentMethod === 'CASH' && cashReceivedAmount !== null ? String(cashReceivedAmount) : null,
          cashSessionId: activeSession.id,
          address: {
            type: tableNumber ? 'DINE_IN' : 'PICKUP',
            details: {
              source: 'DIRECT_CASHIER',
              cashSessionId: activeSession.id,
              cashReceivedAmount,
              changeDue,
            },
          },
          restaurantId: req.restaurantId!,
          status: (tableNumber || isPendingPayment) ? 'OPEN' : 'PAID',
          items: {
            create: normalizedItems.map((item: any) => ({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              observations: item.observations,
              addons: item.addons,
              removals: item.removals,
            })),
          },
        },
      });
    });

    await createAudit(req, 'create_direct_sale', 'order', order.id, {
      items,
      total: order.total,
      paymentMethod,
      cashReceivedAmount,
      changeDue: paymentMethod === 'CASH' && cashReceivedAmount !== null ? Number((cashReceivedAmount - order.total).toFixed(2)) : 0,
      cashSessionId: activeSession.id,
      notes,
      tableNumber,
    });

    if (sendToKitchen) {
      io.emit(`new_order_${req.restaurant?.slug}`, order);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating direct sale:', error);
    if (error instanceof Error) {
      if (error.message.startsWith('OUT_OF_STOCK:')) {
        const productName = error.message.split(':')[1] || 'produto';
        return res.status(409).json({ error: `Estoque insuficiente para ${productName}.` });
      }

      if (error.message === 'PRODUCT_NOT_FOUND') {
        return res.status(400).json({ error: 'Um ou mais produtos nao estao disponiveis para venda direta.' });
      }

      if (error.message === 'INVALID_CASH_RECEIVED') {
        return res.status(400).json({ error: 'Valor recebido em dinheiro deve ser maior ou igual ao total da venda.' });
      }
    }

    res.status(500).json({ error: 'Erro ao registrar venda direta.' });
  }
});

app.post('/api/assets/image', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { dataUrl, folder } = req.body as { dataUrl?: string; folder?: string };

    if (!req.restaurantId) {
      return res.status(403).json({ error: 'Restaurante não identificado para upload.' });
    }

    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'dataUrl é obrigatório.' });
    }

    if (!dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Formato de imagem inválido.' });
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'Data URL inválida.' });
    }

    const bytes = Buffer.from(parsed.base64, 'base64');
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (bytes.length > maxSizeInBytes) {
      return res.status(413).json({ error: 'Imagem muito grande. Limite de 5MB.' });
    }

    const safeFolder = sanitizeAssetFolder(folder);
    const targetDir = path.join(UPLOADS_ROOT, String(req.restaurantId), safeFolder);
    await fs.mkdir(targetDir, { recursive: true });

    const extension = parsed.mime.includes('png') ? 'png' : parsed.mime.includes('jpeg') || parsed.mime.includes('jpg') ? 'jpg' : 'webp';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
    const filePath = path.join(targetDir, fileName);

    await fs.writeFile(filePath, bytes);

    const relativeUrl = `/uploads/${req.restaurantId}/${safeFolder}/${fileName}`;
    const absoluteUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;

    return res.status(201).json({ url: absoluteUrl, relativeUrl });
  } catch (error) {
    console.error('Erro no upload de imagem:', error);
    return res.status(500).json({ error: 'Erro ao enviar imagem.' });
  }
});

app.post('/api/cashier/session/close', authMiddleware, async (req: AuthRequest, res) => {
  if (!ensureCashierPermission(req, res, CASHIER_OPEN_CLOSE_ROLES, 'fechar o caixa')) {
    return;
  }

  try {
    const closingAmount = Number(req.body?.closingAmount || 0);
    const informedCardAmount = Number(req.body?.informedCardAmount || 0);
    const informedPixAmount = Number(req.body?.informedPixAmount || 0);
    const notes = req.body?.notes ? String(req.body.notes) : null;

    if (Number.isNaN(closingAmount) || closingAmount < 0) {
      return res.status(400).json({ error: 'Valor de fechamento inválido.' });
    }

    const activeSession = await prisma.cashSession.findFirst({
      where: {
        restaurantId: req.restaurantId,
        status: 'OPEN',
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!activeSession) {
      return res.status(409).json({ error: 'Nenhuma sessão de caixa aberta.' });
    }

    // Bloquear fechamento se houver pedidos em aberto
    const activeOrdersCount = await prisma.order.count({
      where: {
        restaurantId: req.restaurantId,
        status: { in: ['PENDING', 'OPEN', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] },
      },
    });

    if (activeOrdersCount > 0) {
      return res.status(400).json({
        error: `Não é possível fechar o caixa. Existem ${activeOrdersCount} conta(s) em aberto (Mesa ou Balcão). Finalize todos os pagamentos antes de fechar o turno.`,
      });
    }

    const [suppliesAgg, withdrawalsAgg, adjustmentsAgg, salesAgg, cashSalesAgg, debitSalesAgg, creditSalesAgg, cardSalesAgg, pixSalesAgg, settings] = await Promise.all([
      prisma.cashMovement.aggregate({
        where: { cashSessionId: activeSession.id, type: 'SUPPLY' },
        _sum: { amount: true },
      }),
      prisma.cashMovement.aggregate({
        where: { cashSessionId: activeSession.id, type: 'WITHDRAWAL' },
        _sum: { amount: true },
      }),
      prisma.cashMovement.aggregate({
        where: { cashSessionId: activeSession.id, type: 'ADJUSTMENT' },
        _sum: { amount: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.countFromDate ?? activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.countFromDate ?? activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CASH',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.countFromDate ?? activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'DEBIT',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.countFromDate ?? activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CREDIT',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.countFromDate ?? activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CARD',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.countFromDate ?? activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'PIX',
        },
        _sum: { total: true },
      }),
      prisma.settings.findUnique({
        where: { restaurantId: req.restaurantId! },
        select: { cashDifferenceNoteThreshold: true },
      }),
    ]);

    const supplies = Number(suppliesAgg._sum.amount || 0);
    const withdrawals = Number(withdrawalsAgg._sum.amount || 0);
    const adjustments = Number(adjustmentsAgg._sum.amount || 0);
    const sales = Number(salesAgg._sum.total || 0);
    const cashSales = Number(cashSalesAgg._sum.total || 0);
    const debitSales = Number(debitSalesAgg._sum.total || 0);
    const creditSales = Number(creditSalesAgg._sum.total || 0);
    const cardSales = Number(cardSalesAgg._sum.total || 0);
    const pixSales = Number(pixSalesAgg._sum.total || 0);
    const differenceNoteThreshold = Number(
      settings?.cashDifferenceNoteThreshold ?? DEFAULT_CASH_DIFFERENCE_NOTE_THRESHOLD
    );
    const expectedAmount = Number((activeSession.openingAmount + supplies - withdrawals + adjustments + cashSales).toFixed(2));
    const differenceAmount = Number((closingAmount - expectedAmount).toFixed(2));

    if (Math.abs(differenceAmount) >= differenceNoteThreshold && !notes?.trim()) {
      return res.status(400).json({
        error: `Justificativa obrigatória para divergência igual ou superior a ${differenceNoteThreshold.toFixed(2)}.`,
      });
    }

    const session = await prisma.cashSession.update({
      where: { id: activeSession.id },
      data: {
        status: 'CLOSED',
        closedById: req.userId,
        closedAt: new Date(),
        closingAmount,
        expectedAmount,
        differenceAmount,
        informedCardAmount,
        informedPixAmount,
        notes: notes || activeSession.notes,
      },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        closedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await createAudit(req, 'close_cash_session', 'cash_session', session.id, {
      closingAmount,
      expectedAmount,
      differenceAmount,
      informedCardAmount,
      informedPixAmount,
      sales,
      cashSales,
      debitSales,
      creditSales,
      cardSales,
      pixSales,
      notes,
    });

    res.json(session);
  } catch (error) {
    console.error('Error closing cashier session:', error);
    res.status(500).json({ error: 'Erro ao fechar sessão de caixa.' });
  }
});

// Incluir pedidos pré-abertura na sessão definindo countFromDate
app.patch('/api/cashier/sessions/:id/count-from', authMiddleware, async (req: AuthRequest, res) => {
  if (!ensureCashierPermission(req, res, CASHIER_OPEN_CLOSE_ROLES, 'ajustar contagem do caixa')) {
    return;
  }

  try {
    const sessionId = Number(req.params.id);
    const countFromDate = req.body?.countFromDate ? new Date(req.body.countFromDate) : null;

    if (!sessionId || isNaN(sessionId)) {
      return res.status(400).json({ error: 'Sessão inválida.' });
    }

    if (!countFromDate || isNaN(countFromDate.getTime())) {
      return res.status(400).json({ error: 'Data de referência inválida.' });
    }

    const session = await prisma.cashSession.findFirst({
      where: { id: sessionId, restaurantId: req.restaurantId, status: 'OPEN' },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão aberta não encontrada.' });
    }

    if (countFromDate >= session.openedAt) {
      return res.status(400).json({ error: 'A data de referência deve ser anterior à abertura da sessão.' });
    }

    const updated = await prisma.cashSession.update({
      where: { id: sessionId },
      data: { countFromDate },
      include: { openedBy: { select: { id: true, name: true, email: true } } },
    });

    await createAudit(req, 'set_count_from_date', 'cash_session', sessionId, {
      countFromDate: countFromDate.toISOString(),
    });

    res.json(updated);
  } catch (error) {
    console.error('Error setting countFromDate:', error);
    res.status(500).json({ error: 'Erro ao ajustar contagem da sessão de caixa.' });
  }
});

app.get('/api/cashier/operators', authMiddleware, async (req: AuthRequest, res) => {
  if (!ensureCashierPermission(req, res, CASHIER_OPERATION_ROLES, 'listar operadores de caixa')) {
    return;
  }

  try {
    const operators = await prisma.user.findMany({
      where: {
        restaurantId: req.restaurantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(operators);
  } catch (error) {
    console.error('Error listing cashier operators:', error);
    res.status(500).json({ error: 'Erro ao listar operadores de caixa.' });
  }
});

// TODO: Configurar impressoras - rotas suspensas até que tabelas printDevice e printJob sejam criadas
/*
apiRouter.get('/print/settings', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
  try {
    const restaurantId = req.restaurant!.id;
    const [device, pendingJobs, recentJobs] = await Promise.all([
      prisma.printDevice.findFirst({
        where: { restaurantId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.printJob.count({
        where: {
          restaurantId,
          status: { in: Array.from(ACTIVE_PRINT_JOB_STATUSES) },
        },
      }),
      prisma.printJob.findMany({
        where: { restaurantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          subjectType: true,
          subjectId: true,
          template: true,
          printMode: true,
          status: true,
          attempts: true,
          errorMessage: true,
          createdAt: true,
          processedAt: true,
        },
      }),
    ]);

    res.json({
      device: device ? {
        id: device.id,
        name: device.name,
        agentToken: device.agentToken,
        connectionType: device.connectionType,
        ipAddress: device.ipAddress,
        port: device.port,
        usbVendorId: device.usbVendorId,
        usbProductId: device.usbProductId,
        paperWidthMm: device.paperWidthMm,
        isActive: device.isActive,
        autoPrintOrders: device.autoPrintOrders,
      } : null,
      pendingJobs,
      recentJobs,
    });
  } catch (error) {
    console.error('Error loading print settings:', error);
    res.status(500).json({ error: 'Erro ao carregar configurações de impressão.' });
  }
});
// TODO: Configurar impressoras - rotas suspensas até que tabelas printDevice e printJob sejam criadas
// apiRouter.put('/print/settings', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
//   try {
//     const restaurantId = req.restaurant!.id;
//     const name = String(req.body?.name || '').trim();
//     const connectionType = normalizeConnectionType(String(req.body?.connectionType || ''));
//     const ipAddress = String(req.body?.ipAddress || '').trim() || null;
//     const portValue = Number(req.body?.port || 9100);
//     const paperWidthMm = Number(req.body?.paperWidthMm || 80);
//     const usbVendorId = String(req.body?.usbVendorId || '').trim() || null;
//     const usbProductId = String(req.body?.usbProductId || '').trim() || null;
//     const isActive = Boolean(req.body?.isActive);
//     const autoPrintOrders = req.body?.autoPrintOrders !== false;

    if (!name) {
      return res.status(400).json({ error: 'Nome da impressora é obrigatório.' });
    }

    if (!connectionType || !PRINTER_CONNECTION_TYPES.has(connectionType)) {
      return res.status(400).json({ error: 'Tipo de conexão inválido.' });
    }

    if (connectionType === 'NETWORK' && !ipAddress) {
      return res.status(400).json({ error: 'Informe o IP da impressora de rede.' });
    }

    if (connectionType === 'USB' && (!usbVendorId || !usbProductId)) {
      return res.status(400).json({ error: 'Informe Vendor ID e Product ID para impressora USB.' });
    }

    if (!Number.isInteger(portValue) || portValue <= 0 || portValue > 65535) {
      return res.status(400).json({ error: 'Porta da impressora inválida.' });
    }

    if (!Number.isInteger(paperWidthMm) || ![58, 80].includes(paperWidthMm)) {
      return res.status(400).json({ error: 'A largura do papel deve ser 58mm ou 80mm.' });
    }

    const existingDevice = await prisma.printDevice.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });

    const device = existingDevice
      ? await prisma.printDevice.update({
          where: { id: existingDevice.id },
          data: {
            name,
            connectionType,
            ipAddress: connectionType === 'NETWORK' ? ipAddress : null,
            port: connectionType === 'NETWORK' ? portValue : null,
            usbVendorId: connectionType === 'USB' ? usbVendorId : null,
            usbProductId: connectionType === 'USB' ? usbProductId : null,
            paperWidthMm,
            isActive,
            autoPrintOrders,
          },
        })
      : await prisma.printDevice.create({
          data: {
            restaurantId,
            name,
            agentToken: generatePrinterAgentToken(),
            connectionType,
            ipAddress: connectionType === 'NETWORK' ? ipAddress : null,
            port: connectionType === 'NETWORK' ? portValue : null,
            usbVendorId: connectionType === 'USB' ? usbVendorId : null,
            usbProductId: connectionType === 'USB' ? usbProductId : null,
            paperWidthMm,
            isActive,
            autoPrintOrders,
          },
        });

    await createAudit(req, 'update_print_settings', 'restaurant', restaurantId, {
      printerId: device.id,
      connectionType: device.connectionType,
      paperWidthMm: device.paperWidthMm,
      autoPrintOrders: device.autoPrintOrders,
      isActive: device.isActive,
    });

    res.json({
      id: device.id,
      name: device.name,
      agentToken: device.agentToken,
      connectionType: device.connectionType,
      ipAddress: device.ipAddress,
      port: device.port,
      usbVendorId: device.usbVendorId,
      usbProductId: device.usbProductId,
      paperWidthMm: device.paperWidthMm,
      isActive: device.isActive,
      autoPrintOrders: device.autoPrintOrders,
    });
  } catch (error) {
    console.error('Error saving print settings:', error);
    res.status(500).json({ error: 'Erro ao salvar configurações de impressão.' });
  }
});
// });

// apiRouter.post('/print/settings/test', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
//   try {
//     const restaurantId = req.restaurant!.id;
//     const device = await getPrimaryPrintDevice(restaurantId);

//     if (!device) {
//       return res.status(400).json({ error: 'Nenhuma impressora ativa configurada para a loja.' });
//     }

//     const printJob = await enqueuePrintJob({
//       restaurantId,
//       printerId: device.id,
//       requestedById: req.userId,
//       subjectType: 'restaurant',
//       subjectId: restaurantId,
//       template: 'TEST_TICKET',
//       printMode: 'THERMAL',
//       payload: await buildPrintJobPayload({
//         restaurantId,
//         subjectType: 'restaurant',
//         subjectId: restaurantId,
//         template: 'TEST_TICKET',
//         fallbackPayload: {
//           type: 'test_ticket',
//           title: 'Teste de Impressao 80mm',
//           storeName: req.restaurant?.name,
//           printerName: device.name,
//           generatedAt: new Date().toISOString(),
//           message: 'Se este cupom saiu corretamente, a integracao local esta pronta.',
//         },
//       }),
//     });

//     await createAudit(req, 'queue_print_test', 'restaurant', restaurantId, {
//       printerId: device.id,
//       printJobId: printJob.id,
//       template: printJob.template,
//       printMode: printJob.printMode,
//     });

//     res.status(201).json({
//       success: true,
//       printJobId: printJob.id,
//       printerId: device.id,
//     });
//   } catch (error) {
//     console.error('Error queueing print test:', error);
//     res.status(500).json({ error: 'Erro ao enfileirar teste de impressão.' });
//   }
// });

// apiRouter.get('/print/jobs', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
//   try {
//     const jobs = await prisma.printJob.findMany({
//       where: { restaurantId: req.restaurant!.id },
//       orderBy: { createdAt: 'desc' },
//       take: 20,
//       include: {
//         printer: {
//           select: { id: true, name: true, connectionType: true },
//         },
//       },
//     });

//     res.json(jobs);
//   } catch (error) {
//     console.error('Error listing print jobs:', error);
//     res.status(500).json({ error: 'Erro ao listar fila de impressão.' });
//   }
// });

// TODO: Rotas de agente de impressoras suspensas até que tabelas printDevice e printJob sejam criadas
/*
app.get('/api/print/agent/jobs/next', async (req, res) => {
  try {
    const device = await getPrintDeviceFromAgentToken(req);
    if (!device) {
      return res.status(401).json({ error: 'Token da impressora inválido.' });
    }

    if (!device.isActive || !device.restaurant?.isActive) {
      return res.status(403).json({ error: 'Impressora ou restaurante inativo.' });
    }

    const job = await prisma.printJob.findFirst({
      where: {
        restaurantId: device.restaurantId,
        status: 'PENDING',
        OR: [
          { printerId: device.id },
          { printerId: null },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!job) {
      return res.status(204).send();
    }

    const claimedJob = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        printerId: device.id,
        status: 'PROCESSING',
        attempts: { increment: 1 },
      },
    });

    res.json({
      printer: {
        id: device.id,
        name: device.name,
        connectionType: device.connectionType,
        ipAddress: device.ipAddress,
        port: device.port,
        usbVendorId: device.usbVendorId,
        usbProductId: device.usbProductId,
        paperWidthMm: device.paperWidthMm,
      },
      job: claimedJob,
    });
  } catch (error) {
    console.error('Error fetching next print job:', error);
    res.status(500).json({ error: 'Erro ao buscar próximo job de impressão.' });
  }
});

app.post('/api/print/agent/jobs/:id/complete', async (req, res) => {
  try {
    const device = await getPrintDeviceFromAgentToken(req);
    if (!device) {
      return res.status(401).json({ error: 'Token da impressora inválido.' });
    }

    const jobId = Number(req.params.id);
    const job = await prisma.printJob.findFirst({
      where: {
        id: jobId,
        restaurantId: device.restaurantId,
        printerId: device.id,
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job de impressão não encontrado.' });
    }

    const completedJob = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    await createAudit(undefined, 'print_job_completed', completedJob.subjectType, completedJob.subjectId, {
      printJobId: completedJob.id,
      printerId: device.id,
      printerName: device.name,
      processedAt: completedJob.processedAt?.toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing print job:', error);
    res.status(500).json({ error: 'Erro ao concluir job de impressão.' });
  }
});

app.post('/api/print/agent/jobs/:id/fail', async (req, res) => {
  try {
    const device = await getPrintDeviceFromAgentToken(req);
    if (!device) {
      return res.status(401).json({ error: 'Token da impressora inválido.' });
    }

    const jobId = Number(req.params.id);
    const errorMessage = String(req.body?.errorMessage || '').trim() || 'Falha desconhecida';
    const job = await prisma.printJob.findFirst({
      where: {
        id: jobId,
        restaurantId: device.restaurantId,
        printerId: device.id,
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job de impressão não encontrado.' });
    }

    const failedJob = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        processedAt: new Date(),
        errorMessage,
      },
    });

    await createAudit(undefined, 'print_job_failed', failedJob.subjectType, failedJob.subjectId, {
      printJobId: failedJob.id,
      printerId: device.id,
      printerName: device.name,
      errorMessage,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error failing print job:', error);
    res.status(500).json({ error: 'Erro ao registrar falha do job de impressão.' });
  }
});

app.post('/api/print-events', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
  try {
    const subjectType = String(req.body?.subjectType || '').trim();
    const subjectId = Number(req.body?.subjectId || 0);
    const template = normalizePrintTemplate(String(req.body?.template || ''));
    const printMode = normalizePrintMode(String(req.body?.printMode || ''));

    if (!PRINTABLE_SUBJECT_TYPES.has(subjectType)) {
      return res.status(400).json({ error: 'Tipo de documento inválido.' });
    }

    if (!subjectId) {
      return res.status(400).json({ error: 'Documento inválido.' });
    }

    if (!template || !PRINT_TEMPLATES.has(template)) {
      return res.status(400).json({ error: 'Template de impressão inválido.' });
    }

    if (!printMode || !PRINT_MODES.has(printMode)) {
      return res.status(400).json({ error: 'Formato de impressão inválido.' });
    }

    let queuedPrintJobId: number | null = null;
    if (printMode === 'THERMAL' && req.restaurantId) {
      const device = await getPrimaryPrintDevice(req.restaurantId);
      if (device) {
        const printJob = await enqueuePrintJob({
          restaurantId: req.restaurantId,
          printerId: device.id,
          requestedById: req.userId,
          subjectType,
          subjectId,
          template,
          printMode,
          payload: await buildPrintJobPayload({
            restaurantId: req.restaurantId,
            subjectType,
            subjectId,
            template,
            fallbackPayload: {
              subjectType,
              subjectId,
              template,
              printMode,
              requestedAt: new Date().toISOString(),
              source: 'manual_print_event',
            },
          }),
        });
        queuedPrintJobId = printJob.id;
      }
    }

    await createAudit(req, 'print_document', subjectType, subjectId, {
      template,
      printMode,
      restaurantId: req.restaurantId,
      printedAt: new Date().toISOString(),
      queuedPrintJobId,
    });

    res.json({ success: true, queuedPrintJobId });
  } catch (error) {
    console.error('Error creating print audit event:', error);
    res.status(500).json({ error: 'Erro ao registrar evento de impressão.' });
  }
});
*/

// TODO: Configurar rotas de print-events
/*
app.get('/api/print-events/summary', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
  try {
    const subjectType = String(req.query.subjectType || '').trim();
    const rawIds = String(req.query.ids || '').trim();

    if (!['order', 'cash_session'].includes(subjectType)) {
      return res.status(400).json({ error: 'Tipo de documento inválido.' });
    }

    const ids = rawIds
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (ids.length === 0) {
      return res.json([]);
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        action: 'print_document',
        subjectType,
        subjectId: { in: ids },
        actor: {
          restaurantId: req.restaurantId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const summaryMap = new Map<number, any>();
    for (const log of logs) {
      if (!log.subjectId) continue;
      const current = summaryMap.get(log.subjectId);
      if (!current) {
        summaryMap.set(log.subjectId, {
          subjectId: log.subjectId,
          printCount: 1,
          lastPrintedAt: log.createdAt,
          lastPrintMode: (log.details as any)?.printMode || null,
          lastTemplate: (log.details as any)?.template || null,
          actor: log.actor,
        });
        continue;
      }

      current.printCount += 1;
    }

    res.json(Array.from(summaryMap.values()));
  } catch (error) {
    console.error('Error summarizing print events:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo de impressões.' });
  }
});
*/

app.get('/api/cashier/sessions/:id/report', authMiddleware, async (req: AuthRequest, res) => {
  if (!ensureCashierPermission(req, res, CASHIER_OPERATION_ROLES, 'emitir relatório de caixa')) {
    return;
  }

  try {
    const sessionId = Number(req.params.id);
    if (!sessionId) {
      return res.status(400).json({ error: 'Sessão inválida.' });
    }

    const session = await prisma.cashSession.findFirst({
      where: {
        id: sessionId,
        restaurantId: req.restaurantId,
      },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        closedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão de caixa não encontrada.' });
    }

    const movements = await prisma.cashMovement.findMany({
      where: { cashSessionId: session.id },
      orderBy: { createdAt: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    const [restaurant, suppliesAgg, withdrawalsAgg, adjustmentsAgg, salesAgg, cashSalesAgg, salesByPaymentRaw] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { id: req.restaurantId },
        select: {
          id: true,
          name: true,
          phone: true,
        },
      }),
      prisma.cashMovement.aggregate({
        where: { cashSessionId: session.id, type: 'SUPPLY' },
        _sum: { amount: true },
      }),
      prisma.cashMovement.aggregate({
        where: { cashSessionId: session.id, type: 'WITHDRAWAL' },
        _sum: { amount: true },
      }),
      prisma.cashMovement.aggregate({
        where: { cashSessionId: session.id, type: 'ADJUSTMENT' },
        _sum: { amount: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: {
            gte: session.countFromDate ?? session.openedAt,
            ...(session.closedAt ? { lte: session.closedAt } : {}),
          },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: {
            gte: session.countFromDate ?? session.openedAt,
            ...(session.closedAt ? { lte: session.closedAt } : {}),
          },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CASH',
        },
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ['paymentMethod'],
        where: {
          restaurantId: req.restaurantId,
          createdAt: {
            gte: session.countFromDate ?? session.openedAt,
            ...(session.closedAt ? { lte: session.closedAt } : {}),
          },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
        },
        _sum: { total: true },
      }),
    ]);

    const supplies = Number(suppliesAgg._sum.amount || 0);
    const withdrawals = Number(withdrawalsAgg._sum.amount || 0);
    const adjustments = Number(adjustmentsAgg._sum.amount || 0);
    const sales = Number(salesAgg._sum.total || 0);
    const cashSales = Number(cashSalesAgg._sum.total || 0);
    const expectedAmount = Number((session.openingAmount + supplies - withdrawals + adjustments + cashSales).toFixed(2));
    const closingAmount = Number(session.closingAmount || 0);
    const informedCardAmount = Number(session.informedCardAmount || 0);
    const informedPixAmount = Number(session.informedPixAmount || 0);

    const differenceAmount = Number(((session.closingAmount ?? expectedAmount) - expectedAmount).toFixed(2));
    const paymentMethods = ['PIX', 'CASH', 'CARD'];
    const salesByPayment = paymentMethods.map((method) => {
      const row = salesByPaymentRaw.find((entry) => entry.paymentMethod === method);
      const total = Number(row?._sum.total || 0);
      let difference = 0;
      if (method === 'CARD' && session.status === 'CLOSED') difference = Number((informedCardAmount - total).toFixed(2));
      if (method === 'PIX' && session.status === 'CLOSED') difference = Number((informedPixAmount - total).toFixed(2));

      return {
        method,
        total,
        informed: method === 'CASH' ? closingAmount : (method === 'CARD' ? informedCardAmount : informedPixAmount),
        difference
      };
    });

    res.json({
      restaurant,
      session,
      movements,
      totals: {
        supplies,
        withdrawals,
        adjustments,
        sales,
        cashSales,
        expectedAmount,
        closingAmount,
        informedCardAmount,
        informedPixAmount,
        differenceAmount,
        salesByPayment,
      },
    });
  } catch (error) {
    console.error('Error generating cashier report:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório da sessão de caixa.' });
  }
});

app.get('/api/cashier/sessions', authMiddleware, async (req: AuthRequest, res) => {
  if (!ensureCashierPermission(req, res, CASHIER_OPERATION_ROLES, 'consultar histórico do caixa')) {
    return;
  }

  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const page = Math.max(1, Number(req.query.page || 1));
    const status = typeof req.query.status === 'string' && ['OPEN', 'CLOSED'].includes(req.query.status)
      ? req.query.status
      : undefined;
    const openedById = Number(req.query.openedById || 0) || undefined;
    const startDate = typeof req.query.startDate === 'string' ? new Date(req.query.startDate) : undefined;
    const endDate = typeof req.query.endDate === 'string' ? new Date(req.query.endDate) : undefined;

    const where: any = { restaurantId: req.restaurantId };
    if (status) where.status = status;
    if (openedById) where.openedById = openedById;
    if (startDate || endDate) {
      where.openedAt = {
        ...(startDate && !Number.isNaN(startDate.getTime()) ? { gte: startDate } : {}),
        ...(endDate && !Number.isNaN(endDate.getTime()) ? { lte: endDate } : {}),
      };
    }

    const [total, sessions] = await Promise.all([
      prisma.cashSession.count({ where }),
      prisma.cashSession.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          openedBy: { select: { id: true, name: true, email: true } },
          closedBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    res.json({ data: sessions, total, page, limit });
  } catch (error) {
    console.error('Error listing cashier sessions:', error);
    res.status(500).json({ error: 'Erro ao listar histórico de caixa.' });
  }
});

// Stats
app.get('/api/stats', authMiddleware, async (req: AuthRequest, res) => {
  const [totalOrders, totalSales, pendingOrders, recentOrders, totalCustomers, topProductsRaw] = await Promise.all([
    prisma.order.count({ where: { restaurantId: req.restaurantId } }),
    prisma.order.aggregate({
      where: {
        restaurantId: req.restaurantId,
        status: 'DELIVERED'
      },
      _sum: { total: true }
    }),
    prisma.order.count({
      where: {
        restaurantId: req.restaurantId,
        NOT: { OR: [{ status: 'DELIVERED' }, { status: 'CANCELLED' }] }
      }
    }),
    prisma.order.findMany({
      where: { restaurantId: req.restaurantId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true
      }
    }),
    prisma.customer.count({ where: { restaurantId: req.restaurantId } }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: {
        order: { restaurantId: req.restaurantId }
      },
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: 3
    })
  ]);

  // Fetch product names for top products
  const topProducts = await Promise.all(
    topProductsRaw.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      return {
        name: product?.name || 'Produto Removido',
        sales: `${item._sum.quantity} ordens`
      };
    })
  );

  res.json({
    totalOrders,
    totalSales: totalSales._sum.total || 0,
    pendingOrders,
    recentOrders,
    totalCustomers,
    topProducts
  });
});

// ============================================================================
// 🔐 PIX DINÂMICO - QR CODES COM VALOR REAL
// ============================================================================

// GET /api/orders/:id/pix-qrcode
// Retorna QR code PIX dinâmico com valor do pedido
app.get('/api/orders/:id/pix-qrcode', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        restaurant: {
          select: {
            pixKey: true,
            pixKeyType: true,
            name: true,
            whatsappNumber: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        code: 'ORDER_NOT_FOUND',
        userMessage: 'Pedido não encontrado'
      });
    }

    // Validar se restaurante tem PIX configurado
    if (!order.restaurant?.pixKey) {
      return res.status(400).json({
        code: 'PIX_NOT_CONFIGURED',
        userMessage: '❌ PIX não está configurado para este restaurante'
      });
    }

    // Importar PixService
    const { PixService } = await import('./services/PixService');

    // Validar chave PIX
    if (!PixService.validatePixKey(order.restaurant.pixKey, order.restaurant.pixKeyType!)) {
      return res.status(400).json({
        code: 'INVALID_PIX_KEY',
        userMessage: 'Chave PIX configurada está inválida'
      });
    }

    // GERAR QR CODE DINÂMICO COM VALOR DO PEDIDO
    const qrcodeDataUrl = await PixService.generateDynamicPixQRCode({
      key: order.restaurant.pixKey,
      amount: Math.round(order.total * 100), // Valor em centavos
      orderId: id,
      recipientName: order.restaurant.name
    });

    // GERAR CÓPIA E COLA (alternativa se QR code não escanear)
    const copiaCola = PixService.generatePixCopiaCola(
      order.restaurant.pixKey,
      Math.round(order.total * 100),
      id,
      order.restaurant.name
    );

    return res.json({
      qrcode: qrcodeDataUrl, // Base64 SVG/PNG
      copiaCola: copiaCola, // Texto para copiar/colar
      amount: parseFloat((order.total).toFixed(2)), // R$ formatado
      key: order.restaurant.pixKey,
      keyType: order.restaurant.pixKeyType,
      whatsappNumber: order.restaurant.whatsappNumber,
      instructions: `Escaneie o QR code ou use a cópia e cola. Valor: R$ ${(order.total).toFixed(2)}`
    });
  } catch (error) {
    console.error('Erro ao gerar QR code PIX:', error);
    return res.status(500).json({
      code: 'QR_GENERATION_FAILED',
      userMessage: 'Erro ao gerar QR code PIX'
    });
  }
});

// GET /api/restaurant/pix-config
// Obter configuração PIX da loja
app.get('/api/restaurant/pix-config', tenantMiddleware, async (req: TenantRequest, res) => {
  try {
    const config = await prisma.restaurant.findUnique({
      where: { id: req.restaurant?.id },
      select: {
        pixKey: true,
        pixKeyType: true,
        whatsappNumber: true,
        pixInstructions: true
      }
    });

    return res.json(config);
  } catch (error) {
    return res.status(500).json({
      code: 'FETCH_FAILED',
      userMessage: 'Erro ao buscar configuração PIX'
    });
  }
});

// PATCH /api/restaurant/pix-config (ADMIN)
// Atualizar configuração PIX da loja
app.patch('/api/restaurant/pix-config', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
  try {
    const { pixKey, pixKeyType, whatsappNumber } = req.body;

    // Validação básica
    if (!pixKey || !pixKeyType) {
      return res.status(400).json({
        code: 'MISSING_REQUIRED_FIELDS',
        userMessage: 'Chave PIX e tipo são obrigatórios'
      });
    }

    // Validar tipo
    const validTypes = ['cpf', 'cnpj', 'email', 'phone'];
    if (!validTypes.includes(pixKeyType)) {
      return res.status(400).json({
        code: 'INVALID_PIX_TYPE',
        userMessage: `Tipo PIX inválido. Use: ${validTypes.join(', ')}`
      });
    }

    // Importar PixService
    const { PixService } = await import('./services/PixService');

    // Validar formato da chave
    if (!PixService.validatePixKey(pixKey, pixKeyType)) {
      return res.status(400).json({
        code: 'INVALID_PIX_KEY_FORMAT',
        userMessage: `Formato de chave PIX inválido para tipo "${pixKeyType}"`
      });
    }

    // Validar WhatsApp (opcional)
    if (whatsappNumber) {
      const phoneRegex = /^\+?55?\d{10,11}$/;
      if (!phoneRegex.test(whatsappNumber)) {
        return res.status(400).json({
          code: 'INVALID_WHATSAPP',
          userMessage: 'Número de WhatsApp inválido'
        });
      }
    }

    // Atualizar no banco
    const updated = await prisma.restaurant.update({
      where: { id: req.restaurant?.id },
      data: {
        pixKey,
        pixKeyType,
        whatsappNumber: whatsappNumber || null,
        pixInstructions: `Escaneie o QR code ou use a chave: ${pixKey}`
      }
    });

    return res.json({
      success: true,
      message: '✅ Configuração PIX atualizada com sucesso',
      data: {
        pixKey: updated.pixKey,
        pixKeyType: updated.pixKeyType,
        whatsappNumber: updated.whatsappNumber
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar PIX config:', error);
    return res.status(500).json({
      code: 'UPDATE_FAILED',
      userMessage: 'Erro ao atualizar configuração PIX'
    });
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API com PostgreSQL rodando em http://0.0.0.0:${PORT}`);
  scheduleAuditRetentionCleanup();
});

// ─── PIX ROUTES ──────────────────────────────────────────────────────────────

// Salvar chave PIX do lojista (fluxo manual, sem webhook)
apiRouter.put('/pix/settings', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
  try {
    const { pixKey, pixEnabled } = req.body;

    if (!pixKey && pixEnabled) {
      return res.status(400).json({ error: 'pixKey é obrigatório quando PIX está ativado' });
    }

    await prisma.settings.upsert({
      where: { restaurantId: req.restaurant!.id },
      update: {
        pixEnabled: pixEnabled ?? false,
        pixKey: pixKey ?? null,
      },
      create: {
        restaurantId: req.restaurant!.id,
        storeName: req.restaurant?.name || 'Minha Loja',
        phone: req.restaurant?.phone || null,
        logo: req.restaurant?.logo || null,
        pixEnabled: pixEnabled ?? false,
        pixKey: pixKey ?? null,
      },
    });

    await prisma.restaurant.update({
      where: { id: req.restaurant!.id },
      data: {
        pixKey: pixEnabled ? (pixKey ?? null) : null,
        pixInstructions: pixEnabled && pixKey ? `Escaneie o QR code ou use a chave: ${pixKey}` : null,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar configurações PIX' });
  }
});

// Obter status das credenciais PIX do lojista
apiRouter.get('/pix/settings', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
  try {
    const s = await prisma.settings.findUnique({ where: { restaurantId: req.restaurant!.id } });
    res.json({
      pixEnabled: s?.pixEnabled ?? false,
      pixKey: s?.pixKey ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configurações PIX' });
  }
});

// Gerar PIX de pré-visualização sem criar pedido (usado antes da confirmação final)
apiRouter.post('/pix/preview', tenantMiddleware, async (req: TenantRequest, res) => {
  try {
    const total = Number(req.body?.total);

    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ error: 'Valor inválido para gerar PIX' });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurant!.id },
      select: {
        name: true,
        pixKey: true,
      },
    });

    const s = await prisma.settings.findUnique({ where: { restaurantId: req.restaurant!.id } });
    const effectivePixKey = restaurant?.pixKey || s?.pixKey || null;
    const effectivePixEnabled = Boolean((s?.pixEnabled && effectivePixKey) || restaurant?.pixKey);

    if (!effectivePixEnabled || !effectivePixKey) {
      return res.status(400).json({ error: 'PIX não configurado nesta loja' });
    }

    const { PixService } = await import('./services/PixService');
    const previewReference = `${Date.now()}`;

    const qrcodeDataUrl = await PixService.generateDynamicPixQRCode({
      key: effectivePixKey,
      amount: Math.round(total * 100),
      orderId: previewReference,
      recipientName: restaurant?.name || req.restaurant?.name || 'Minha Loja',
    });

    const pixCopiaECola = PixService.generatePixCopiaCola(
      effectivePixKey,
      Math.round(total * 100),
      previewReference,
      restaurant?.name || req.restaurant?.name || 'Minha Loja'
    );

    const imagemQrcode = qrcodeDataUrl.includes(',')
      ? qrcodeDataUrl.split(',')[1]
      : qrcodeDataUrl;

    return res.json({
      txid: `preview-${previewReference}`,
      qrcode: pixCopiaECola,
      imagemQrcode,
      pixCopiaECola,
      expiracao: 900,
    });
  } catch (err: any) {
    console.error('Erro ao gerar PIX pré-visualização:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Erro ao gerar PIX.' });
  }
});

// Criar cobrança PIX para um pedido (chamado pelo frontend após criar o pedido)
apiRouter.post('/pix/charge/:orderId', tenantMiddleware, async (req: TenantRequest, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: req.restaurant!.id },
    });

    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (order.paymentMethod !== 'PIX') {
      return res.status(400).json({ error: 'Pedido não é PIX' });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurant!.id },
      select: {
        name: true,
        pixKey: true,
      },
    });

    const s = await prisma.settings.findUnique({ where: { restaurantId: req.restaurant!.id } });
    const effectivePixKey = restaurant?.pixKey || s?.pixKey || null;
    const effectivePixEnabled = Boolean((s?.pixEnabled && effectivePixKey) || restaurant?.pixKey);

    if (!effectivePixEnabled || !effectivePixKey) {
      return res.status(400).json({ error: 'PIX não configurado nesta loja' });
    }

    const { PixService } = await import('./services/PixService');
    const qrcodeDataUrl = await PixService.generateDynamicPixQRCode({
      key: effectivePixKey,
      amount: Math.round(order.total * 100),
      orderId: orderId.toString(),
      recipientName: restaurant?.name || req.restaurant?.name || 'Minha Loja',
    });

    const pixCopiaECola = PixService.generatePixCopiaCola(
      effectivePixKey,
      Math.round(order.total * 100),
      orderId.toString(),
      restaurant?.name || req.restaurant?.name || 'Minha Loja'
    );

    const imagemQrcode = qrcodeDataUrl.includes(',')
      ? qrcodeDataUrl.split(',')[1]
      : qrcodeDataUrl;

    const existingNotes = order.notes ? JSON.parse(order.notes) : {};
    await prisma.order.update({
      where: { id: orderId },
      data: { notes: JSON.stringify({ ...existingNotes, manualPix: true }) },
    });

    return res.json({
      txid: `manual-${orderId}-${Date.now()}`,
      qrcode: pixCopiaECola,
      imagemQrcode,
      pixCopiaECola,
      expiracao: 900,
    });
  } catch (err: any) {
    console.error('Erro ao criar cobrança PIX:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao gerar cobrança PIX. Verifique a configuração.' });
  }
});

