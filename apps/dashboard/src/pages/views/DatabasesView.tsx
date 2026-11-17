import React from 'react';
import { Database, CheckCircle2, HardDrive, ShieldCheck, Activity, Clock, RefreshCw } from 'lucide-react';

interface Props {
  servers: any[];
}

export const DatabasesView: React.FC<Props> = ({ servers }) => {
  const dbInstances = [
    {
      id: 'db-postgres-1',
      name: 'nexus_ai (PostgreSQL 16)',
      type: 'PostgreSQL',
      version: '16.4 Alpine',
      host: servers[0]?.name || 'Local Host',
      status: 'healthy',
      connections: '14 / 100',
      storageUsed: '142 MB',
      lastBackup: 'Today at 04:00 AM',
      port: 5432,
    },
    {
      id: 'db-redis-1',
      name: 'nexus_cache (Redis 7)',
      type: 'Redis Cache',
      version: '7.2 Alpine',
      host: servers[0]?.name || 'Local Host',
      status: 'healthy',
      connections: '6 / 500',
      storageUsed: '18 MB',
      lastBackup: 'Today at 04:00 AM',
      port: 6379,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <Database className="h-4 w-4" />
            <span>Database Infrastructure & Storage</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Managed Databases</h1>
          <p className="text-xs text-slate-400 mt-1">
            Production database cluster health, active connections, and automated backup schedules.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-semibold flex items-center space-x-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>All Clusters Online</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dbInstances.map((db) => (
          <div
            key={db.id}
            className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700/80 transition"
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{db.name}</h3>
                  <div className="text-[11px] text-slate-400 font-mono">Port {db.port} • {db.version}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {db.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Connections</div>
                <div className="text-xs font-mono font-bold text-white mt-1">{db.connections}</div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Storage</div>
                <div className="text-xs font-mono font-bold text-white mt-1">{db.storageUsed}</div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Security</div>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-1">Encrypted</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span>Last Automated Snapshot:</span>
              </span>
              <span className="font-mono text-white font-semibold">{db.lastBackup}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
