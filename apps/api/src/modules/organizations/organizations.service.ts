import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';

export class OrganizationsService {
  static async listUserOrganizations(userId: string) {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { servers: true, memberships: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      serverCount: m.organization._count.servers,
      memberCount: m.organization._count.memberships,
      createdAt: m.organization.createdAt,
    }));
  }

  static async createOrganization(userId: string, data: { name: string; slug?: string }) {
    const baseSlug = (data.slug || data.name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name: data.name,
          slug,
        },
      });

      await tx.membership.create({
        data: {
          organizationId: newOrg.id,
          userId,
          role: 'owner',
        },
      });

      return newOrg;
    });

    return org;
  }

  static async getOrganization(orgId: string) {
    return prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { servers: true, memberships: true, incidents: true },
        },
      },
    });
  }

  static async listMembers(orgId: string) {
    const members = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      fullName: m.user.fullName,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  static async addMember(orgId: string, email: string, role: Role) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const existing = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      throw new Error('USER_ALREADY_MEMBER');
    }

    return prisma.membership.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role,
      },
    });
  }

  static async updateMemberRole(orgId: string, targetUserId: string, role: Role) {
    return prisma.membership.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
      data: { role },
    });
  }

  static async removeMember(orgId: string, targetUserId: string) {
    return prisma.membership.delete({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
    });
  }
}
