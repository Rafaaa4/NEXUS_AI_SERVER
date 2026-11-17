import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api, Organization } from '../../services/api';
import { InviteMemberModal } from '../../components/InviteMemberModal';

interface Props {
  currentOrg: Organization | null;
}

export const TeamView: React.FC<Props> = ({ currentOrg }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    loadMembers();
  }, [currentOrg]);

  const loadMembers = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const data = await api.listMembers(currentOrg.id);
      setMembers(data);
    } catch (err) {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentOrg || !confirm('Are you sure you want to revoke this user access?')) return;
    try {
      await api.removeMember(currentOrg.id, userId);
      loadMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <Users className="h-4 w-4" />
            <span>Organization Members & Access Control</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Employee & Team Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Assign granular infrastructure roles (Owner, Admin, Operator, Viewer) to your company employees.
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Employee</span>
        </button>
      </div>

      {/* Team Members Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">Active Members ({members.length})</h3>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
            Tenant: {currentOrg?.name}
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Joined Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4 font-bold text-white">
                    {m.user?.fullName || m.user?.email?.split('@')[0]}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400">{m.user?.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        m.role === 'owner'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : m.role === 'admin'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : m.role === 'operator'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(m.userId)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white">Role-Based Access Control (RBAC) Permissions Matrix</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-purple-400 uppercase font-mono">Owner</span>
            <p className="text-slate-400 text-[11px]">
              Full administrative authority. Can manage billing subscriptions, delete servers, manage team, and approve remediations.
            </p>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-blue-400 uppercase font-mono">Admin</span>
            <p className="text-slate-400 text-[11px]">
              Can connect servers, invite employees, trigger AI diagnostics, and inspect security audit logs.
            </p>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-400 uppercase font-mono">Operator</span>
            <p className="text-slate-400 text-[11px]">
              Can deploy applications, approve baseline stacks, restart services, and manage container workloads.
            </p>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-slate-400 uppercase font-mono">Viewer</span>
            <p className="text-slate-400 text-[11px]">
              Read-only visibility into live metrics, applications, and system logs. Cannot approve or alter configurations.
            </p>
          </div>
        </div>
      </div>

      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        orgId={currentOrg?.id || ''}
        onMemberInvited={loadMembers}
      />
    </div>
  );
};
