import React, { useState, useEffect } from 'react';
import { api, Server, Incident, ActionProposal } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMode } from '../context/ModeContext';
import { Navbar } from '../components/Navbar';
import { Sidebar, NavSection } from '../components/Sidebar';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { AddServerModal } from '../components/AddServerModal';
import { DeployModal } from '../components/DeployModal';
import { ConfirmActionModal } from '../components/ConfirmActionModal';

// Views
import { BusinessOverview } from './views/BusinessOverview';
import { AiCommandCenter } from './views/AiCommandCenter';
import { InfrastructureView } from './views/InfrastructureView';
import { DockerView } from './views/DockerView';
import { DatabasesView } from './views/DatabasesView';
import { ApplicationsView } from './views/ApplicationsView';
import { DeploymentsView } from './views/DeploymentsView';
import { MonitoringView } from './views/MonitoringView';
import { SecurityView } from './views/SecurityView';
import { AutomationView } from './views/AutomationView';
import { TeamView } from './views/TeamView';
import { CostView } from './views/CostView';
import { BackupsView } from './views/BackupsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

import { Terminal, Copy, Check, FileText } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentOrg } = useAuth();
  const { isBusiness } = useMode();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Core Data
  const [servers, setServers] = useState<Server[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [deployModalServer, setDeployModalServer] = useState<{ id: string; name: string; hostname?: string | null } | null>(null);
  const [selectedServerToken, setSelectedServerToken] = useState<{
    serverId: string;
    installCommand: string;
  } | null>(null);
  const [activeLogsServer, setActiveLogsServer] = useState<{ id: string; name: string } | null>(null);
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [copiedToken, setCopiedToken] = useState(false);

  // Feedback State
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    if (!currentOrg) return;
    try {
      const [serversData, incidentsData, proposalsData, subData, deploysData, auditData, plansData] =
        await Promise.all([
          api.listServers().catch(() => []),
          api.listIncidents().catch(() => []),
          api.listProposals().catch(() => []),
          api.getSubscription().catch(() => null),
          api.listDeployments().catch(() => []),
          api.listAuditLogs(50).catch(() => []),
          api.getPlans().catch(() => []),
        ]);
      setServers(serversData);
      setIncidents(incidentsData);
      setProposals(proposalsData);
      setSubscription(subData);
      setDeployments(deploysData);
      setAuditLogs(auditData);
      setPlans(plansData);
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
  }, [currentOrg]);

  const handleTriggerAi = async (incidentId: string) => {
    setAnalyzingId(incidentId);
    try {
      await api.triggerAiAnalysis(incidentId);
      setActionSuccess('AI Analysis completed and proposal generated!');
      await fetchData();
      setCurrentTab('ai');
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

  const handleGenerateBaselines = async (serverId: string) => {
    try {
      await api.generateBaselineProposals(serverId);
      setActionSuccess('Baseline stacks & security proposals generated!');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate baseline stacks');
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

  const handleShowInstallCmd = async (serverId: string) => {
    try {
      const data = await api.generateEnrollmentToken(serverId);
      setSelectedServerToken({
        serverId,
        installCommand: data.installCommand,
      });
    } catch (err: any) {
      alert('Failed to generate install command');
    }
  };

  const handleOpenLogs = async (server: { id: string; name: string }) => {
    setActiveLogsServer(server);
    try {
      const logs = await api.getServerLogs(server.id);
      setServerLogs((logs as any)?.data || []);
    } catch (err) {
      setServerLogs([]);
    }
  };

  const handleRedeploy = async (dep: any) => {
    try {
      await api.createDeployment({
        serverId: dep.serverId,
        appName: dep.appName,
        repositoryUrl: dep.repositoryUrl,
        branch: dep.branch || 'main',
        deployConfig: dep.deployConfig || {},
      });
      fetchData();
      setActionSuccess(`Redeployment triggered for ${dep.appName}!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Redeploy failed');
    }
  };

  return (
    <div className="flex h-screen bg-[#0b1120] text-slate-100 overflow-hidden font-sans">
      {/* Enterprise Categorized Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        incidentsCount={incidents.filter((i) => i.status !== 'resolved').length}
        pendingProposalsCount={proposals.filter((p) => p.status === 'pending').length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Enterprise Top Navbar */}
        <Navbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onNavigate={(section) => setCurrentTab(section)}
          notificationsCount={incidents.filter((i) => i.status !== 'resolved').length}
        />

        {/* Action Success Toast Feedback */}
        {actionSuccess && (
          <div className="fixed top-20 right-6 z-50 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in slide-in-from-top-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* View Router Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <BusinessOverview
              servers={servers}
              applications={deployments}
              incidents={incidents}
              proposals={proposals}
              subscription={subscription}
              onNavigate={(s) => setCurrentTab(s)}
              onOpenAddServer={() => setIsAddServerOpen(true)}
              onApproveProposal={handleApprove}
            />
          )}

          {currentTab === 'ai' && (
            <AiCommandCenter
              servers={servers}
              applications={deployments}
              incidents={incidents}
              proposals={proposals}
              onApproveProposal={handleApprove}
              onRejectProposal={handleReject}
              onRefreshData={fetchData}
            />
          )}

          {currentTab === 'infrastructure' && (
            <InfrastructureView
              servers={servers}
              proposals={proposals}
              onOpenAddServer={() => setIsAddServerOpen(true)}
              onDeployApp={(srv) => setDeployModalServer(srv)}
              onOpenLogs={handleOpenLogs}
              onShowInstallCmd={handleShowInstallCmd}
              onGenerateBaselines={handleGenerateBaselines}
              onApproveProposal={handleApprove}
            />
          )}

          {currentTab === 'docker' && (
            <DockerView servers={servers} applications={deployments} />
          )}

          {currentTab === 'databases' && (
            <DatabasesView servers={servers} />
          )}

          {currentTab === 'applications' && (
            <ApplicationsView
              applications={deployments}
              servers={servers}
              onOpenDeployModal={(srv) => setDeployModalServer(srv || servers[0] || null)}
              onRedeploy={handleRedeploy}
              onRefresh={fetchData}
            />
          )}

          {currentTab === 'deployments' && (
            <DeploymentsView
              deployments={deployments}
              onRedeploy={handleRedeploy}
              onOpenDeployModal={() => setDeployModalServer(servers[0] || null)}
              onRefresh={fetchData}
            />
          )}

          {currentTab === 'monitoring' && (
            <MonitoringView
              servers={servers}
              incidents={incidents}
              onTriggerAi={handleTriggerAi}
              analyzingId={analyzingId}
            />
          )}

          {currentTab === 'security' && (
            <SecurityView auditLogs={auditLogs} servers={servers} />
          )}

          {currentTab === 'automation' && (
            <AutomationView />
          )}

          {currentTab === 'team' && (
            <TeamView currentOrg={currentOrg} />
          )}

          {currentTab === 'cost' && (
            <CostView
              subscription={subscription}
              plans={plans}
              onUpgradePlan={handleUpgradePlan}
            />
          )}

          {currentTab === 'backups' && (
            <BackupsView />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              servers={servers}
              applications={deployments}
              incidents={incidents}
              deployments={deployments}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView currentOrg={currentOrg} />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(s) => setCurrentTab(s)}
        servers={servers}
        applications={deployments}
        incidents={incidents}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        incidents={incidents}
        deployments={deployments}
        proposals={proposals}
      />

      <AddServerModal
        isOpen={isAddServerOpen}
        onClose={() => setIsAddServerOpen(false)}
        onServerAdded={fetchData}
      />

      {deployModalServer && (
        <DeployModal
          isOpen={!!deployModalServer}
          serverId={deployModalServer.id}
          serverName={deployModalServer.name}
          serverHost={deployModalServer.hostname || '192.168.1.228'}
          onClose={() => setDeployModalServer(null)}
          onDeployed={fetchData}
        />
      )}

      {/* Quick Install View Modal */}
      {selectedServerToken && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative">
            <h3 className="text-base font-bold text-white mb-2">Host Agent Bootstrap Command</h3>
            <p className="text-xs text-slate-400 mb-4">
              Run this single bootstrap command with root/sudo on your Linux VPS. It registers the agent, writes credentials, creates /var/www, and starts the systemd service.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-blue-400 break-all select-all flex items-center justify-between gap-3 mb-4">
              <span>{selectedServerToken.installCommand}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedServerToken.installCommand);
                  setCopiedToken(true);
                  setTimeout(() => setCopiedToken(false), 2000);
                }}
                className="shrink-0 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              >
                {copiedToken ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedServerToken(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Logs Modal */}
      {activeLogsServer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Live Logs: {activeLogsServer.name}</h3>
              </div>
              <button
                onClick={() => setActiveLogsServer(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto space-y-1">
              {serverLogs.length === 0 ? (
                <div className="text-slate-500">No logs captured yet from this server.</div>
              ) : (
                serverLogs.map((log: any, idx: number) => (
                  <div key={idx} className="flex space-x-2">
                    <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-blue-400">[{log.source}]</span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
