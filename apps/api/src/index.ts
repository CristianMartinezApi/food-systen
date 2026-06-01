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

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH", "PUT", "DELETE"] }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
        planId: plan.id,
        users: {
          create: {
            name: 'Admin',
            email: 'admin@foodsystem.com',
            password: hashedPassword,
            role: 'OWNER'
          }
        },
        settings: {
          create: {
            storeName: 'FoodSystem Burger',
            phone: '(11) 99999-9999',
            address: 'Rua das Flores, 123 - Centro',
            bio: 'O melhor hambúrguer artesanal da região, feito com ingredientes frescos e selecionados.',
            operatingHours: {
              seg: { open: '18:00', close: '23:00', closed: false },
              ter: { open: '18:00', close: '23:00', closed: false },
              qua: { open: '18:00', close: '23:00', closed: false },
              qui: { open: '18:00', close: '23:00', closed: false },
              sex: { open: '18:00', close: '00:00', closed: false },
              sab: { open: '12:00', close: '00:00', closed: false },
              dom: { open: '12:00', close: '23:00', closed: false }
            },
            deliveryFee: 5.0,
            minOrderValue: 20.0,
            isOpen: true,
            primaryColor: '#ef4444',
            latitude: -23.55052,
            longitude: -46.633308
          }
        }
      }
    });
    console.log('✅ Restaurante e Settings inicializados');
  }
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
  try {
    const { name, email, password, restaurantName, slug } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email já cadastrado' });

    const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingRestaurant) return res.status(400).json({ error: 'Slug já está em uso' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const plan = await prisma.plan.findFirst({ where: { tier: 'FREE' } });

    const restaurant = await prisma.restaurant.create({
      data: {
        name: restaurantName,
        slug,
        planId: plan?.id,
        users: {
          create: {
            name,
            email,
            password: hashedPassword,
            role: 'OWNER'
          }
        },
        settings: {
          create: {
            storeName: restaurantName,
          }
        }
      },
      include: {
        users: true
      }
    });

    const user = restaurant.users[0];
    const token = jwt.sign(
      { id: user.id, role: user.role, restaurantId: restaurant.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token, restaurant });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
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

// Aplicar middleware de tenant para todas as rotas subseqüentes /api
app.use('/api', tenantMiddleware);

// Settings
app.get('/api/settings', async (req: TenantRequest, res) => {
  const settings = await prisma.settings.findUnique({ 
    where: { restaurantId: req.restaurantId } 
  });
  res.json(settings);
});

app.patch('/api/settings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, restaurantId, createdAt, updatedAt, ...updateData } = req.body;
    
    const settings = await prisma.settings.update({
      where: { restaurantId: req.restaurantId },
      data: updateData
    });
    
    io.emit(`settings_updated_${req.restaurant?.slug}`, settings);
    res.json(settings);
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
app.get('/api/orders', authMiddleware, async (req: AuthRequest, res) => {
  const orders = await prisma.order.findMany({ 
    where: { restaurantId: req.restaurantId },
    orderBy: { createdAt: 'desc' } 
  });
  res.json(orders);
});

app.post('/api/orders', async (req: TenantRequest, res) => {
  try {
    const { customerName, phone, address, paymentMethod, items, subtotal, deliveryFee, total, notes } = req.body;

    const order = await prisma.order.create({
      data: {
        customerName,
        phone,
        address,
        paymentMethod,
        subtotal: subtotal || (total - (deliveryFee || 0)),
        deliveryFee: deliveryFee || 0,
        total,
        notes,
        restaurantId: req.restaurantId!,
        status: 'PENDING',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || item.id, // Suporte a 'id' vindo do frontend
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: {
        items: true
      }
    });

    io.emit(`new_order_${req.restaurant?.slug}`, order);
    res.status(201).json(order);
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
  const [totalOrders, totalSales, pendingOrders, recentOrders] = await Promise.all([
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
      orderBy: { createdAt: 'desc' }
    })
  ]);

  res.json({
    totalOrders,
    totalSales: totalSales._sum.total || 0,
    pendingOrders,
    recentOrders
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 API com PostgreSQL rodando em http://localhost:${PORT}`);
});
