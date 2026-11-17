import { prisma } from '../../lib/prisma';
import { PlanTier } from '@prisma/client';

export const PLANS = {
  free: {
    tier: 'free' as PlanTier,
    name: 'Starter / Free',
    price: 0,
    serverLimit: 2,
    aiRequestsLimit: 50,
    features: ['Up to 2 Linux VPS servers', 'Live metrics monitoring', 'Automated anomaly detection', '50 AI diagnoses/month'],
  },
  pro: {
    tier: 'pro' as PlanTier,
    name: 'Professional DevOps',
    price: 29,
    serverLimit: 10,
    aiRequestsLimit: 500,
    features: ['Up to 10 Linux VPS servers', '1-click approval remediation', 'Log retention (14 days)', '500 AI diagnoses/month', 'Priority job queue'],
  },
  enterprise: {
    tier: 'enterprise' as PlanTier,
    name: 'Enterprise Fleet',
    price: 199,
    serverLimit: 100,
    aiRequestsLimit: 10000,
    features: ['Up to 100 Linux VPS servers', 'Full audit logging & compliance', 'Custom allowlist commands', 'Unlimited AI diagnoses', 'Dedicated support'],
  },
};

export class BillingService {
  static async getSubscription(organizationId: string) {
    let sub = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!sub) {
      sub = await prisma.subscription.create({
        data: {
          organizationId,
          plan: 'free',
          serverLimit: PLANS.free.serverLimit,
          aiRequestsLimit: PLANS.free.aiRequestsLimit,
        },
      });
    }

    const currentServerCount = await prisma.server.count({
      where: { organizationId },
    });

    return {
      subscription: sub,
      planDetails: PLANS[sub.plan],
      usage: {
        serverCount: currentServerCount,
        serverLimit: sub.serverLimit,
        remainingServers: Math.max(0, sub.serverLimit - currentServerCount),
      },
    };
  }

  static async changePlan(organizationId: string, targetPlan: PlanTier) {
    const planConfig = PLANS[targetPlan];
    if (!planConfig) {
      throw new Error('INVALID_PLAN');
    }

    return prisma.subscription.upsert({
      where: { organizationId },
      update: {
        plan: targetPlan,
        serverLimit: planConfig.serverLimit,
        aiRequestsLimit: planConfig.aiRequestsLimit,
      },
      create: {
        organizationId,
        plan: targetPlan,
        serverLimit: planConfig.serverLimit,
        aiRequestsLimit: planConfig.aiRequestsLimit,
      },
    });
  }

  static async enforceServerQuota(organizationId: string) {
    const subInfo = await this.getSubscription(organizationId);
    if (subInfo.usage.serverCount >= subInfo.usage.serverLimit) {
      throw new Error(`QUOTA_EXCEEDED: Plan '${subInfo.subscription.plan}' allows a maximum of ${subInfo.usage.serverLimit} connected servers.`);
    }
  }
}
