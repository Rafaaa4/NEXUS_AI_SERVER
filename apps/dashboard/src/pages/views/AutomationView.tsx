import React, { useState } from 'react';
import {
  Zap,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  GitBranch,
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  status: 'active' | 'paused';
  lastRun: string;
}

export const AutomationView: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'wf-1',
      name: 'High CPU Guardian',
      trigger: 'Host CPU Metric Poll',
      condition: 'CPU utilization exceeds 85% for > 2 checks',
      action: 'Create high-priority Incident & request AI root-cause diagnosis',
      status: 'active',
      lastRun: '12 mins ago',
    },
    {
      id: 'wf-2',
      name: 'Automated Daily System Maintenance',
      trigger: 'Scheduled Cron (00:00 UTC)',
      condition: 'Disk storage or journal logs exceed 500 MB',
      action: 'Execute safe journal vacuum & purge /tmp caches',
      status: 'active',
      lastRun: 'Today at 00:00',
    },
    {
      id: 'wf-3',
      name: 'GitHub Webhook CI/CD Deployment',
      trigger: 'Incoming Webhook (push to main)',
      condition: 'Commit SHA updated on repository',
      action: 'Dispatch deployment.run to server agent & build containers',
      status: 'active',
      lastRun: '1 hour ago',
    },
    {
      id: 'wf-4',
      name: 'Memory Out-Of-Memory Guard',
      trigger: 'Host Memory Metric Poll',
      condition: 'RAM usage exceeds 92%',
      action: 'Generate Action Proposal for human approval to drop system cache',
      status: 'active',
      lastRun: 'Never triggered',
    },
  ]);

  const toggleWorkflow = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, status: w.status === 'active' ? 'paused' : 'active' } : w
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400">
            <Zap className="h-4 w-4" />
            <span>Autonomous Infrastructure Workflows</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Automation & Scheduled Tasks</h1>
          <p className="text-xs text-slate-400 mt-1">
            Build and manage trigger-based workflows that run autonomously without manual intervention.
          </p>
        </div>

        <span className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1.5 rounded-xl font-semibold">
          {workflows.filter((w) => w.status === 'active').length} Active Automations
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700/80 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-sm text-white">{wf.name}</h3>
                </div>

                <button
                  onClick={() => toggleWorkflow(wf.id)}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300"
                >
                  {wf.status === 'active' ? (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <ToggleRight className="h-5 w-5" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center space-x-1">
                      <ToggleLeft className="h-5 w-5" />
                      <span>Paused</span>
                    </span>
                  )}
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-slate-500 font-semibold">Trigger:</span> {wf.trigger}
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-amber-400 font-semibold">Condition:</span> {wf.condition}
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-blue-400 font-semibold">Action:</span> {wf.action}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Last Execution: {wf.lastRun}</span>
              <span className="text-emerald-400">Dry-Run: Verified</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
