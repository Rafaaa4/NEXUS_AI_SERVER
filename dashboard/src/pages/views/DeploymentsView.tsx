import React, { useState } from 'react';
import {
  Rocket,
  Globe,
  Folder,
  RefreshCw,
  GitBranch,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Activity,
  CheckCircle2,
  Trash2,
  Edit3,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  deployments: any[];
  onRedeploy: (dep: any) => void;
  onOpenDeployModal: () => void;
  onRefresh?: () => void;
}

export const DeploymentsView: React.FC<Props> = ({
  deployments,
  onRedeploy,
  onOpenDeployModal,
  onRefresh,
}) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const webhookUrl = `${window.location.origin.replace(':5173', ':4000')}/api/v1/deployments/webhook`;

  // Edit / Delete states
  const [editingDep, setEditingDep] = useState<any | null>(null);
  const [editAppName, setEditAppName] = useState('');
  const [editRepoUrl, setEditRepoUrl] = useState('');
  const [editBranch, setEditBranch] = useState('main');
  const [autoRedeploy, setAutoRedeploy] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingDep, setDeletingDep] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const handleRollback = async (dep: any) => {
    setRollingBackId(dep.id);
    try {
      await api.rollbackDeployment(dep.id);
      setActionNotice(`Rollback triggered for '${dep.appName}' to previous release.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Rollback failed');
    } finally {
      setRollingBackId(null);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const startEdit = (dep: any) => {
    setEditingDep(dep);
    setEditAppName(dep.appName);
    setEditRepoUrl(dep.repositoryUrl || '');
    setEditBranch(dep.branch || 'main');
    setAutoRedeploy(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDep) return;
    setSavingEdit(true);
    try {
      await api.updateDeployment(editingDep.id, {
        appName: editAppName.trim(),
        repositoryUrl: editRepoUrl.trim(),
        branch: editBranch.trim(),
      });

      if (autoRedeploy) {
        await api.redeployDeployment(editingDep.id);
        setActionNotice(`Deployment for '${editAppName}' updated & redeployed!`);
      } else {
        setActionNotice(`Deployment '${editAppName}' settings saved.`);
      }

      setEditingDep(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update deployment');
    } finally {
      setSavingEdit(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleDelete = async () => {
    if (!deletingDep) return;
    setIsDeleting(true);
    try {
      await api.deleteDeployment(deletingDep.id);
      setActionNotice(`Deployment '${deletingDep.appName}' deleted & server files purged.`);
      setDeletingDep(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete deployment');
    } finally {
      setIsDeleting(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <Rocket className="h-4 w-4" />
            <span>Continuous Deployment & Git Pipelines</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Application Deployments & CI/CD</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated deployment history, shallow git commits, and webhook automation for main branch pushes.
          </p>
        </div>

        <button
          onClick={onOpenDeployModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition shrink-0"
        >
          <Rocket className="h-4 w-4" />
          <span>New Deployment</span>
        </button>
      </div>

      {/* GitHub Auto-Deploy Webhook Card */}
      <div className="bg-gradient-to-r from-blue-900/20 via-slate-900 to-purple-900/20 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <GitBranch className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Automate Continuous Deployment (GitHub Webhook)</h3>
              <p className="text-xs text-slate-400">
                Paste this Webhook URL in your GitHub repo settings to trigger auto-deployment whenever you push to main.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyWebhook}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 shrink-0 transition"
          >
            {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedWebhook ? 'Copied to Clipboard!' : 'Copy Webhook URL'}</span>
          </button>
        </div>

        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-blue-400 truncate">
          {webhookUrl}
        </div>
      </div>

      {/* Deployments List */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="font-semibold text-slate-200 text-sm">Deployment Activity Log</h2>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-mono">
            {deployments.length} Releases
          </span>
        </div>

        {deployments.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            <Rocket className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            No deployments recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {deployments.map((dep) => {
              const cleanAppName = dep.appName.toLowerCase().replace(/\s+/g, '-');
              const targetHost = dep.serverHost || dep.server?.hostname || '127.0.0.1';
              const webUrl = `http://${targetHost}/`;

              return (
                <div key={dep.id} className="p-6 space-y-3 hover:bg-slate-800/20 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-white text-base">{dep.appName}</span>
                      <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {dep.server?.name || 'Server'} ({targetHost})
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          dep.status === 'active' || dep.status === 'completed' || dep.status === 'running'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : dep.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                        }`}
                      >
                        {dep.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-slate-500 font-mono pr-2 hidden md:block">
                        Commit: {dep.commitSha} • {new Date(dep.createdAt).toLocaleString()}
                      </div>

                      <a
                        href={webUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                        title="Open deployed website in browser"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open Website</span>
                      </a>

                      <button
                        onClick={() => handleRollback(dep)}
                        disabled={rollingBackId === dep.id}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-medium flex items-center space-x-1 border border-slate-700 transition disabled:opacity-50"
                        title="Rollback to previous release"
                      >
                        <RotateCcw className={`h-3 w-3 ${rollingBackId === dep.id ? 'animate-spin' : ''}`} />
                        <span>Rollback</span>
                      </button>

                      <button
                        onClick={() => startEdit(dep)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                        title="Edit repo & branch"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-blue-400" />
                      </button>

                      <button
                        onClick={() => setDeletingDep(dep)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium border border-rose-500/20 transition"
                        title="Delete deployment & files"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => onRedeploy(dep)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow-sm transition"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Redeploy</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {dep.repositoryUrl && (
                      <div className="text-blue-400 font-mono flex items-center space-x-1.5">
                        <Globe className="h-3.5 w-3.5 text-slate-500" />
                        <span>{dep.repositoryUrl}</span>
                        <span className="text-slate-500">({dep.branch || 'main'})</span>
                      </div>
                    )}

                    <div className="text-slate-300 font-mono flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                      <Folder className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-slate-400">Release:</span>
                      <span className="text-emerald-400 font-semibold">/var/www/nexus/deployments/{cleanAppName}/current</span>
                    </div>

                    <div className="text-slate-300 font-mono flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                      <Folder className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-slate-400">Nginx Root:</span>
                      <span className="text-cyan-400 font-semibold">/var/www/html/</span>
                    </div>
                  </div>

                  {dep.logs && (
                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 font-mono text-[11px] text-slate-300 max-h-44 overflow-y-auto whitespace-pre-wrap">
                      {dep.logs}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingDep && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Edit3 className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Edit Deployment Configuration</h3>
              </div>
              <button
                onClick={() => setEditingDep(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  required
                  value={editAppName}
                  onChange={(e) => setEditAppName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  GitHub Repository URL
                </label>
                <div className="relative">
                  <Globe className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="url"
                    required
                    value={editRepoUrl}
                    onChange={(e) => setEditRepoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Branch
                </label>
                <div className="relative">
                  <GitBranch className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={editBranch}
                    onChange={(e) => setEditBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRedeployDep"
                  checked={autoRedeploy}
                  onChange={(e) => setAutoRedeploy(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="autoRedeployDep" className="text-xs text-slate-300 cursor-pointer select-none">
                  Trigger immediate redeploy on server after saving
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingDep(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 flex items-center space-x-1.5 transition"
                >
                  {savingEdit && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{autoRedeploy ? 'Save & Redeploy' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingDep && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111827] border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Deployment?</h3>
                <p className="text-xs text-slate-400">This will remove the release record and purge host files.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
              <p>Application: <strong className="text-white">{deletingDep.appName}</strong></p>
              <p>Server: <strong className="text-white">{deletingDep.server?.name || 'Host'}</strong></p>
              <p className="text-rose-400/90 text-[11px] pt-1">
                ⚠️ Files in <code className="bg-slate-900 px-1 py-0.5 rounded">/var/www/{deletingDep.appName.toLowerCase().replace(/\s+/g, '-')}</code> will be permanently removed.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDep(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/25 flex items-center space-x-1.5 transition"
              >
                {isDeleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Release</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
