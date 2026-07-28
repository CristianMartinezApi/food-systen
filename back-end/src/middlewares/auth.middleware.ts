import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { getAuthToken } from '../utils/auth-cookie';
import { TenantRequest } from './tenant.middleware';

export interface AuthRequest extends TenantRequest {
  userId?: number;
  userRole?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('CRÍTICO: JWT_SECRET não está configurado');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded !== 'object' || !Number.isInteger(Number(decoded.id))) {
      return res.status(401).json({ error: 'Token invalid' });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      select: {
        id: true,
        role: true,
        restaurantId: true,
        isActive: true,
        isApproved: true,
        sessionVersion: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      (!user.isApproved && user.role !== 'SUPER_ADMIN') ||
      Number(decoded.sessionVersion) !== user.sessionVersion
    ) {
      return res.status(401).json({ error: 'Sessão inválida ou usuário desativado' });
    }

    req.userId = user.id;
    req.userRole = user.role;

    if (
      user.role !== 'SUPER_ADMIN' &&
      req.restaurantId !== undefined &&
      Number(user.restaurantId) !== Number(req.restaurantId)
    ) {
      return res.status(403).json({ error: 'Forbidden: You do not belong to this restaurant' });
    }

    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalid' });
  }
};
