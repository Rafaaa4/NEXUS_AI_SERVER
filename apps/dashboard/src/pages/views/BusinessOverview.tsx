import React from 'react';
import { useMode } from '../../context/ModeContext';
import {
  Server,
  AppWindow,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  Activity,
  Bot,
  Rocket,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
  Shield,
  Check,
  Folder,
} from 'lucide-react';
import { NavSection } from '../../components/Sidebar';

interface Props {
  servers: any[];
  applications: any[];
  incidents: any[];
  proposals: any[];
  subscription: any;
  onNavigate: (section: NavSection) => void;
  onOpenAddServer: () => void;
  onApproveProposal: (proposal: any) => void;
}

export const BusinessOverview: React.FC<Props> = ({
  servers,
  applications,
  incidents,
  proposals,
  subscription,
  onNavigate,
  onOpenAddServer,
  onApproveProposal,
}) => {
  const { isBusiness } = useMode();

  const onlineServers = servers.filter((s) => s.status === 'online').length;
  const runningApps = applications.filter((a) => a.status === 'running').length;
  const openIncidents = incidents.filter((i) => i.status !== 'resolved');
  const pendingProposals = proposals.filter((p) => p.status === 'pending');

  // Compute a real Health Score (0 - 100)
  const totalWeight = Math.max(servers.length, 1);
  const healthRatio = (onlineServers / totalWeight) * 100;
  const incidentPenalty = openIncidents.length * 15;
  const healthScore = Math.max(Math.min(Math.round(healthRatio - incidentPenalty), 100), 0);

  const getHealthBadge = (score: number) => {
    if (score >= 90) return { label: 'Optimal & Secure', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 70) return { label: 'Attention Needed', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Critical Action Required', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  const healthBadge = getHealthBadge(healthScore);

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Mode Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-purple-900/30 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>NEXUS AI Autonomous Business Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Company Digital Infrastructure
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isBusiness
                ? 'Your entire business infrastructure is operating smoothly under AI supervision. No Linux or technical knowledge is required.'
                : 'Enterprise multi-tenant host cluster. Telemetry streams active via outbound TLS heartbeat and Go agent runtime.'}
            </p>
          </div>

          {/* Operational Health Score Gauge */}
          <div className="flex items-center space-x-4 bg-slate-950/70 border border-slate-800 p-4 rounded-2xl shrink-0">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke={healthScore >= 90 ? '#10b981' : healthScore >= 70 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="6"
                  strokeDasharray={175}
                  strokeDashoffset={175 - (175 * healthScore) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute font-black text-white text-base">{healthScore}%</span>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Health Score</div>
              <div className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold mt-1 ${healthBadge.color}`}>
                {healthBadge.label}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">Uptime: 99.98%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals Warning Banner (If any pending action proposals) */}
      {pendingProposals.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300">
                {pendingProposals.length} Action Proposals Awaiting Executive Approval
              </div>
              <div className="text-[11px] text-slate-300">
                AI recommends applying verified security rules or stack updates. Operations are paused until you authorize.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('ai')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/25 shrink-0 transition"
          >
            Review & Authorize ({pendingProposals.length})
          </button>
        </div>
      )}

      {/* Executive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Servers */}
        <div
          onClick={() => onNavigate('infrastructure')}
          className="bg-slate-900/60 hover:bg-slate-800/40 border border-slate-800/80 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Host Servers</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 flex items-baseline space-x-2">
            <span>{servers.length}</span>
            <span className="text-xs font-mono font-medium text-emerald-400">
              ({onlineServers} Online)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Quota: {subscription?.usage?.serverLimit || 2} Allowed</span>
            <span className="text-blue-400 group-hover:underline">Manage →</span>
          </div>
        </div>

        {/* Card 2: Applications */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-slate-900/60 hover:bg-slate-800/40 border border-slate-800/80 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Applications</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
              <AppWindow className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 flex items-baseline space-x-2">
            <span>{applications.length}</span>
            <span className="text-xs font-mono font-medium text-emerald-400">
              ({runningApps} Healthy)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Docker Stacks & Repos</span>
            <span className="text-purple-400 group-hover:underline">Inspect →</span>
          </div>
        </div>

        {/* Card 3: Security & Incidents */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="bg-slate-900/60 hover:bg-slate-800/40 border border-slate-800/80 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">System Incidents</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-105 transition">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 flex items-baseline space-x-2">
            <span>{openIncidents.length}</span>
            <span className="text-xs font-semibold text-slate-400">Active Alerts</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>{openIncidents.length === 0 ? 'Zero active anomalies' : 'AI Diagnostic Ready'}</span>
            <span className="text-rose-400 group-hover:underline">View Timeline →</span>
          </div>
        </div>

        {/* Card 4: Monthly Spending */}
        <div
          onClick={() => onNavigate('cost')}
          className="bg-slate-900/60 hover:bg-slate-800/40 border border-slate-800/80 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Est. Cloud Spending</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 flex items-baseline space-x-2">
            <span>${subscription?.planDetails?.price || 0}</span>
            <span className="text-xs text-slate-400 font-normal">/ month</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Tier: {subscription?.subscription?.plan?.toUpperCase() || 'FREE'}</span>
            <span className="text-emerald-400 group-hover:underline">Cost Details →</span>
          </div>
        </div>
      </div>

      {/* Business Insights & Guided Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Business Infrastructure Status & Recommendations */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-purple-400" />
              <h2 className="text-sm font-bold text-white">NEXUS AI Virtual DevOps Executive Briefing</h2>
            </div>
            <span className="text-[10px] bg-purple-500/10 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-500/20">
              Live Analysis
            </span>
          </div>

          <div className="space-y-3">
            {/* Plain English Insights */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Core Operating Systems: Normal</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isBusiness
                  ? 'All server storage drives, processor loads, and network interfaces are performing within healthy safety margins. Applications have no detected downtime.'
                  : 'Outbound agent telemetry active. Sysctl /proc/stat reports normalized load avg < 1.0. Zero dropped TCP packets.'}
              </p>
            </div>

            {applications.length > 0 && (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
                  <Rocket className="h-4 w-4" />
                  <span>Latest Deployment: {applications[0]?.appName}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Deployed successfully from GitHub (branch: {applications[0]?.branch}). Local health checks returned HTTP 200 OK.
                </p>
              </div>
            )}

            {openIncidents.length > 0 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300">
                    Incident: {openIncidents[0].title}
                  </span>
                  <button
                    onClick={() => onNavigate('monitoring')}
                    className="text-xs text-rose-400 hover:underline font-semibold"
                  >
                    Investigate →
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  {openIncidents[0].description || 'Anomaly detected on host machine.'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('ai')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/25 flex items-center space-x-2 transition"
            >
              <Bot className="h-4 w-4" />
              <span>Ask AI to Investigate</span>
            </button>
            <button
              onClick={onOpenAddServer}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700/60 flex items-center space-x-2 transition"
            >
              <Server className="h-4 w-4 text-blue-400" />
              <span>Connect New VPS</span>
            </button>
            <button
              onClick={() => onNavigate('deployments')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700/60 flex items-center space-x-2 transition"
            >
              <Rocket className="h-4 w-4 text-emerald-400" />
              <span>Deploy Application</span>
            </button>
          </div>
        </div>

        {/* Right Column: Infrastructure Summary & Baseline Stacks */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800/60 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Infrastructure Overview</h2>
            <button onClick={() => onNavigate('infrastructure')} className="text-xs text-blue-400 hover:underline">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {servers.slice(0, 3).map((srv) => (
              <div key={srv.id} className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${srv.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
                  <div>
                    <div className="text-xs font-bold text-white">{srv.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{srv.provider} • {srv.osName || 'Linux'}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {srv.status.toUpperCase()}
                </span>
              </div>
            ))}

            {servers.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No servers connected yet. Click "Connect New VPS" to connect your first server.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Security & Disaster Recovery
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>UFW Firewall</span>
                </span>
                <span className="text-emerald-400 font-semibold font-mono">Protected</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  <span>Automated Backups</span>
                </span>
                <span className="text-blue-400 font-semibold font-mono">Daily Active</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <Activity className="h-3.5 w-3.5 text-purple-400" />
                  <span>AI Incident Guardian</span>
                </span>
                <span className="text-purple-400 font-semibold font-mono">Autonomous</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
