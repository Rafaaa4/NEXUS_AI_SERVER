import React from 'react';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Sparkles, Server, CreditCard, ArrowRight } from 'lucide-react';

interface Props {
  subscription: any;
  plans: any[];
  onUpgradePlan: (plan: string) => void;
}

export const CostView: React.FC<Props> = ({ subscription, plans, onUpgradePlan }) => {
  const currentPlan = subscription?.subscription?.plan || 'free';
  const planPrice = subscription?.planDetails?.price || 0;
  const budget = 100; // $100 monthly budget ceiling
  const budgetPct = Math.min(Math.round((planPrice / budget) * 100), 100);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <DollarSign className="h-4 w-4" />
            <span>Financial & Cloud Resource Accounting</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Cost Management & Budgets</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track infrastructure expenses, enforce monthly budget limits, and implement AI cost optimizations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-semibold">
            Current Tier: {currentPlan.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Budget & Cost KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
          <span className="text-xs font-semibold text-slate-400">Monthly Spending</span>
          <div className="text-3xl font-black text-white">${planPrice}</div>
          <div className="text-[11px] text-slate-500 font-mono">Billed monthly via NEXUS SaaS billing</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Budget Limit</span>
            <span className="font-mono text-emerald-400 font-bold">${planPrice} / ${budget}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${budgetPct}%` }}
            ></div>
          </div>
          <div className="text-[11px] text-slate-400">You are utilizing {budgetPct}% of your budget ceiling.</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
          <span className="text-xs font-semibold text-slate-400">Active Quotas</span>
          <div className="text-2xl font-black text-white">
            {subscription?.usage?.serverCount || 1} / {subscription?.usage?.serverLimit || 2}{' '}
            <span className="text-xs font-normal text-slate-400">Servers</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Remaining Capacity: {subscription?.usage?.remainingServers || 1} servers available
          </div>
        </div>
      </div>

      {/* AI Cost Optimization Recommendations */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800/60 pb-3">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="font-bold text-sm text-white">AI Cost Optimization Insights</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-400">Docker Image Cache Cleanup</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded">
                Save ~1.2 GB
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Dangling build layers can be pruned automatically without affecting running container stacks.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-blue-400">Right-Sizing Instance</span>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded">
                Optimal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Host CPU load is averaging 18%. Your current VPS tier has sufficient headroom for 3 additional apps.
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white">Subscription Tiers & Infrastructure Quotas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = currentPlan === p.tier;
            return (
              <div
                key={p.tier}
                className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition ${
                  isCurrent
                    ? 'bg-blue-900/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-white">{p.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white">
                    ${p.price} <span className="text-xs text-slate-500 font-normal">/ month</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 pt-2">
                    {p.features?.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {!isCurrent ? (
                  <button
                    onClick={() => onUpgradePlan(p.tier)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center justify-center space-x-1.5"
                  >
                    <span>Upgrade to {p.name}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="text-center text-xs text-slate-400 font-mono py-2 bg-slate-900 rounded-xl border border-slate-800">
                    Current Active Plan
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
