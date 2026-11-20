import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Building,
  RefreshCw,
  Eye,
  Key,
  Info,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { api, Organization } from '../../services/api';
import { InviteMemberModal } from '../../components/InviteMemberModal';
import { useAuth } from '../../context/AuthContext';

interface Props {
  currentOrg: Organization | null;
}

export const TeamView: React.FC<Props> = ({ currentOrg }) => {
  const { user, organizations, setCurrentOrg, refreshUserOrgs } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    loadMembers();
    refreshUserOrgs();
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
      setActionNotice('Member access revoked successfully.');
      setTimeout(() => setActionNotice(null), 4000);
      loadMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!currentOrg) return;
    setUpdatingRoleId(userId);
    try {
      await api.updateMemberRole(currentOrg.id, userId, newRole);
      setActionNotice(`Member role updated to ${newRole.toUpperCase()} successfully.`);
      setTimeout(() => setActionNotice(null), 4000);
      await loadMembers();
      refreshUserOrgs();
    } catch (err: any) {
      alert(err.message || 'Failed to update member role');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const isOwnerOrAdmin =
    currentOrg?.role?.toLowerCase() === 'owner' ||
    currentOrg?.role?.toLowerCase() === 'admin';

  return (
    <div className="space-y-6">
      {/* Multi-Team Workspace Switcher Banner (if user belongs to multiple orgs) */}
      {organizations.length > 1 && (
        <div className="bg-gradient-to-r from-blue-950/60 via-slate-900/90 to-purple-950/40 border border-blue-500/30 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Team Workspaces ({organizations.length})
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono border border-blue-500/30 font-semibold">
                  Multi-Tenant
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Currently managing: <strong className="text-white">{currentOrg?.name}</strong>{' '}
                <span className="font-mono text-blue-400 font-bold">
                  ({currentOrg?.role?.toUpperCase()})
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Switch Team:</span>
            {organizations.map((org) => {
              const isActive = org.id === currentOrg?.id;
              return (
                <button
                  key={org.id}
                  onClick={() => setCurrentOrg(org)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/80'
                  }`}
                >
                  <span>{org.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                      isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {org.role}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Role Notice for Invited Members */}
      {currentOrg?.role?.toLowerCase() === 'viewer' && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-center space-x-3 text-xs">
          <Eye className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-slate-300 leading-relaxed">
            <strong className="text-amber-300 font-semibold">Viewer Access (Read-Only):</strong>{' '}
            You were invited to collaborate on <strong className="text-white">{currentOrg?.name}</strong>.
            You can inspect live server metrics, application statuses, and logs. Modifying firewall rules,
            deploying apps, or inviting members is reserved for Admins and Owners.
          </div>
        </div>
      )}

      {/* Toast Notice */}
      {actionNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header and Controls */}
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

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={loadMembers}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
            title="Refresh members list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isOwnerOrAdmin ? (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Employee</span>
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2.5 bg-slate-800 text-slate-500 rounded-xl text-xs font-semibold border border-slate-700/60 flex items-center space-x-2 cursor-not-allowed"
              title="Only Owners and Admins can invite team members"
            >
              <Lock className="h-4 w-4 text-amber-500" />
              <span>Invite Locked (Viewer)</span>
            </button>
          )}
        </div>
      </div>

      {/* Team Members Table with Granular Permissions */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-sm text-white">Active Members ({members.length})</h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/20 font-bold">
              VERIFIED RBAC
            </span>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono border border-slate-700">
            Tenant: <strong className="text-white">{currentOrg?.name}</strong>
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-3.5">Member</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">
                  <div className="flex items-center space-x-1.5">
                    <span>Assigned Role</span>
                    {isOwnerOrAdmin && (
                      <span className="text-[10px] text-blue-400 font-normal">
                        (Select to change)
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3.5">Access & Granular Permissions</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Joined Date</th>
                {isOwnerOrAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No members found in this organization.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isCurrent =
                    user?.id === m.userId || user?.email === m.user?.email;

                  return (
                    <tr
                      key={m.userId}
                      className={`hover:bg-slate-800/40 transition ${
                        isCurrent ? 'bg-blue-600/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-white flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-xs text-blue-400">
                          {(m.user?.fullName || m.user?.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <span>
                            {m.user?.fullName || m.user?.email?.split('@')[0]}
                          </span>
                          {isCurrent && (
                            <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-slate-400">
                        {m.user?.email}
                      </td>

                      <td className="px-6 py-4">
                        {isOwnerOrAdmin && m.role !== 'owner' && !isCurrent ? (
                          <div className="relative inline-flex items-center group">
                            <select
                              value={m.role}
                              disabled={updatingRoleId === m.userId}
                              onChange={(e) => handleUpdateRole(m.userId, e.target.value)}
                              className={`text-[10px] font-mono font-bold uppercase rounded-full pl-3 pr-7 py-1 border transition cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm ${
                                m.role === 'admin'
                                  ? 'bg-blue-950/80 text-blue-300 border-blue-500/40 hover:border-blue-400'
                                  : m.role === 'operator'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:border-amber-400'
                              } ${updatingRoleId === m.userId ? 'opacity-50 cursor-wait' : ''}`}
                              title="Click to modify member role"
                            >
                              <option value="admin" className="bg-slate-900 text-blue-300">ADMIN</option>
                              <option value="operator" className="bg-slate-900 text-emerald-300">OPERATOR</option>
                              <option value="viewer" className="bg-slate-900 text-amber-300">VIEWER</option>
                            </select>
                            <ChevronDown className="h-3 w-3 absolute right-2 pointer-events-none text-slate-400 group-hover:text-white transition" />
                          </div>
                        ) : (
                          <span
                            className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                              m.role === 'owner'
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                : m.role === 'admin'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : m.role === 'operator'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {m.role}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-[11px] text-slate-400 max-w-xs">
                        {m.permissions ||
                          (m.role === 'owner'
                            ? 'Full Control (Billing, Servers, Deployments, Team RBAC)'
                            : m.role === 'admin'
                            ? 'Infrastructure Admin (Connect Servers, Invites, AI Diagnostics, Security)'
                            : m.role === 'operator'
                            ? 'Deployments & Workloads (Deploy Apps, Rollback, Restarts, Databases)'
                            : 'Read-Only (Metrics, System Logs, Telemetry)')}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          <span>Active Member</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>

                      {isOwnerOrAdmin && (
                        <td className="px-6 py-4 text-right">
                          {m.role !== 'owner' && !isCurrent && (
                            <button
                              onClick={() => handleRemoveMember(m.userId)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Revoke member access"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <Key className="h-4 w-4 text-purple-400" />
          <h3 className="font-bold text-sm text-white">
            Role-Based Access Control (RBAC) Permissions Matrix
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-purple-400 uppercase font-mono">Owner</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Full administrative authority. Can manage billing subscriptions, delete servers, manage team, and approve remediations.
            </p>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-blue-400 uppercase font-mono">Admin</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Can connect servers, invite employees, trigger AI diagnostics, and inspect security audit logs.
            </p>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-400 uppercase font-mono">Operator</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Can deploy applications, approve baseline stacks, restart services, and manage container workloads.
            </p>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-amber-400 uppercase font-mono">Viewer</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
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
