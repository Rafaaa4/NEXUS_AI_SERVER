import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  Key,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
} from 'lucide-react';

interface Props {
  auditLogs: any[];
  servers: any[];
}

export const SecurityView: React.FC<Props> = ({ auditLogs, servers }) => {
  const [searchAudit, setSearchAudit] = useState('');

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.resourceType.toLowerCase().includes(searchAudit.toLowerCase()) ||
      (log.actor?.email && log.actor.email.toLowerCase().includes(searchAudit.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Enterprise Security Posture & Compliance</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Security Center & Audit Log</h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-trust firewall rules, SSL/TLS certificate monitoring, and tamper-proof security audit trail.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl text-emerald-400 text-xs font-bold font-mono">
          <ShieldCheck className="h-4 w-4" />
          <span>Security Score: 96/100 (Grade A)</span>
        </div>
      </div>

      {/* Security Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: UFW Firewall */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">UFW Host Firewall</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400">Default incoming policy is DROP. Only authorized ports are reachable.</p>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-slate-300">
              <span>Port 22 / TCP (OpenSSH)</span>
              <span className="text-emerald-400 font-bold">ALLOWED</span>
            </div>
            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-slate-300">
              <span>Port 80 / TCP (HTTP)</span>
              <span className="text-emerald-400 font-bold">ALLOWED</span>
            </div>
            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-slate-300">
              <span>Port 443 / TCP (HTTPS)</span>
              <span className="text-emerald-400 font-bold">ALLOWED</span>
            </div>
          </div>
        </div>

        {/* Module 2: SSL & TLS Certificates */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-purple-400" />
              <h3 className="font-bold text-sm text-white">SSL Certificates</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              VALID
            </span>
          </div>
          <p className="text-xs text-slate-400">Automated Let's Encrypt TLS renewal monitored 24/7.</p>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white font-mono">nexus-ai.internal</div>
                <div className="text-[10px] text-slate-500">Issuer: Let's Encrypt Authority X3</div>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-mono font-bold">64 Days</span>
                <div className="text-[10px] text-slate-500">Auto-renews</div>
              </div>
            </div>
          </div>
        </div>

        {/* Module 3: Access Control & Secret Masking */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center space-x-2">
              <Key className="h-4 w-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">Secret Redactor</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              ENFORCED
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Bearer tokens, database credentials, and RSA private keys are permanently masked before storage.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
            <div className="text-emerald-400">✔ Regex Masking: Active</div>
            <div className="text-emerald-400">✔ RBAC Multi-Tenancy: Verified</div>
            <div className="text-emerald-400">✔ SHA-256 Proposal Hash: Bound</div>
          </div>
        </div>
      </div>

      {/* Security Audit Log */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-blue-400" />
            <h3 className="font-bold text-sm text-white">Immutable Security Audit Trail</h3>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchAudit}
              onChange={(e) => setSearchAudit(e.target.value)}
              placeholder="Search audit trail..."
              className="bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No audit records matching query.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Actor</th>
                  <th className="px-6 py-3">Resource Type</th>
                  <th className="px-6 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-3.5 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-purple-300">
                      {log.action}
                    </td>
                    <td className="px-6 py-3.5 text-slate-200">
                      {log.actor?.email || 'Platform System'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-blue-400">
                      {log.resourceType}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
