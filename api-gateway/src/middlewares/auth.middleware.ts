import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'PRUEBA_TECNICA_SECRET_KEY';

export interface AuthenticatedRequest extends Request {
  jwtPayload?: jwt.JwtPayload | string;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.jwtPayload = jwt.verify(token, JWT_SECRET);
      next();
      return;
    } catch {
      res.status(401).json({
        statusCode: 401,
        message: 'Token JWT invalido o expirado',
        error: 'Unauthorized',
      });
      return;
    }
  }

  if (req.headers['x-api-key']) {
    next();
    return;
  }

  res.status(401).json({
    statusCode: 401,
    message: 'Se requiere autenticacion: Bearer token o x-api-key',
    error: 'Unauthorized',
  });
}
