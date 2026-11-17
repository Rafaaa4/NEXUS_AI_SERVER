import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      agent?: {
        id: string;
        serverId: string;
        organizationId: string;
      };
    }
  }
}

export const authenticateAgent = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED_AGENT', message: 'Missing agent authorization bearer token' },
    });
  }

  const rawSecret = authHeader.split(' ')[1];
  const secretHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

  try {
    const agent = await prisma.agent.findFirst({
      where: { secretHash },
    });

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_AGENT_CREDENTIALS', message: 'Agent token not recognized' },
      });
    }

    req.agent = {
      id: agent.id,
      serverId: agent.serverId,
      organizationId: agent.organizationId,
    };
    next();
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'AGENT_AUTH_ERROR', message: err.message },
    });
  }
};
