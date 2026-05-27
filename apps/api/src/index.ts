import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { prisma } from './lib/prisma';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH", "PUT", "DELETE"] }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- SEEDER INICIAL ---
const seedSettings = async () => {
  const count = await prisma.settings.count();
  if (count === 0) {
    await prisma.settings.create({
      data: {
        id: 1,
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
    });
    console.log('✅ Settings inicializadas');
  }
};
seedSettings();

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('📱 Cliente conectado:', socket.id);
});

// --- ROUTES ---

// Settings
app.get('/api/settings', async (req, res) => {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  res.json(settings);
});

app.patch('/api/settings', async (req, res) => {
  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: req.body
  });
  io.emit('settings_updated', settings);
  res.json(settings);
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ 
      include: { products: true },
      orderBy: { order: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({ error: 'Erro ao criar categoria. Verifique se o slug já existe.' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(400).json({ error: 'Erro ao excluir categoria. Ela pode conter produtos vinculados.' });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ include: { category: true } });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    io.emit('products_updated', await prisma.product.findMany());
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ error: 'Erro ao criar produto. Verifique se todos os campos foram preenchidos corretamente.' });
  }
});

app.patch('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({ error: 'Erro ao atualizar produto.' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
  res.status(204).send();
});

// Orders
app.get('/api/orders', async (req, res) => {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const order = await prisma.order.create({
    data: {
      ...req.body,
      status: 'new'
    }
  });
  io.emit('new_order', order);
  res.status(201).json(order);
});

app.patch('/api/orders/:id', async (req, res) => {
  const order = await prisma.order.update({
    where: { id: parseInt(req.params.id) },
    data: { status: req.body.status }
  });
  io.emit('order_status_updated', order);
  res.json(order);
});

// Stats
app.get('/api/stats', async (req, res) => {
  const [totalOrders, totalSales, pendingOrders, recentOrders] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: 'delivered' },
      _sum: { total: true }
    }),
    prisma.order.count({
      where: { NOT: { OR: [{ status: 'delivered' }, { status: 'cancelled' }] } }
    }),
    prisma.order.findMany({
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
