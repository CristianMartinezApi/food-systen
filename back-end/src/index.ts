import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { prisma } from './lib/prisma';
import { tenantMiddleware, TenantRequest } from './middlewares/tenant.middleware';
import { authMiddleware, AuthRequest } from './middlewares/auth.middleware';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getNextOpeningLabel, isRestaurantOpenNow, normalizeOperatingHours } from './utils/hours';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH", "PUT", "DELETE"] }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

    // Criar o primeiro restaurante (tenant principal)
    const hashedPassword = await bcrypt.hash('admin123', 10);
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
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);

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
  const rows = users.map(u => `${u.id},"${u.name.replace(/"/g,'""')}","${u.email}",${u.role},${u.isApproved},${u.restaurantId || ''},"${u.restaurant?.name?.replace(/"/g,'""') || ''}",${u.createdAt.toISOString()}`).join('\n');
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
  const rows = logs.map(l => `${l.id},${l.actorId ?? ''},"${(l.actorEmail||'').replace(/"/g,'""')}","${l.action}","${l.subjectType}",${l.subjectId ?? ''},"${JSON.stringify(l.details || {}).replace(/"/g,'""')}",${l.createdAt.toISOString()}`).join('\n');
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
    if (['READY','IN_PROGRESS','PAUSED','DENIED','PENDING'].includes(status)) {
      where.provisioningStatus = status;
    }

    const restaurants = await prisma.restaurant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { settings: true, users: true, plan: true }
    });

    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Erro ao buscar restaurantes' });
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
      select: { id: true, name: true, slug: true, provisioningStatus: true, databaseName: true, createdAt: true }
    });
    res.json(restaurants);
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
  try {
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { provisioningStatus: 'IN_PROGRESS' } });

    // Create a provisioning log entry (start)
    try {
      await prisma.provisioningLog.create({ data: { restaurantId, message: 'Provisioning retried by super-admin', level: 'info' } });
      await createAudit(req, 'retry_provisioning_start', 'restaurant', restaurantId, { note: 'Retry started by super admin' });
    } catch (e) {
      console.warn('Could not create provisioning log (start):', e);
    }

    // Simulate provisioning work (immediate for now)
    const updated = await prisma.restaurant.update({ where: { id: restaurantId }, data: { provisioningStatus: 'READY', isActive: true } });

    // Create a provisioning log entry (ready)
    try {
      await prisma.provisioningLog.create({ data: { restaurantId, message: 'Provisioning finished (simulated) - READY', level: 'info' } });
      await createAudit(req, 'retry_provisioning_finish', 'restaurant', restaurantId, { note: 'Retry finished (simulated)' });
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
    
    const settings = await prisma.settings.update({
      where: { restaurantId: req.restaurantId },
      data: {
        ...updateData,
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
    const orders = await prisma.order.findMany({
      where: {
        phone,
        restaurantId: req.restaurantId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true
          }
        }
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
    orderBy: { createdAt: 'desc' } 
  });
  res.json(orders);
});

app.post('/api/orders', async (req: TenantRequest, res) => {
  try {
    const { customerName, phone, address, paymentMethod, items, subtotal, deliveryFee, total, notes, cpf, changeFor } = req.body;
    const settings = await prisma.settings.findUnique({
      where: { restaurantId: req.restaurantId! }
    });

    if (settings && !isRestaurantOpenNow(settings.operatingHours)) {
      return res.status(403).json({
        error: 'Restaurante fechado no momento.',
        nextOpeningLabel: getNextOpeningLabel(settings.operatingHours)
      });
    }

    const order = await prisma.order.create({
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
        status: 'PENDING',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || item.id,
            name: item.name,
            variation: item.variation,
            quantity: item.quantity,
            price: item.price,
            observations: item.observations,
            addons: item.addons,
            removals: item.removals
          }))
        }
      },
      include: {
        items: true
      }
    });

    const responseOrder = {
      ...order,
      estimatedDeliveryMinutes: settings?.deliveryEtaMinutes || 35,
    };

    io.emit(`new_order_${req.restaurant?.slug}`, responseOrder);
    res.status(201).json(responseOrder);
  } catch (error) {
    console.error('Error creating order:', error);
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
