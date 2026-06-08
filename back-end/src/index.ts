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
            bannerBadge: 'O mais desejado de 2024',
            bannerTitleLine1: 'Sabor que',
            bannerTitleLine2: 'Transforma',
            bannerDescription: 'Experiência gastronômica executiva com ingredientes selecionados e preparo artesanal.',
            bannerCtaLabel: 'Explorar Menu',
            bannerImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2000',
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
