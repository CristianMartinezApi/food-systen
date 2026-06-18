import express from 'express';
import {
  createPixCharge,
  validateWebhookSignature,
} from './services/pix.service';

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
import { getNextOpeningLabel, isRestaurantOpenNow, normalizeOperatingHours } from './utils/hours';

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

const app = express();
const httpServer = createServer(app);

// ✅ SEGURO: JWT_SECRET validação
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('❌ CRÍTICO: JWT_SECRET must be defined in environment variables. Use: openssl rand -base64 32');
}

const PORT = process.env.PORT || 8000;
const DEFAULT_CASH_DIFFERENCE_NOTE_THRESHOLD = 5;
const CASH_COUNTED_ORDER_STATUSES: OrderStatus[] = ['DELIVERED', 'PAID'];
const CASHIER_OPERATION_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'EMPLOYEE']);
const CASHIER_OPEN_CLOSE_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'MANAGER']);

function ensureCashierPermission(
  req: AuthRequest,
  res: express.Response,
  allowedRoles: Set<string>,
  actionLabel: string
): boolean {
  if (!req.userRole || !allowedRoles.has(req.userRole)) {
    res.status(403).json({ error: `Sem permissão para ${actionLabel}.` });
    return false;
  }

  return true;
}

// ✅ SEGURO: CORS configurado explicitamente
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  optionsSuccessStatus: 200
}));

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

// --- SEEDER INICIAL ---
const seedSettings = async () => {
  const restaurantCount = await prisma.restaurant.count();
  if (restaurantCount === 0) {
    // Criar um plano inicial
    const plan = await prisma.plan.upsert({
      where: { name: 'Free Plan' },
      update: {},
      create: {
        name: 'Free Plan',
        tier: 'FREE',
        price: 0,
        maxProducts: 10,
        maxOrders: 100
      }
    });

    // ✅ SEGURO: Admin password gerado de forma segura
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('🔐 IMPORTANTE: Admin inicial criado. Primeira senha de admin (não será mostrada novamente):');
    console.log(`   Email: admin@foodsystem.com`);
    console.log(`   Senha: ${adminPassword}`);
    console.log(`   ⚠️ Altere a senha ao primeiro login!\n`);

    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'FoodSystem Burger',
        slug: 'foodsystem-burger',
        provisioningStatus: 'READY',
        databaseName: 'foodsystem-burger',
        planId: plan.id,
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

    res.json({ user, token, restaurant: user.restaurant });
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
    // Por enquanto, apenas log
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reset-password?token=${token}`;
    console.log(`📧 RESET PASSWORD EMAIL:
      To: ${user.email}
      Link: ${resetLink}
      Valid for: 1 hour
    `);

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

  const where: any = {};
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { actorEmail: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (subjectType) where.subjectType = subjectType;

  const total = await prisma.auditLog.count({ where });
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * perPage,
    take: perPage
  });

  res.json({ data: logs, total, page, perPage });
});

// Export audit logs as CSV (filtered)
app.get('/api/admin/audit-logs/export', authMiddleware, async (req: AuthRequest, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super admin' });
  }

  const search = (req.query.search || '').toString();
  const subjectType = req.query.subjectType?.toString();

  const where: any = {};
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { actorEmail: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (subjectType) where.subjectType = subjectType;

  const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' } });

  const header = 'id,actorId,actorEmail,action,subjectType,subjectId,details,createdAt\n';
  const rows = logs.map(l => `${l.id},${l.actorId ?? ''},"${(l.actorEmail || '').replace(/"/g, '""')}","${l.action}","${l.subjectType}",${l.subjectId ?? ''},"${JSON.stringify(l.details || {}).replace(/"/g, '""')}",${l.createdAt.toISOString()}`).join('\n');
  const csv = header + rows;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit_logs_export.csv"');
  res.send(csv);
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
      orderBy: { price: 'asc' }
    });
    res.json(plans);
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

    // revenue
    const revenueAgg = await prisma.order.aggregate({ _sum: { total: true } });
    const totalRevenue = revenueAgg._sum.total ?? 0;

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
      provisioning,
      totalRevenue
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

    const revenue = await prisma.$queryRawUnsafe(
      `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as day, coalesce(sum("total")::numeric,0) as total
       FROM "orders"
       WHERE "createdAt" >= now() - interval '${days} days'
       GROUP BY day
       ORDER BY day ASC`
    );

    res.json({ users, restaurants, revenue });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Erro ao buscar trends' });
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

    if (!restaurantName || !slug) {
      return res.status(400).json({ error: 'Nome da loja e slug são obrigatórios' });
    }

    const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingRestaurant) {
      return res.status(400).json({ error: 'Slug já está em uso' });
    }

    const plan = await prisma.plan.findFirst({ where: { tier: 'FREE' } });

    const restaurant = await prisma.$transaction(async (tx) => {
      const createdRestaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          slug,
          description,
          phone,
          logo,
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

// Settings
app.get('/api/settings', async (req: TenantRequest, res) => {
  const settings = await prisma.settings.findUnique({
    where: { restaurantId: req.restaurantId }
  });
  if (!settings) {
    return res.status(404).json({ error: 'Configurações não encontradas' });
  }

  res.json({
    ...settings,
    operatingHours: normalizeOperatingHours(settings.operatingHours),
    isOpen: isRestaurantOpenNow(settings.operatingHours),
    nextOpeningLabel: getNextOpeningLabel(settings.operatingHours),
  });
});

app.patch('/api/settings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, restaurantId, createdAt, updatedAt, nextOpeningLabel, isOpen, ...updateData } = req.body;
    const operatingHours = normalizeOperatingHours(updateData.operatingHours);
    const parsedDifferenceThreshold = Number(updateData.cashDifferenceNoteThreshold);
    const cashDifferenceNoteThreshold = Number.isFinite(parsedDifferenceThreshold) && parsedDifferenceThreshold >= 0
      ? parsedDifferenceThreshold
      : DEFAULT_CASH_DIFFERENCE_NOTE_THRESHOLD;

    const settings = await prisma.settings.update({
      where: { restaurantId: req.restaurantId },
      data: {
        ...updateData,
        cashDifferenceNoteThreshold,
        operatingHours,
        isOpen: isRestaurantOpenNow(operatingHours),
        deliveryEtaMinutes: updateData.deliveryEtaMinutes || 35,
      }
    });

    io.emit(`settings_updated_${req.restaurant?.slug}`, settings);
    res.json({
      ...settings,
      operatingHours: normalizeOperatingHours(settings.operatingHours),
      isOpen: isRestaurantOpenNow(settings.operatingHours),
      nextOpeningLabel: getNextOpeningLabel(settings.operatingHours),
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(400).json({ error: 'Erro ao atualizar configurações.' });
  }
});

// Categories
app.get('/api/categories', async (req: TenantRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { restaurantId: req.restaurantId },
      include: { products: true },
      orderBy: { order: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

app.post('/api/categories', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, restaurantId, status, ...categoryData } = req.body;

    if (categoryData.name) {
      categoryData.name = categoryData.name.toUpperCase().trim();
    }

    // Verificar limite de categorias do plano
    const categoryCount = await prisma.category.count({
      where: { restaurantId: req.restaurantId }
    });

    const maxCategories = req.restaurant?.plan?.maxCategories || 5;

    if (categoryCount >= maxCategories) {
      return res.status(403).json({
        error: `Limite de categorias atingido (${maxCategories}). Faça upgrade do seu plano.`
      });
    }

    const category = await prisma.category.create({
      data: { ...categoryData, restaurantId: req.restaurantId }
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({ error: 'Erro ao criar categoria. Verifique se o slug já existe.' });
  }
});

app.patch('/api/categories/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { id: bodyId, restaurantId, products, status, createdAt, updatedAt, ...updateData } = req.body;

    if (updateData.name) {
      updateData.name = updateData.name.toUpperCase().trim();
    }

    const result = await prisma.category.updateMany({
      where: {
        id,
        restaurantId: req.restaurantId
      },
      data: updateData
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada ou sem permissão.' });
    }

    const category = await prisma.category.findUnique({ where: { id } });
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

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(400).json({ error: 'Erro ao excluir categoria. Ela pode conter produtos vinculados.' });
  }
});

// Products
app.get('/api/products', async (req: TenantRequest, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { restaurantId: req.restaurantId },
      include: { category: true }
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/products', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, restaurantId, status, ...productData } = req.body;

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
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({ error: 'Erro ao atualizar produto.' });
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
        ...(customerName
          ? {
            customerName: {
              equals: customerName,
              mode: 'insensitive',
            },
          }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
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
  const orders = await prisma.order.findMany({
    where: { restaurantId: req.restaurantId },
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
    const { customerName, phone, address, paymentMethod, items, subtotal, deliveryFee, total, notes, cpf, changeFor } = req.body;

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
        createdAt: { gte: startOfMonth }
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
        },
      });

      const productMap = new Map(products.map((product: any) => [product.id, product]));

      for (const item of normalizedItems) {
        const product = productMap.get(item.productId);

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
          restaurantId: req.restaurantId!,
          customerId,
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

app.patch('/api/orders/:id', authMiddleware, async (req: AuthRequest, res) => {
  const order = await prisma.order.update({
    where: {
      id: parseInt(req.params.id),
      restaurantId: req.restaurantId
    },
    data: { status: req.body.status }
  });
  io.emit(`order_status_updated_${req.restaurant?.slug}`, order);
  res.json(order);
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

    const [suppliesAgg, withdrawalsAgg, adjustmentsAgg, salesAgg, cashSalesAgg, cardSalesAgg, debitSalesAgg, creditSalesAgg, pixSalesAgg, movementsCount] = await Promise.all([
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
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CASH',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CARD',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'DEBIT',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CREDIT',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'PIX',
        },
        _sum: { total: true },
      }),
      prisma.cashMovement.count({
        where: { cashSessionId: activeSession.id },
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

    res.status(201).json(session);
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
      }))
      : [];
    const cashReceivedAmount = req.body?.cashReceivedAmount !== undefined && req.body?.cashReceivedAmount !== null
      ? Number(req.body.cashReceivedAmount)
      : null;
    const customerName = req.body?.customerName ? String(req.body.customerName).trim() : 'Venda Balcao';
    const notes = req.body?.notes ? String(req.body.notes).trim() : null;

    if (!['PIX', 'CASH', 'CARD', 'DEBIT', 'CREDIT'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Forma de pagamento invalida.' });
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

      const normalizedItems = items.map((item: any) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error('PRODUCT_NOT_FOUND');
        }

        const unitPrice = Number((product.price * (1 - (Number(product.discountPercent || 0) / 100))).toFixed(2));

        return {
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          price: unitPrice,
          total: Number((unitPrice * item.quantity).toFixed(2)),
          trackStock: Boolean(product.trackStock),
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
          paymentMethod: paymentMethod as PaymentMethod,
          subtotal,
          deliveryFee: 0,
          total: subtotal,
          notes: notes ? `[VENDA_DIRETA] ${notes}` : '[VENDA_DIRETA]',
          changeFor: paymentMethod === 'CASH' && cashReceivedAmount !== null ? String(cashReceivedAmount) : null,
          address: {
            type: 'DINE_IN',
            details: {
              source: 'DIRECT_CASHIER',
              cashSessionId: activeSession.id,
              cashReceivedAmount,
              changeDue,
            },
          },
          restaurantId: req.restaurantId!,
          status: 'DELIVERED',
          items: {
            create: normalizedItems.map((item: any) => ({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
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
    });

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
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CASH',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'DEBIT',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CREDIT',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
          status: { in: CASH_COUNTED_ORDER_STATUSES },
          paymentMethod: 'CARD',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId: req.restaurantId,
          createdAt: { gte: activeSession.openedAt },
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

app.post('/api/print-events', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const subjectType = String(req.body?.subjectType || '').trim();
    const subjectId = Number(req.body?.subjectId || 0);
    const template = String(req.body?.template || '').trim();
    const printMode = String(req.body?.printMode || '').trim();

    if (!['order', 'cash_session'].includes(subjectType)) {
      return res.status(400).json({ error: 'Tipo de documento inválido.' });
    }

    if (!subjectId) {
      return res.status(400).json({ error: 'Documento inválido.' });
    }

    if (!['order_ticket', 'cash_closing_report'].includes(template)) {
      return res.status(400).json({ error: 'Template de impressão inválido.' });
    }

    if (!['THERMAL', 'A4'].includes(printMode)) {
      return res.status(400).json({ error: 'Formato de impressão inválido.' });
    }

    await createAudit(req, 'print_document', subjectType, subjectId, {
      template,
      printMode,
      restaurantId: req.restaurantId,
      printedAt: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating print audit event:', error);
    res.status(500).json({ error: 'Erro ao registrar evento de impressão.' });
  }
});

app.get('/api/print-events/summary', authMiddleware, async (req: AuthRequest, res) => {
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
            gte: session.openedAt,
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
            gte: session.openedAt,
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
            gte: session.openedAt,
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
        salesByPayment
      }
    });
        sales,
        cashSales,
        expectedAmount,
        closingAmount,
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

httpServer.listen(PORT, () => {
  console.log(`🚀 API com PostgreSQL rodando em http://localhost:${PORT}`);
});

// ─── PIX ROUTES ──────────────────────────────────────────────────────────────

// Salvar chave PIX do lojista (apenas a chave PIX, não credenciais Efi)
apiRouter.put('/pix/settings', authMiddleware, tenantMiddleware, async (req: AuthRequest & TenantRequest, res) => {
  try {
    const { pixKey, pixEnabled } = req.body;

    if (!pixKey && pixEnabled) {
      return res.status(400).json({ error: 'pixKey é obrigatório quando PIX está ativado' });
    }

    await prisma.settings.update({
      where: { restaurantId: req.restaurant!.id },
      data: {
        pixEnabled: pixEnabled ?? false,
        pixKey: pixKey ?? null,
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

    const s = await prisma.settings.findUnique({ where: { restaurantId: req.restaurant!.id } });

    if (!s?.pixEnabled || !s.pixKey) {
      return res.status(400).json({ error: 'PIX não configurado nesta loja' });
    }

    // Chamar serviço com credenciais centrais (via .env) e chave PIX do lojista
    const charge = await createPixCharge(
      s.pixKey,
      order.total,
      orderId.toString()
    );

    // Salvar txid no pedido para correlacionar webhook
    const existingNotes = order.notes ? JSON.parse(order.notes) : {};
    await prisma.order.update({
      where: { id: orderId },
      data: { notes: JSON.stringify({ ...existingNotes, pixTxid: charge.txid }) },
    });

    res.json(charge);
  } catch (err: any) {
    console.error('Erro ao criar cobrança PIX:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao gerar cobrança PIX. Verifique a configuração.' });
  }
});

// Webhook Efi Bank — confirmação de pagamento PIX
// Registre no painel Efi: https://seudominio.com/api/pix/webhook
app.post(
  '/api/pix/webhook',
  express.raw({ type: '*/*' }),
  async (req, res) => {
    const sig = req.headers['x-hub-signature'] as string | undefined;
    if (!validateWebhookSignature(req.body as Buffer, sig)) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
    try {
      const payload = JSON.parse((req.body as Buffer).toString());
      const pixArr: any[] = payload?.pix ?? [];
      for (const pix of pixArr) {
        const txid: string = pix.txid;
        if (!txid) continue;
        const orders = await prisma.order.findMany({
          where: { notes: { contains: txid } },
        });
        for (const order of orders) {
          if (order.status === 'PAID') continue;
          await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
          io.emit(`order:${order.restaurantId}:paid`, {
            orderId: order.id,
            txid,
            paidAt: pix.horario,
            endToEndId: pix.endToEndId,
          });
          console.log(`✅ PIX confirmado — Pedido #${order.id}`);
        }
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Erro no webhook PIX:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);
