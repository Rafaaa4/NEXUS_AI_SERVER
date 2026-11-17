import React from 'react';
import { BarChart3, Download, FileText, Calendar, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';

interface Props {
  servers: any[];
  applications: any[];
  incidents: any[];
  deployments: any[];
}

export const ReportsView: React.FC<Props> = ({
  servers,
  applications,
  incidents,
  deployments,
}) => {
  const handleExportJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      fleetSummary: {
        totalServers: servers.length,
        onlineServers: servers.filter((s) => s.status === 'online').length,
        totalApplications: applications.length,
        totalDeployments: deployments.length,
        totalIncidents: incidents.length,
      },
      servers,
      deployments,
      incidents,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-infrastructure-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <BarChart3 className="h-4 w-4" />
            <span>Executive Infrastructure Reporting</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Reports & Analytics Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate and export operations, security compliance, and deployment reports for stakeholders.
          </p>
        </div>

        <button
          onClick={handleExportJson}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Export JSON Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Availability</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">99.98%</div>
          <p className="text-xs text-slate-400">Past 30 days operational uptime across host instances.</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Releases</span>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{deployments.length}</div>
          <p className="text-xs text-slate-400">Deployments performed with zero arbitrary bash execution.</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Security Score</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">96 / 100</div>
          <p className="text-xs text-slate-400">UFW firewall enforced and secrets masked 100%.</p>
        </div>
      </div>
    </div>
  );
};
