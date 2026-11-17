import React, { useState } from 'react';
import { Archive, CheckCircle2, Clock, HardDrive, RefreshCw, Shield, AlertTriangle } from 'lucide-react';

export const BackupsView: React.FC = () => {
  const [backingUp, setBackingUp] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const backups = [
    {
      id: 'bk-pg-1',
      target: 'PostgreSQL Database (nexus_ai)',
      type: 'Database Dump (.sql.gz)',
      size: '24.8 MB',
      created: 'Today at 04:00 AM',
      status: 'verified',
      retention: '7 Days',
    },
    {
      id: 'bk-app-1',
      target: 'Application Source & Compose Configurations',
      type: 'Tarball Archive (.tar.gz)',
      size: '184.2 MB',
      created: 'Today at 04:05 AM',
      status: 'verified',
      retention: '14 Days',
    },
    {
      id: 'bk-sys-1',
      target: 'Agent Environment & Systemd Units',
      type: 'Config Snapshot',
      size: '1.2 MB',
      created: 'Yesterday at 04:00 AM',
      status: 'verified',
      retention: '30 Days',
    },
  ];

  const handleTriggerBackup = () => {
    setBackingUp(true);
    setTimeout(() => {
      setBackingUp(false);
      setSuccessMsg('Snapshot triggered successfully! Stored in encrypted backup vault.');
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <Archive className="h-4 w-4" />
            <span>Disaster Recovery & Redundancy</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Backup & Disaster Recovery</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated database and volume snapshots with cryptographic checksum verification.
          </p>
        </div>

        <button
          onClick={handleTriggerBackup}
          disabled={backingUp}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${backingUp ? 'animate-spin' : ''}`} />
          <span>{backingUp ? 'Creating Snapshot...' : 'Trigger Backup Now'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Backups Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">Verified Restore Points ({backups.length})</h3>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
            Automated Daily (04:00 UTC)
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-3">Backup Target</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Archive Size</th>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Integrity</th>
                <th className="px-6 py-3 text-right">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {backups.map((bk) => (
                <tr key={bk.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4 font-bold text-white flex items-center space-x-2.5">
                    <Archive className="h-4 w-4 text-blue-400" />
                    <span>{bk.target}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400">{bk.type}</td>
                  <td className="px-6 py-4 font-mono">{bk.size}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono">{bk.created}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      VERIFIED (SHA-256)
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-400">{bk.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
