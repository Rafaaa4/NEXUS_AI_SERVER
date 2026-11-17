import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Copy, Check, Terminal, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onServerAdded: () => void;
}

export const AddServerModal: React.FC<Props> = ({ isOpen, onClose, onServerAdded }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('hetzner');
  const [loading, setLoading] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    token: string;
    installCommand: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const server = await api.createServer({ name, provider });
      const enrollment = await api.generateEnrollmentToken(server.id);
      setEnrollmentData(enrollment);
      onServerAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (enrollmentData) {
      navigator.clipboard.writeText(enrollmentData.installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        {!enrollmentData ? (
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Connect New Linux VPS</h3>
            <p className="text-sm text-slate-400 mb-6">
              Connect any VPS running Ubuntu or Debian without sharing your root SSH credentials.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. production-vps-01"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Hosting Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="hetzner">Hetzner Cloud</option>
                  <option value="digitalocean">DigitalOcean</option>
                  <option value="ovh">OVHcloud</option>
                  <option value="aws">AWS EC2</option>
                  <option value="linode">Linode / Akamai</option>
                  <option value="custom">Other / Custom VPS</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 mb-2">
              <Terminal className="h-5 w-5" />
              <h3 className="text-xl font-bold text-white">Install NEXUS Agent</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Run this single command on your Linux VPS via SSH. The agent will enroll automatically and stream real-time metrics.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4 relative font-mono text-xs text-blue-300 break-all select-all">
              {enrollmentData.installCommand}
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                title="Copy command"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-start space-x-2 text-xs text-amber-400/90 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 mb-6">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This enrollment token is valid for 15 minutes and can only be used once. Never share this token publicly.
              </span>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
