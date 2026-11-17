import React, { useState } from 'react';
import {
  AppWindow,
  Rocket,
  Globe,
  Folder,
  CheckCircle2,
  RefreshCw,
  FileText,
  Plus,
  Play,
  Square,
  AlertTriangle,
  Server,
  Trash2,
  Edit3,
  GitBranch,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  Key,
} from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  applications: any[];
  servers: any[];
  onOpenDeployModal: (server?: { id: string; name: string }) => void;
  onRedeploy: (dep: any) => void;
  onRefresh?: () => void;
}

export const ApplicationsView: React.FC<Props> = ({
  applications,
  servers,
  onOpenDeployModal,
  onRedeploy,
  onRefresh,
}) => {
  const [activeLogsApp, setActiveLogsApp] = useState<any | null>(null);

  // Edit State
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [editAppName, setEditAppName] = useState('');
  const [editRepoUrl, setEditRepoUrl] = useState('');
  const [editGitToken, setEditGitToken] = useState('');
  const [editBranch, setEditBranch] = useState('main');
  const [editEnvironment, setEditEnvironment] = useState('production');
  const [autoRedeploy, setAutoRedeploy] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deletingApp, setDeletingApp] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const startEdit = (app: any) => {
    setEditingApp(app);
    setEditAppName(app.appName);
    setEditRepoUrl(app.repositoryUrl || '');
    setEditGitToken('');
    setEditBranch(app.branch || 'main');
    setEditEnvironment(app.environment || 'production');
    setAutoRedeploy(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    setSavingEdit(true);

    let finalRepoUrl = editRepoUrl.trim();
    if (editGitToken.trim() && finalRepoUrl.startsWith('https://') && !finalRepoUrl.includes('@')) {
      finalRepoUrl = finalRepoUrl.replace('https://', `https://${editGitToken.trim()}@`);
    }

    try {
      await api.updateDeployment(editingApp.id, {
        appName: editAppName.trim(),
        repositoryUrl: finalRepoUrl,
        branch: editBranch.trim(),
        environment: editEnvironment,
      });

      if (autoRedeploy) {
        await api.redeployDeployment(editingApp.id);
        setActionNotice(`Application '${editAppName}' updated and redeployment triggered!`);
      } else {
        setActionNotice(`Application '${editAppName}' settings saved.`);
      }

      setEditingApp(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update application');
    } finally {
      setSavingEdit(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleDelete = async () => {
    if (!deletingApp) return;
    setIsDeleting(true);
    try {
      await api.deleteDeployment(deletingApp.id);
      setActionNotice(`Application '${deletingApp.appName}' deleted and files cleaned.`);
      setDeletingApp(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete application');
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

      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400">
            <AppWindow className="h-4 w-4" />
            <span>Company Web Applications & Stacks</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Application Catalog</h1>
          <p className="text-xs text-slate-400 mt-1">
            Production apps deployed from Git repositories and Docker Compose configurations.
          </p>
        </div>

        <button
          onClick={() => onOpenDeployModal(servers[0])}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Deploy New Application</span>
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-16 text-center shadow-xl">
          <AppWindow className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No applications deployed yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Deploy your code from GitHub or a Docker configuration straight to your connected servers.
          </p>
          <button
            onClick={() => onOpenDeployModal(servers[0])}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
          >
            Deploy First Application
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {applications.map((app) => {
            const cleanPath = `/var/www/${app.appName.toLowerCase().replace(/\s+/g, '-')}`;

            return (
              <div
                key={app.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700/80 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                        <Rocket className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">{app.appName}</h3>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5">
                          <Server className="h-3 w-3 text-slate-500" />
                          <span>{app.server?.name || 'Production Host'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          app.status === 'running' || app.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : app.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                        }`}
                      >
                        {app.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {app.repositoryUrl && (
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono text-blue-400 flex items-center space-x-2 truncate">
                      <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{app.repositoryUrl}</span>
                      <span className="text-slate-500 shrink-0">({app.branch || 'main'})</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-slate-500">Live Web Root:</span>
                    <span className="text-emerald-400 font-semibold">/var/www/html/</span>
                    <span className="text-slate-500 text-[11px] truncate">({cleanPath})</span>
                  </div>

                  {/* Live Web Link (Port 80 / Nginx) */}
                  {(() => {
                    const host = app.server?.hostname || '192.168.1.228';
                    const p = app.deployConfig?.port;
                    const liveUrl = p && p !== 80 && p !== 443 ? `http://${host}:${p}/` : `http://${host}/`;

                    return (
                      <div className="flex items-center justify-between p-2.5 bg-emerald-950/30 rounded-xl border border-emerald-500/20 text-xs">
                        <div className="flex items-center space-x-2 truncate">
                          <Globe className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="text-slate-400 font-mono text-[11px]">Web URL:</span>
                          <a
                            href={liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-emerald-400 hover:underline font-bold truncate"
                          >
                            {liveUrl}
                          </a>
                        </div>
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-semibold flex items-center space-x-1 shrink-0 transition"
                        >
                          <span>Open Web</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    );
                  })()}

                  <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                    <span>Commit: {app.commitSha || 'latest'}</span>
                    <span>Env: {app.environment || 'production'}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveLogsApp(app)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center space-x-1.5 border border-slate-700/60 transition"
                      title="View deployment logs"
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      <span>Logs</span>
                    </button>

                    <button
                      onClick={() => startEdit(app)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center space-x-1.5 border border-slate-700/60 transition"
                      title="Edit repo, branch or name"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-blue-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setDeletingApp(app)}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-medium flex items-center space-x-1 border border-rose-500/20 transition"
                      title="Delete application from server"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRedeploy(app)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center space-x-1.5 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Redeploy</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Application / Change GitHub Modal */}
      {editingApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Edit3 className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Edit Application & GitHub Repo</h3>
              </div>
              <button
                onClick={() => setEditingApp(null)}
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
                  placeholder="e.g. My Website"
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
                    placeholder="https://github.com/user/repository.git"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>GitHub Token (Optional - Only for Private Repos)</span>
                  <span className="text-[10px] text-amber-400">Leave blank if Public</span>
                </label>
                <div className="relative">
                  <Key className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={editGitToken}
                    onChange={(e) => setEditGitToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                      placeholder="main"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Environment
                  </label>
                  <select
                    value={editEnvironment}
                    onChange={(e) => setEditEnvironment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRedeploy"
                  checked={autoRedeploy}
                  onChange={(e) => setAutoRedeploy(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="autoRedeploy" className="text-xs text-slate-300 cursor-pointer select-none">
                  Trigger immediate redeploy on server after saving
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
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

      {/* Delete Application Confirmation Modal */}
      {deletingApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111827] border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Application?</h3>
                <p className="text-xs text-slate-400">This action will remove the app from the server.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
              <p>Application: <strong className="text-white">{deletingApp.appName}</strong></p>
              <p>Server: <strong className="text-white">{deletingApp.server?.name || 'Host'}</strong></p>
              <p className="text-rose-400/90 text-[11px] pt-1">
                ⚠️ Files in <code className="bg-slate-900 px-1 py-0.5 rounded">/var/www/{deletingApp.appName.toLowerCase().replace(/\s+/g, '-')}</code> will be permanently removed.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingApp(null)}
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
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Logs Modal */}
      {activeLogsApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Application Logs: {activeLogsApp.appName}</h3>
              </div>
              <button
                onClick={() => setActiveLogsApp(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap">
              {activeLogsApp.logs || 'No build logs captured for this application yet.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
