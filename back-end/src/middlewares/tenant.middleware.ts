import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export interface TenantRequest extends Request {
  restaurantId?: number;
  restaurant?: any;
}

export const tenantMiddleware = async (req: TenantRequest, res: Response, next: NextFunction) => {
  const slug = req.headers['x-tenant-slug'] as string;
  const isProd = process.env.NODE_ENV === 'production';
  
  console.log(`[Tenant] Buscando tenant para slug: "${slug}" na rota: ${req.path}`);

  if (!slug) {
    if (isProd) {
      console.warn(`[Tenant] Slug ausente para a rota: ${req.path}`);
      return res.status(400).json({ error: 'Tenant slug is missing in headers (x-tenant-slug)' });
    }

    // Fallback de desenvolvimento para evitar travar o ambiente local
    const fallbackRestaurant = await prisma.restaurant.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      include: { plan: true }
    });

    if (!fallbackRestaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    console.warn(`[Tenant] Slug ausente. Usando fallback local: "${fallbackRestaurant.slug}"`);
    req.restaurantId = fallbackRestaurant.id;
    req.restaurant = fallbackRestaurant;
    return next();
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      include: { plan: true }
    });

    if (!restaurant) {
      if (!isProd) {
        const fallbackRestaurant = await prisma.restaurant.findFirst({
          where: { isActive: true },
          orderBy: { id: 'asc' },
          include: { plan: true }
        });

        if (fallbackRestaurant) {
          console.warn(`[Tenant] Slug "${slug}" não encontrado. Usando fallback local: "${fallbackRestaurant.slug}"`);
          req.restaurantId = fallbackRestaurant.id;
          req.restaurant = fallbackRestaurant;
          return next();
        }
      }

      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!restaurant.isActive) {
      console.warn(`[Tenant] Tentativa de acesso a restaurante inativo: "${slug}"`);
      return res.status(403).json({ error: 'Restaurant is inactive' });
    }

    req.restaurantId = restaurant.id;
    req.restaurant = restaurant;
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Internal server error during tenant identification' });
  }
};
