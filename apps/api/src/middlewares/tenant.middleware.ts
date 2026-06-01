import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export interface TenantRequest extends Request {
  restaurantId?: number;
  restaurant?: any;
}

export const tenantMiddleware = async (req: TenantRequest, res: Response, next: NextFunction) => {
  const slug = req.headers['x-tenant-slug'] as string;
  
  console.log(`[Tenant] Buscando tenant para slug: "${slug}" na rota: ${req.path}`);

  if (!slug) {
    console.warn(`[Tenant] Slug ausente para a rota: ${req.path}`);
    return res.status(400).json({ error: 'Tenant slug is missing in headers (x-tenant-slug)' });
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      include: { plan: true }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!restaurant.isActive) {
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
