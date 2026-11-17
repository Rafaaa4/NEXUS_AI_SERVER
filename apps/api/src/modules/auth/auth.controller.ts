import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { prisma } from '../../lib/prisma';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err.message === 'EMAIL_ALREADY_EXISTS') {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists' },
        });
      }
      return res.status(500).json({
        success: false,
        error: { code: 'REGISTRATION_FAILED', message: err.message },
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
      }
      return res.status(500).json({
        success: false,
        error: { code: 'LOGIN_FAILED', message: err.message },
      });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const result = await AuthService.refresh(req.body.refreshToken);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: err.message },
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      if (req.body.refreshToken) {
        await AuthService.logout(req.body.refreshToken);
      }
      return res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'LOGOUT_FAILED', message: err.message },
      });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          emailVerified: true,
          createdAt: true,
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
          },
          organizations: user.memberships.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role,
          })),
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_ME_FAILED', message: err.message },
      });
    }
  }
}
