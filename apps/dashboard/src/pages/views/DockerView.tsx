import React, { useState } from 'react';
import {
  Boxes,
  Play,
  Square,
  RotateCw,
  FileText,
  ShieldAlert,
  Server,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  servers: any[];
  applications: any[];
}

export const DockerView: React.FC<Props> = ({ servers, applications }) => {
  const [selectedServerId, setSelectedServerId] = useState(servers[0]?.id || '');
  const [activeLogsContainer, setActiveLogsContainer] = useState<string | null>(null);

  // Mock-backed live structure from applications & connected server stacks
  const containers = applications.map((app, idx) => ({
    id: `cnt-${app.id.slice(0, 8)}`,
    name: `${app.appName.toLowerCase().replace(/\s+/g, '-')}-web`,
    image: `${app.appName.toLowerCase().replace(/\s+/g, '-')}:latest`,
    status: app.status === 'running' ? 'running' : 'exited',
    ports: '0.0.0.0:3000->3000/tcp',
    cpu: app.status === 'running' ? '1.4%' : '0%',
    memory: app.status === 'running' ? '128 MB' : '0 MB',
    uptime: app.status === 'running' ? 'Up 4 hours' : 'Exited (0)',
  }));

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <Boxes className="h-4 w-4" />
            <span>Container Stack Orchestration</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Docker Containers & Services</h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor and manage running Docker application stacks without raw command line complexity.
          </p>
        </div>

        {servers.length > 0 && (
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <Server className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400">Host:</span>
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} ({s.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Containers Table Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">Active Containers ({containers.length})</h3>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
            Docker Compose Engine v2
          </span>
        </div>

        {containers.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            <Boxes className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            No active Docker containers on this host. Deploy an application to launch containers.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="px-6 py-3">Container Name</th>
                  <th className="px-6 py-3">Image Tag</th>
                  <th className="px-6 py-3">Port Mapping</th>
                  <th className="px-6 py-3">CPU Usage</th>
                  <th className="px-6 py-3">RAM</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {containers.map((cnt) => (
                  <tr key={cnt.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-mono font-bold text-white flex items-center space-x-2">
                      <span className={`h-2 w-2 rounded-full ${cnt.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                      <span>{cnt.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{cnt.image}</td>
                    <td className="px-6 py-4 font-mono text-blue-400">{cnt.ports}</td>
                    <td className="px-6 py-4 font-mono">{cnt.cpu}</td>
                    <td className="px-6 py-4 font-mono">{cnt.memory}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                          cnt.status === 'running'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {cnt.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setActiveLogsContainer(cnt.name)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
                      >
                        Logs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Container Logs Modal */}
      {activeLogsContainer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Container Logs: {activeLogsContainer}</h3>
              </div>
              <button
                onClick={() => setActiveLogsContainer(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap">
              [2026-11-17T11:00:23Z] Container runtime started on port 3000
              [2026-11-17T11:00:23Z] Connecting to backend database...
              [2026-11-17T11:00:24Z] Database connection verified.
              [2026-11-17T11:00:25Z] HTTP Server listening at http://0.0.0.0:3000
              [2026-11-17T11:00:26Z] Ready for incoming production traffic.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
