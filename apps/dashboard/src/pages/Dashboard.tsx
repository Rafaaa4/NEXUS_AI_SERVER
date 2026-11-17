import React, { useState, useEffect } from 'react';
import { api, Server, Incident, ActionProposal } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { AddServerModal } from '../components/AddServerModal';
import { DeployModal } from '../components/DeployModal';
import {
  Server as ServerIcon,
  Plus,
  Activity,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Terminal,
  Sparkles,
  Check,
  X,
  HardDrive,
  CreditCard,
  FileText,
  Shield,
  Layers,
  Rocket,
  Globe,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentOrg } = useAuth();
  const [tab, setTab] = useState<'servers' | 'incidents' | 'approvals' | 'deployments' | 'audit' | 'billing'>('servers');
  const [servers, setServers] = useState<Server[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [deployModalServer, setDeployModalServer] = useState<{ id: string; name: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedServerToken, setSelectedServerToken] = useState<{
    serverId: string;
    installCommand: string;
  } | null>(null);
  const [activeLogsServer, setActiveLogsServer] = useState<{ id: string; name: string } | null>(null);
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    if (!currentOrg) return;
    try {
      const [serversData, incidentsData, proposalsData, subData, deploysData] = await Promise.all([
        api.listServers().catch(() => []),
        api.listIncidents().catch(() => []),
        api.listProposals().catch(() => []),
        api.getSubscription().catch(() => null),
        api.listDeployments().catch(() => []),
      ]);
      setServers(serversData);
      setIncidents(incidentsData);
      setProposals(proposalsData);
      setSubscription(subData);
      setDeployments(deploysData);

      if (tab === 'audit') {
        const logs = await api.listAuditLogs().catch(() => []);
        setAuditLogs(logs);
      }
      if (tab === 'billing') {
        const availablePlans = await api.getPlans().catch(() => []);
        setPlans(availablePlans);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [currentOrg, tab]);

  const handleTriggerAi = async (incidentId: string) => {
    setAnalyzingId(incidentId);
    try {
      await api.triggerAiAnalysis(incidentId);
      setActionSuccess('AI Analysis completed and proposal generated!');
      await fetchData();
      setTab('approvals');
    } catch (err: any) {
      alert(err.message || 'AI Analysis failed');
    } finally {
      setAnalyzingId(null);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleApprove = async (proposal: ActionProposal) => {
    try {
      await api.approveProposal(proposal.id, proposal.proposalHash);
      setActionSuccess(`Proposal approved! Job dispatched to server agent.`);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      await api.rejectProposal(proposalId);
      setActionSuccess('Proposal rejected.');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleUpgradePlan = async (targetPlan: string) => {
    try {
      await api.subscribe(targetPlan);
      setActionSuccess(`Plan upgraded to ${targetPlan.toUpperCase()} successfully!`);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to change plan');
    } finally {
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleOpenLogs = async (server: Server) => {
    setActiveLogsServer({ id: server.id, name: server.name });
    try {
      const logs = await api.getServerLogs(server.id);
      setServerLogs(logs);
    } catch {
      setServerLogs([]);
    }
  };

  const handleShowInstallCmd = async (serverId: string) => {
    try {
      const enrollment = await api.generateEnrollmentToken(serverId);
      setSelectedServerToken({
        serverId,
        installCommand: enrollment.installCommand,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to generate token');
    }
  };

  const onlineCount = servers.filter((s) => s.status === 'online').length;
  const pendingApprovalsCount = proposals.filter((p) => p.status === 'pending').length;
  const openIncidentsCount = incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">NEXUS AI Control Plane</h1>
            <p className="text-sm text-slate-400 mt-1">
              Linux nodes and autonomous AI remediation for{' '}
              <span className="text-blue-400 font-medium">{currentOrg?.name}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-blue-600/20"
            >
              <Plus className="h-4 w-4" />
              <span>Connect VPS</span>
            </button>
          </div>
        </div>

        {/* Global Success Notification */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center space-x-2 shadow-lg animate-fadeIn">
            <Check className="h-4 w-4" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setTab('servers')}
            className={`cursor-pointer rounded-2xl p-5 border transition ${
              tab === 'servers'
                ? 'bg-slate-900 border-blue-500/50 shadow-lg shadow-blue-500/10'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Servers</span>
              <ServerIcon className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-white">
              {servers.length}
              {subscription && (
                <span className="text-sm font-normal text-slate-500 ml-1.5">
                  / {subscription.usage.serverLimit}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">{onlineCount} online / monitoring</div>
          </div>

          <div
            onClick={() => setTab('servers')}
            className="cursor-pointer bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Online Agents</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-emerald-400">{onlineCount}</div>
            <div className="text-xs text-slate-500 mt-1">Live telemetry streaming</div>
          </div>

          <div
            onClick={() => setTab('incidents')}
            className={`cursor-pointer rounded-2xl p-5 border transition ${
              tab === 'incidents'
                ? 'bg-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Incidents</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className={`mt-3 text-3xl font-bold ${openIncidentsCount > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {openIncidentsCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Anomalies detected</div>
          </div>

          <div
            onClick={() => setTab('approvals')}
            className={`cursor-pointer rounded-2xl p-5 border transition ${
              tab === 'approvals'
                ? 'bg-slate-900 border-purple-500/50 shadow-lg shadow-purple-500/10'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
              <ShieldCheck className="h-4 w-4 text-purple-400" />
            </div>
            <div className={`mt-3 text-3xl font-bold ${pendingApprovalsCount > 0 ? 'text-purple-400' : 'text-slate-200'}`}>
              {pendingApprovalsCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Human-in-the-loop safety</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-1">
          <button
            onClick={() => setTab('servers')}
            className={`px-4 py-2 font-medium text-sm rounded-lg transition ${
              tab === 'servers'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Servers Inventory ({servers.length})
          </button>
          <button
            onClick={() => setTab('incidents')}
            className={`px-4 py-2 font-medium text-sm rounded-lg transition flex items-center space-x-2 ${
              tab === 'incidents'
                ? 'bg-amber-600/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Incidents Timeline</span>
            {openIncidentsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-slate-950 font-bold">
                {openIncidentsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('approvals')}
            className={`px-4 py-2 font-medium text-sm rounded-lg transition flex items-center space-x-2 ${
              tab === 'approvals'
                ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>AI Action Proposals</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500 text-white font-bold">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('deployments')}
            className={`px-4 py-2 font-medium text-sm rounded-lg transition flex items-center space-x-2 ${
              tab === 'deployments'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Rocket className="h-4 w-4" />
            <span>Deployments ({deployments.length})</span>
          </button>
          <button
            onClick={() => setTab('billing')}
            className={`px-4 py-2 font-medium text-sm rounded-lg transition flex items-center space-x-2 ${
              tab === 'billing'
                ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Billing & Quotas</span>
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`px-4 py-2 font-medium text-sm rounded-lg transition flex items-center space-x-2 ${
              tab === 'audit'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Security Audit Log</span>
          </button>
        </div>

        {/* TAB 1: SERVERS */}
        {tab === 'servers' && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading server nodes...</div>
            ) : servers.length === 0 ? (
              <div className="p-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <ServerIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">No servers connected yet</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
                  Connect your first Linux VPS to start monitoring metrics and receiving AI recommendations.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-blue-600/20 inline-flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Connect your first VPS</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {servers.map((server) => (
                  <div
                    key={server.id}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20 transition"
                  >
                    <div className="flex items-start space-x-4">
                      <div
                        className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                          server.status === 'online'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        <HardDrive className="h-5 w-5" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-3">
                          <span className="font-semibold text-white text-base">{server.name}</span>
                          {server.status === 'online' ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>Online</span>
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
                          <span>{server.provider}</span>
                          <span>•</span>
                          <span>{server.osName || 'Linux'} ({server.architecture || 'amd64'})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {server.status === 'online' && (
                        <button
                          onClick={() => handleOpenLogs(server)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700/60"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span>View Logs</span>
                        </button>
                      )}

                      {server.status === 'pending' && (
                        <button
                          onClick={() => handleShowInstallCmd(server.id)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700/60"
                        >
                          <Terminal className="h-3.5 w-3.5 text-blue-400" />
                          <span>Install Agent</span>
                        </button>
                      )}

                      <div className="text-right text-xs text-slate-500 hidden sm:block">
                        {server.agent?.lastSeenAt ? (
                          <div>Last seen: {new Date(server.agent.lastSeenAt).toLocaleTimeString()}</div>
                        ) : (
                          <div>Created: {new Date(server.createdAt).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INCIDENTS */}
        {tab === 'incidents' && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            {incidents.length === 0 ? (
              <div className="p-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white">No incidents detected</h3>
                <p className="text-sm text-slate-400 mt-1">All monitored servers are running within normal parameters.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {incidents.map((incident) => (
                  <div key={incident.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            incident.severity === 'critical'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {incident.severity}
                        </span>
                        <span className="font-semibold text-white text-base">{incident.title}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            incident.status === 'resolved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {incident.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">{incident.description}</p>
                      <div className="text-xs text-slate-500 mt-1">
                        Detected: {new Date(incident.detectedAt).toLocaleString()}
                      </div>
                    </div>

                    <div>
                      {incident.status !== 'resolved' && (
                        <button
                          onClick={() => handleTriggerAi(incident.id)}
                          disabled={analyzingId === incident.id}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-purple-600/20 flex items-center space-x-2 disabled:opacity-50"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>{analyzingId === incident.id ? 'Analyzing...' : 'Diagnose with AI'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROPOSALS & APPROVALS */}
        {tab === 'approvals' && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            {proposals.length === 0 ? (
              <div className="p-16 text-center">
                <ShieldCheck className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white">No action proposals</h3>
                <p className="text-sm text-slate-400 mt-1">Proposals generated by the AI assistant will appear here for review.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {proposals.map((prop) => (
                  <div key={prop.id} className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {prop.actionType}
                        </span>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-medium">
                          Risk: {prop.riskLevel.toUpperCase()}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            prop.status === 'approved' || prop.status === 'executed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : prop.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {prop.status.toUpperCase()}
                        </span>
                      </div>

                      {prop.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleReject(prop.id)}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-rose-900/30 text-slate-300 hover:text-rose-300 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleApprove(prop)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-emerald-600/20 flex items-center space-x-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve & Execute</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {prop.analysis?.rootCause && (
                      <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="font-semibold text-purple-400">AI Finding:</span> {prop.analysis.rootCause}
                      </div>
                    )}

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-400 space-y-1">
                      <div>
                        <span className="text-slate-500">Parameters:</span>{' '}
                        <span className="text-slate-200">{JSON.stringify(prop.parameters)}</span>
                      </div>
                      <div className="break-all text-[11px]">
                        <span className="text-slate-500">Cryptographic Hash (SHA-256):</span>{' '}
                        <span className="text-blue-400">{prop.proposalHash}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BILLING & PLANS */}
        {tab === 'billing' && (
          <div className="space-y-6">
            {subscription && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Active Subscription</span>
                    <h2 className="text-2xl font-bold text-white mt-1">{subscription.planDetails.name}</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Connected Nodes: <span className="font-semibold text-white">{subscription.usage.serverCount}</span> /{' '}
                      {subscription.usage.serverLimit} maximum
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-white">${subscription.planDetails.price}<span className="text-sm font-normal text-slate-400">/mo</span></div>
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active Plan</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-5 w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (subscription.usage.serverCount / subscription.usage.serverLimit) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  tier: 'free',
                  name: 'Starter',
                  price: 0,
                  limit: 2,
                  features: ['Up to 2 VPS nodes', 'Live metrics monitoring', 'Automated anomaly detection', '50 AI queries/mo'],
                },
                {
                  tier: 'pro',
                  name: 'Professional DevOps',
                  price: 29,
                  limit: 10,
                  popular: true,
                  features: ['Up to 10 VPS nodes', '1-Click approval execution', '14 days log retention', '500 AI queries/mo', 'Priority support'],
                },
                {
                  tier: 'enterprise',
                  name: 'Enterprise Fleet',
                  price: 199,
                  limit: 100,
                  features: ['Up to 100 VPS nodes', 'Full security audit trail', 'Unlimited AI diagnoses', 'Dedicated account manager'],
                },
              ].map((p) => {
                const isCurrent = subscription?.subscription.plan === p.tier;
                return (
                  <div
                    key={p.tier}
                    className={`bg-slate-900/60 rounded-2xl p-6 border flex flex-col justify-between ${
                      p.popular ? 'border-blue-500/60 shadow-xl shadow-blue-500/10' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      {p.popular && (
                        <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded mb-2 inline-block">
                          MOST POPULAR
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-white">{p.name}</h3>
                      <div className="mt-3 text-3xl font-extrabold text-white">
                        ${p.price}
                        <span className="text-sm font-normal text-slate-400">/mo</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Up to {p.limit} Linux servers</p>

                      <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                        {p.features.map((f, i) => (
                          <li key={i} className="flex items-center space-x-2">
                            <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold cursor-default"
                        >
                          Current Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpgradePlan(p.tier)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20"
                        >
                          Switch to {p.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL */}
        {tab === 'audit' && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <h2 className="font-semibold text-slate-200 text-base">Immutable Security Audit Trail</h2>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-mono">
                Tamper-Evident Database Log
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-16 text-center text-slate-400">No audit events recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between gap-4 font-mono text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                        {log.action}
                      </span>
                      <span className="text-slate-300">
                        {log.actor?.email || 'System Daemon'}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        [{log.resourceType}: {log.resourceId?.slice(0, 8)}...]
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: View Redacted Server Logs */}
      {activeLogsServer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Live Logs: {activeLogsServer.name}</h3>
                <p className="text-xs text-slate-400">All sensitive tokens, private keys, and passwords are redacted.</p>
              </div>
              <button
                onClick={() => setActiveLogsServer(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5">
              {serverLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-8">No logs reported yet.</div>
              ) : (
                serverLogs.map((log, idx) => (
                  <div key={idx} className="flex space-x-2">
                    <span className="text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span
                      className={`font-bold shrink-0 ${
                        log.level === 'error' ? 'text-rose-400' : 'text-blue-400'
                      }`}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-slate-400 shrink-0">[{log.source}]</span>
                    <span className="text-slate-200 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActiveLogsServer(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Add New Server */}
      <AddServerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onServerAdded={fetchData}
      />

      {/* Quick Install View Modal */}
      {selectedServerToken && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">Install NEXUS Agent</h3>
            <p className="text-sm text-slate-400 mb-4">Run this command on your VPS:</p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-blue-300 break-all select-all mb-4">
              {selectedServerToken.installCommand}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedServerToken(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
