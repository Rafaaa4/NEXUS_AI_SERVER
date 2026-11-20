import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  FileText,
  Search,
  Sparkles,
  CheckCircle2,
  Server,
  RefreshCw,
  Cpu,
  HardDrive,
  Layers,
} from 'lucide-react';
import { api, Incident } from '../../services/api';

interface Props {
  servers: any[];
  incidents: any[];
  onTriggerAi: (incidentId: string) => void;
  analyzingId: string | null;
}

export const MonitoringView: React.FC<Props> = ({
  servers,
  incidents,
  onTriggerAi,
  analyzingId,
}) => {
  const [selectedServerId, setSelectedServerId] = useState(servers[0]?.id || '');
  const [logs, setLogs] = useState<any[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logLevel, setLogLevel] = useState('all');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<any | null>(null);

  // Load server metrics with live periodic auto-refresh
  useEffect(() => {
    if (!selectedServerId) return;

    const fetchMetrics = () => {
      api
        .getServerMetrics(selectedServerId)
        .then((res: any) => {
          const metrics = (res?.cpuUsagePercent !== undefined || res?.cpuUsage !== undefined) ? res : (res?.data || null);
          setLiveMetrics(metrics);
        })
        .catch(() => {});
    };

    fetchMetrics();
    fetchLogs();

    const interval = setInterval(() => {
      fetchMetrics();
      fetchLogs();
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedServerId]);

  const fetchLogs = async () => {
    if (!selectedServerId) return;
    setLoadingLogs(true);
    try {
      const res: any = await api.getServerLogs(selectedServerId, 100);
      const logList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setLogs(logList);
    } catch (err) {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = logLevel === 'all' || log.level === logLevel;
    const matchesSearch =
      !logSearch ||
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.source.toLowerCase().includes(logSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-rose-400">
            <Activity className="h-4 w-4" />
            <span>Observability & Telemetry Guardian</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Live Monitoring & Log Explorer</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time server telemetry streams, system alerts, and redacted log inspection.
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

      {/* Live Resource Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Cpu className="h-4 w-4 text-blue-400" />
              <span>CPU Utilization</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {liveMetrics?.cpuUsagePercent != null ? `${Number(liveMetrics.cpuUsagePercent).toFixed(1)}%` : '0.0%'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, liveMetrics?.cpuUsagePercent || 0))}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {liveMetrics?.loadAverage
              ? `Load Avg: ${Number(liveMetrics.loadAverage[0] || 0).toFixed(2)}, ${Number(liveMetrics.loadAverage[1] || 0).toFixed(2)}, ${Number(liveMetrics.loadAverage[2] || 0).toFixed(2)}`
              : 'Load Avg: 0.10, 0.15, 0.08'}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Activity className="h-4 w-4 text-purple-400" />
              <span>Memory (RAM)</span>
            </span>
            <span className="font-mono text-purple-400 font-bold">
              {liveMetrics?.memoryUsagePercent != null ? `${Number(liveMetrics.memoryUsagePercent).toFixed(1)}%` : '0.0%'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, liveMetrics?.memoryUsagePercent || 0))}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {liveMetrics?.memoryTotalBytes
              ? `Available: ${(((liveMetrics.memoryTotalBytes - (liveMetrics.memoryUsedBytes || 0)) / (1024 * 1024 * 1024))).toFixed(1)} GB / ${(liveMetrics.memoryTotalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB Total`
              : 'Available: -- / -- GB Total'}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <HardDrive className="h-4 w-4 text-amber-400" />
              <span>Storage (Root /)</span>
            </span>
            <span className="font-mono text-amber-400 font-bold">
              {liveMetrics?.diskUsagePercent != null ? `${Number(liveMetrics.diskUsagePercent).toFixed(1)}%` : '0.0%'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, liveMetrics?.diskUsagePercent || 0))}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {liveMetrics?.diskTotalBytes
              ? `Free Space: ${(((liveMetrics.diskTotalBytes - (liveMetrics.diskUsedBytes || 0)) / (1024 * 1024 * 1024))).toFixed(1)} GB of ${(liveMetrics.diskTotalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
              : 'Free Space: -- of -- GB'}
          </div>
        </div>
      </div>

      {/* Incidents Timeline */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="font-bold text-sm text-white">System Incidents & Anomaly Timeline</h2>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono">
            {incidents.length} Total
          </span>
        </div>

        {incidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-60" />
            No incidents detected. All servers are operating normally.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        incident.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {incident.severity}
                    </span>
                    <span className="font-bold text-white text-sm">{incident.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono ${
                        incident.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{incident.description}</p>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Detected: {new Date(incident.detectedAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  {incident.status !== 'resolved' && (
                    <button
                      onClick={() => onTriggerAi(incident.id)}
                      disabled={analyzingId === incident.id}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/25 flex items-center space-x-2 transition disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{analyzingId === incident.id ? 'Diagnosing...' : 'Diagnose with AI'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real-time Log Explorer */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <h3 className="font-bold text-sm text-white">System Log Stream (Auto-Redacted)</h3>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search logs..."
                className="bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="all">All Levels</option>
              <option value="info">INFO</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
            </select>

            <button
              onClick={fetchLogs}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Refresh logs"
            >
              <RefreshCw className={`h-4 w-4 ${loadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-[11px] text-slate-300 max-h-80 overflow-y-auto space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching logs captured yet. Check that the agent is running on the host.
            </div>
          ) : (
            filteredLogs.map((log, idx) => (
              <div key={idx} className="flex items-start space-x-2.5 py-0.5 hover:bg-slate-900/60 rounded px-1">
                <span className="text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span
                  className={`px-1.5 py-0.2 rounded font-bold shrink-0 text-[10px] ${
                    log.level === 'error'
                      ? 'bg-rose-500/20 text-rose-400'
                      : log.level === 'warn'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {log.level?.toUpperCase()}
                </span>
                <span className="text-slate-400 shrink-0">[{log.source}]</span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
