import React, { useState } from 'react';
import { useMode } from '../../context/ModeContext';
import {
  Server as ServerIcon,
  HardDrive,
  Cpu,
  Activity,
  Boxes,
  Shield,
  Zap,
  Rocket,
  FileText,
  Terminal,
  Clock,
  CheckCircle2,
  RefreshCw,
  Check,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { ActionProposal } from '../../services/api';

interface Props {
  servers: any[];
  proposals: ActionProposal[];
  onOpenAddServer: () => void;
  onDeployApp: (server: { id: string; name: string }) => void;
  onOpenLogs: (server: { id: string; name: string }) => void;
  onShowInstallCmd: (serverId: string) => void;
  onGenerateBaselines: (serverId: string) => void;
  onApproveProposal: (proposal: ActionProposal) => void;
}

export const InfrastructureView: React.FC<Props> = ({
  servers,
  proposals,
  onOpenAddServer,
  onDeployApp,
  onOpenLogs,
  onShowInstallCmd,
  onGenerateBaselines,
  onApproveProposal,
}) => {
  const { isBusiness } = useMode();
  const [filter, setFilter] = useState<'all' | 'online' | 'pending'>('all');

  const filteredServers = servers.filter((s) => {
    if (filter === 'online') return s.status === 'online';
    if (filter === 'pending') return s.status === 'pending';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <ServerIcon className="h-4 w-4" />
            <span>Infrastructure Fleet Management</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Host Servers & Runtime Clusters</h1>
          <p className="text-xs text-slate-400 mt-1">
            {isBusiness
              ? 'Manage all your company host machines, automated stacks, and firewall rules in one unified control panel.'
              : 'Bare metal and cloud virtual machines connected via secure outbound TLS nexus-agent.'}
          </p>
        </div>

        <button
          onClick={onOpenAddServer}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Connect New VPS</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Servers ({servers.length})
        </button>
        <button
          onClick={() => setFilter('online')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'online' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Online ({servers.filter((s) => s.status === 'online').length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Pending Enrollment ({servers.filter((s) => s.status === 'pending').length})
        </button>
      </div>

      {/* Server Inventory List */}
      <div className="space-y-4">
        {filteredServers.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-16 text-center shadow-xl">
            <ServerIcon className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No servers found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              Connect your first Linux VPS to start deploying applications and monitoring health.
            </p>
            <button
              onClick={onOpenAddServer}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
            >
              Connect Server Now
            </button>
          </div>
        ) : (
          filteredServers.map((server) => {
            const serverProposals = proposals.filter(
              (p) => p.serverId === server.id && p.actionType.startsWith('provision.')
            );

            return (
              <div
                key={server.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700/80 transition"
              >
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                        server.status === 'online'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <HardDrive className="h-6 w-6" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-white text-base">{server.name}</span>
                        {server.status === 'online' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Online & Healthy</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <Clock className="h-3 w-3" />
                            <span>Pending Enrollment</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-400">
                        <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {server.hostname || 'waiting for agent...'}
                        </span>
                        <span>•</span>
                        <span>{server.provider || 'Cloud VPS'}</span>
                        <span>•</span>
                        <span>{server.osName || 'Linux'} ({server.architecture || 'x86_64'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {server.status === 'online' && (
                      <>
                        <button
                          onClick={() => onDeployApp({ id: server.id, name: server.name })}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-blue-600/25"
                        >
                          <Rocket className="h-3.5 w-3.5" />
                          <span>Deploy App</span>
                        </button>
                        <button
                          onClick={() => onGenerateBaselines(server.id)}
                          className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border border-purple-500/30"
                        >
                          <Zap className="h-3.5 w-3.5 text-purple-400" />
                          <span>Setup Stacks</span>
                        </button>
                        <button
                          onClick={() => onOpenLogs({ id: server.id, name: server.name })}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700/60"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span>View Logs</span>
                        </button>
                      </>
                    )}

                    {server.status === 'pending' && (
                      <button
                        onClick={() => onShowInstallCmd(server.id)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700/60"
                      >
                        <Terminal className="h-3.5 w-3.5 text-blue-400" />
                        <span>Install Agent</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Automated Baseline Stacks & Provisioning Grid */}
                {server.status === 'online' && (
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                        <Boxes className="h-4 w-4 text-purple-400" />
                        <span>Automated Baseline Stacks & Server Provisioning</span>
                      </div>
                      <button
                        onClick={() => onGenerateBaselines(server.id)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center space-x-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Refresh Recommendations</span>
                      </button>
                    </div>

                    {serverProposals.length === 0 ? (
                      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 flex items-center justify-between">
                        <span className="text-xs text-slate-400">All recommended baseline stacks configured or not yet audited.</span>
                        <button
                          onClick={() => onGenerateBaselines(server.id)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium"
                        >
                          Run AI Stacks Audit
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {serverProposals.map((stack) => (
                          <div
                            key={stack.id}
                            className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-white">
                                  {stack.actionType === 'provision.docker'
                                    ? '🐳 Docker & Compose'
                                    : stack.actionType === 'provision.ufw_firewall'
                                    ? '🛡️ UFW Firewall'
                                    : stack.actionType === 'provision.logs_streamer'
                                    ? '📜 Log Streamer'
                                    : stack.actionType === 'provision.cleanup_cron'
                                    ? '🧹 Daily Cleaner'
                                    : stack.actionType === 'provision.nginx'
                                    ? '🌐 NGINX Web Server'
                                    : stack.actionType === 'provision.python'
                                    ? '🐍 Python 3 Runtime'
                                    : stack.actionType === 'provision.nodejs'
                                    ? '⚡ Node.js Runtime'
                                    : stack.parameters?.title || stack.actionType}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                    stack.status === 'approved' || stack.status === 'executed'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : stack.status === 'failed'
                                      ? 'bg-rose-500/10 text-rose-400'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {stack.status.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                {stack.parameters?.description || stack.actionType}
                              </p>
                            </div>

                            {stack.status === 'pending' || stack.status === 'failed' ? (
                              <button
                                onClick={() => onApproveProposal(stack)}
                                className={`w-full py-1.5 text-white rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 shadow-md transition ${
                                  stack.status === 'failed'
                                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                                }`}
                              >
                                {stack.status === 'failed' ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>Retry Install</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Approve & Install</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <div className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Active & Approved</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
