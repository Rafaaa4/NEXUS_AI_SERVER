import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organizationId?: string;
      userRole?: string;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header',
      },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
    req.user = {
      id: payload.userId,
      email: payload.email,
    };
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      },
    });
  }
};
