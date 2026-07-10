/**
 * 🌱 Seed Script - Popula banco com dados de teste
 * 
 * NUNCA use `prisma migrate reset` em PRODUÇÃO!
 * Use este script apenas para preencher dados de desenvolvimento
 * 
 * Uso:
 *   npm run seed
 */

import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Iniciando seed de dados de teste...\n');

  try {
    // 0. Criar ou obter Plan padrão
    let plan = await prisma.plan.findFirst();
    
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: 'PRO',
          tier: 'PRO',
          price: 9990,
          maxProducts: 500,
          maxOrders: 10000
        }
      });
      console.log('✅ Plano criado:', plan.name);
    } else {
      console.log('✅ Plano encontrado:', plan.name);
    }

    // 1. Criar Super Admin
    const superAdmin = await prisma.user.upsert({
      where: { email: 'admin@food-systen.com' },
      update: {},
      create: {
        email: 'admin@food-systen.com',
        name: 'Super Admin',
        password: await bcrypt.hash('admin123', 10),
        role: 'SUPER_ADMIN',
        isApproved: true,
        isActive: true
      }
    });
    console.log('✅ Super Admin criado:', superAdmin.email);

    // 2. Criar Restaurante de Teste
    const restaurant = await prisma.restaurant.upsert({
      where: { slug: 'restaurante-teste' },
      update: {},
      create: {
        name: 'Restaurante Teste',
        slug: 'restaurante-teste',
        phone: '1133334444',
        cnpj: '12345678000190',
        corporateName: 'Restaurante Teste LTDA',
        description: 'Restaurante de teste do Food-Systen',
        isActive: true,
        provisioningStatus: 'COMPLETED',
        subscriptionStatus: 'active',
        planId: plan.id,
        // PIX Configuration
        pixKey: 'seu@email.com',
        pixKeyType: 'email',
        whatsappNumber: '+5511999999999',
        pixInstructions: 'Escaneie o QR code PIX ou use a chave seu@email.com'
      }
    });
    console.log('✅ Restaurante criado:', restaurant.name);

    // 3. Criar Owner do Restaurante
    const owner = await prisma.user.upsert({
      where: { email: 'owner@restaurante-teste.com' },
      update: {},
      create: {
        email: 'owner@restaurante-teste.com',
        name: 'Dono do Restaurante',
        password: await bcrypt.hash('senha123', 10),
        role: 'OWNER',
        isApproved: true,
        isActive: true,
        restaurantId: restaurant.id
      }
    });
    console.log('✅ Owner criado:', owner.email);

    // 4. Criar Categorias
    const categories = [
      { name: 'Pizzas', slug: 'pizzas', order: 1 },
      { name: 'Bebidas', slug: 'bebidas', order: 2 },
      { name: 'Sobremesas', slug: 'sobremesas', order: 3 },
      { name: 'Combos', slug: 'combos', order: 4 }
    ];

    const createdCategories = await Promise.all(
      categories.map(cat =>
        prisma.category.upsert({
          where: { restaurantId_slug: { restaurantId: restaurant.id, slug: cat.slug } },
          update: {},
          create: {
            ...cat,
            restaurantId: restaurant.id,
            isActive: true,
            typeMontagem: 'padrao'
          }
        })
      )
    );
    console.log('✅ Categorias criadas:', createdCategories.length);

    // 5. Criar Produtos
    const pizzaCategory = createdCategories[0];
    
    const products = [
      {
        name: 'PIZZA MARGARITA',
        description: 'Pizza clássica com queijo mozzarela e tomate',
        price: 4500, // R$ 45,00
        categoryId: pizzaCategory.id,
        sizes: [
          { name: 'P', price: 35 },
          { name: 'M', price: 45 },
          { name: 'G', price: 55 }
        ]
      },
      {
        name: 'PIZZA CALABRESA',
        description: 'Pizza com calabresa fatiada e cebola',
        price: 4800,
        categoryId: pizzaCategory.id,
        sizes: [
          { name: 'P', price: 38 },
          { name: 'M', price: 48 },
          { name: 'G', price: 58 }
        ]
      },
      {
        name: 'PIZZA ESPECIAL DO CHEF',
        description: 'A melhor pizza da casa com tudo de bom',
        price: 5500,
        categoryId: pizzaCategory.id,
        sizes: [
          { name: 'P', price: 45 },
          { name: 'M', price: 55 },
          { name: 'G', price: 65 }
        ]
      }
    ];

    const createdProducts = await Promise.all(
      products.map(prod =>
        prisma.product.upsert({
          where: { id: 999 }, // Dummy, sempre vai criar novo
          update: {},
          create: {
            name: prod.name,
            description: prod.description,
            price: prod.price,
            categoryId: prod.categoryId,
            restaurantId: restaurant.id,
            isActive: true,
            isFeatured: Math.random() > 0.5,
            trackStock: false,
            sizes: prod.sizes as any
          }
        })
      )
    );
    console.log('✅ Produtos criados:', createdProducts.length);

    // 6. Criar Cliente de Teste
    const customer = await prisma.customer.upsert({
      where: { id: 999 }, // Dummy
      update: {},
      create: {
        name: 'Cliente Teste',
        phone: '11987654321',
        email: 'cliente@teste.com',
        restaurantId: restaurant.id
      }
    });
    console.log('✅ Cliente criado:', customer.name);

    // 7. Criar Sessão de Caixa Aberta
    const cashSession = await prisma.cashSession.create({
      data: {
        restaurantId: restaurant.id,
        openedById: owner.id,
        openingAmount: 10000, // R$ 100,00 de abertura
        status: 'OPEN',
        openedAt: new Date()
      }
    });
    console.log('✅ Sessão de caixa aberta:', cashSession.id);

    // 8. Criar Pedidos de Teste
    const order1 = await prisma.order.create({
      data: {
        customerName: customer.name,
        phone: customer.phone,
        restaurantId: restaurant.id,
        customerId: customer.id,
        status: 'DELIVERED',
        paymentMethod: 'CASH',
        subtotal: 13500,
        deliveryFee: 500,
        total: 14000,
        cashSessionId: cashSession.id,
        items: {
          create: [
            {
              productId: createdProducts[0].id,
              quantity: 2,
              price: 45,
              observations: 'Sem cebola'
            },
            {
              productId: createdProducts[1].id,
              quantity: 1,
              price: 48,
              observations: null
            }
          ]
        }
      }
    });
    console.log('✅ Pedido 1 criado:', order1.id);

    const order2 = await prisma.order.create({
      data: {
        customerName: 'João Silva',
        phone: '11912345678',
        restaurantId: restaurant.id,
        status: 'CONFIRMED',
        paymentMethod: 'PIX',
        subtotal: 5500,
        deliveryFee: 0,
        total: 5500,
        cashSessionId: cashSession.id,
        items: {
          create: [
            {
              productId: createdProducts[2].id,
              quantity: 1,
              price: 55,
              observations: 'Adicionar molho extra'
            }
          ]
        }
      }
    });
    console.log('✅ Pedido 2 criado:', order2.id);

    // 9. Criar Movimentação de Caixa (SUPPLY = entrada)
    await prisma.cashMovement.create({
      data: {
        restaurantId: restaurant.id,
        cashSessionId: cashSession.id,
        type: 'SUPPLY',
        amount: 14000,
        reason: 'Venda do Pedido #1',
        createdById: owner.id
      }
    });
    console.log('✅ Movimentação de caixa registrada');

    console.log('\n🎉 ✅ SEED CONCLUÍDO COM SUCESSO!\n');
    console.log('📊 Dados de Teste Criados:');
    console.log('   - 1 Super Admin');
    console.log('   - 1 Restaurante');
    console.log('   - 1 Owner');
    console.log('   - 3 Categorias');
    console.log('   - 3 Produtos');
    console.log('   - 1 Cliente');
    console.log('   - 1 Sessão de Caixa');
    console.log('   - 2 Pedidos\n');
    console.log('🔑 Credenciais de Acesso:');
    console.log('   Email: owner@restaurante-teste.com');
    console.log('   Senha: senha123\n');
    console.log('💡 IMPORTANTE: Não use `prisma migrate reset` em produção!');
    console.log('   Use `npx prisma migrate deploy` para aplicar migrações sem perder dados.\n');

  } catch (error) {
    console.error('❌ Erro ao popular banco:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
