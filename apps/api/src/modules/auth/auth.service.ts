import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { config } from '../../config/env';

export class AuthService {
  static generateAccessToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });
  }

  static async generateRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiresDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  static async register(data: { email: string; password: string; fullName?: string }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user and default organization in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          fullName: data.fullName,
        },
      });

      // Default slug derived from name or email
      const orgName = data.fullName ? `${data.fullName}'s Org` : 'My Organization';
      const baseSlug = (data.fullName || data.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug,
        },
      });

      await tx.membership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'owner',
        },
      });

      return { user, org };
    });

    const accessToken = this.generateAccessToken(result.user.id, result.user.email);
    const refreshToken = await this.generateRefreshToken(result.user.id);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      },
      organization: result.org,
      accessToken,
      refreshToken,
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const match = await bcrypt.compare(data.password, user.passwordHash);
    if (!match) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
      accessToken,
      refreshToken,
    };
  }

  static async refresh(rawRefreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.revoked || record.expiresAt < new Date()) {
      throw new Error('INVALID_OR_EXPIRED_REFRESH_TOKEN');
    }

    // Revoke old refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true },
    });

    const newAccessToken = this.generateAccessToken(record.user.id, record.user.email);
    const newRefreshToken = await this.generateRefreshToken(record.user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(rawRefreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }
}
