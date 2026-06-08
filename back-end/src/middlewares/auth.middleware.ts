import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TenantRequest } from './tenant.middleware';

export interface AuthRequest extends TenantRequest {
  userId?: number;
  userRole?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Token error' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token malformatted' });
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key';

  jwt.verify(token, secret, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: 'Token invalid' });
    }

    req.userId = decoded.id;
    req.userRole = decoded.role;

    // Se o usuário estiver tentando acessar um recurso de um restaurante,
    // verificamos se ele pertence a esse restaurante (exceto se for SUPER_ADMIN)
    if (decoded.role !== 'SUPER_ADMIN' && req.restaurantId !== undefined && decoded.restaurantId !== req.restaurantId) {
      return res.status(403).json({ error: 'Forbidden: You do not belong to this restaurant' });
    }

    return next();
  });
};
