import React, { useState } from 'react';
import { X, UserPlus, Shield, Mail } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onMemberInvited: () => void;
}

export const InviteMemberModal: React.FC<Props> = ({
  isOpen,
  onClose,
  orgId,
  onMemberInvited,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await api.addMember(orgId, email.trim(), role);
      onMemberInvited();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add member to organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Invite Team Member</h3>
            <p className="text-xs text-slate-400">Grant role-based access to company infrastructure</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Employee Email Address
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Role & Permissions
            </label>
            <select
              value={role}
              onChange={(e: any) => setRole(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="operator">Operator (Deploy apps, approve baseline stacks, manage services)</option>
              <option value="admin">Admin (Manage servers, invite team members, access audit logs)</option>
              <option value="viewer">Viewer (Read-only access to metrics, logs, and health status)</option>
            </select>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300">Role Security Note:</span>
            <p>
              Users cannot execute arbitrary bash commands. Every sensitive remediation or stack deployment
              requires structured typed approvals.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {loading ? 'Inviting...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
