import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Rocket, Terminal, CheckCircle2, GitBranch, Globe, Box, ExternalLink, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  serverId: string;
  serverName: string;
  serverHost?: string;
  onClose: () => void;
  onDeployed: () => void;
}

export const DeployModal: React.FC<Props> = ({
  isOpen,
  serverId,
  serverName,
  serverHost = '192.168.1.228',
  onClose,
  onDeployed,
}) => {
  const [appName, setAppName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [framework, setFramework] = useState('react');
  const [port, setPort] = useState('80');
  const [bindNginx, setBindNginx] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFrameworkChange = (val: string) => {
    setFramework(val);
    if (val === 'react') setPort('80');
    else if (val === 'node') setPort('3000');
    else if (val === 'python') setPort('8000');
    else if (val === 'docker') setPort('80');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) return;

    setLoading(true);
    setError(null);

    const parsedPort = parseInt(port, 10) || 80;

    try {
      const res = await api.createDeployment({
        serverId,
        appName,
        repositoryUrl: repoUrl || undefined,
        branch,
        deployConfig: {
          framework,
          port: parsedPort,
          bindNginx,
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

  const liveUrl = `http://${serverHost}${port && port !== '80' && port !== '443' ? ':' + port : ''}/`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative">
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
              <h3 className="text-xl font-bold text-white">Deploy Web Project to {serverName}</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Deploy your Git repository, Python/FastAPI app, Node.js stack, or HTML site with automatic NGINX web routing.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
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
                  placeholder="e.g. my-website or nexus-web"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Git Repository URL (GitHub / GitLab / Public or Private)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="url"
                    placeholder="https://github.com/my-username/my-project.git"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
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
                    onChange={(e) => handleFrameworkChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs"
                  >
                    <option value="react">Static Web / HTML (Port 80)</option>
                    <option value="python">Python / FastAPI / Flask</option>
                    <option value="node">Node.js / Express / Next</option>
                    <option value="docker">Docker Compose Stack</option>
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

              {/* NGINX Routing Option */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="bindNginxCheckbox"
                  checked={bindNginx}
                  onChange={(e) => setBindNginx(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="bindNginxCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
                  <span className="font-semibold text-white">Route through NGINX Web Server:</span> Automatically bind to Port 80 so it opens directly at <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded font-mono">http://{serverHost}/</code>
                </label>
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
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
              <h3 className="text-xl font-bold text-white">Deployment Dispatched!</h3>
            </div>
            <p className="text-xs text-slate-400">
              The NEXUS Agent on <strong>{serverName}</strong> has received the deployment job and is building containers & configuring NGINX.
            </p>

            {/* Live Web Link */}
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <Globe className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[11px] text-slate-400">Direct Web Address:</div>
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-emerald-400 hover:underline font-bold text-sm"
                  >
                    {liveUrl}
                  </a>
                </div>
              </div>

              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 shrink-0 transition"
              >
                <span>Open Live Website</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-56 overflow-y-auto space-y-1">
              <div className="text-emerald-400 font-bold">=== DEPLOYMENT IN PROGRESS ===</div>
              <div>App: {deploymentResult.appName}</div>
              <div>Commit SHA: {deploymentResult.commitSha}</div>
              <div>Target Server: {serverName} ({serverHost})</div>
              <div className="text-slate-400 mt-2">{deploymentResult.logs}</div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25"
              >
                Done & View in Catalog
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
