import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Rocket, Terminal, CheckCircle2, GitBranch, Globe, Box } from 'lucide-react';

interface Props {
  isOpen: boolean;
  serverId: string;
  serverName: string;
  onClose: () => void;
  onDeployed: () => void;
}

export const DeployModal: React.FC<Props> = ({
  isOpen,
  serverId,
  serverName,
  onClose,
  onDeployed,
}) => {
  const [appName, setAppName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [framework, setFramework] = useState('docker');
  const [port, setPort] = useState('3000');
  const [loading, setLoading] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.createDeployment({
        serverId,
        appName,
        repositoryUrl: repoUrl || undefined,
        branch,
        deployConfig: {
          framework,
          port: parseInt(port, 10) || 3000,
        },
      });

      setDeploymentResult(res.deployment);
      onDeployed();
    } catch (err: any) {
      setError(err.message || 'Deployment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {!deploymentResult ? (
          <div>
            <div className="flex items-center space-x-2 text-blue-400 mb-2">
              <Rocket className="h-5 w-5" />
              <h3 className="text-xl font-bold text-white">Deploy Project to {serverName}</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Deploy your Git repository, Docker Compose stack, or application code directly onto your Linux VPS.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. backend-api or web-app"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Git Repository URL (Optional / Public or Private)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="url"
                    placeholder="https://github.com/my-username/my-project"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Branch
                  </label>
                  <div className="relative">
                    <GitBranch className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Framework / Type
                  </label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs"
                  >
                    <option value="docker">Docker Compose</option>
                    <option value="node">Node.js / Express</option>
                    <option value="react">React / Static</option>
                    <option value="python">Python / FastAPI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Exposed Port
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/30 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Rocket className="h-4 w-4" />
                  <span>{loading ? 'Dispatching...' : 'Deploy to Server'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-xl font-bold text-white">Deployment Dispatched!</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              The NEXUS Agent on <strong>{serverName}</strong> has received the deployment job and is building containers.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-64 overflow-y-auto space-y-1 mb-5">
              <div className="text-emerald-400 font-bold">=== DEPLOYMENT IN PROGRESS ===</div>
              <div>App: {deploymentResult.appName}</div>
              <div>Commit SHA: {deploymentResult.commitSha}</div>
              <div>Environment: {deploymentResult.environment}</div>
              <div className="text-slate-400 mt-2">{deploymentResult.logs}</div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                Close & View on Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
