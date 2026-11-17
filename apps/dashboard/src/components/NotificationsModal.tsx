import React from 'react';
import { X, Bell, AlertTriangle, CheckCircle2, Rocket, Shield, Bot, Trash2 } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'incident' | 'deployment' | 'security' | 'ai';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidents: any[];
  deployments: any[];
  proposals: any[];
}

export const NotificationsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  incidents,
  deployments,
  proposals,
}) => {
  if (!isOpen) return null;

  // Build notifications from real state
  const notifications: NotificationItem[] = [
    ...incidents.slice(0, 3).map((inc) => ({
      id: `inc-${inc.id}`,
      type: 'incident' as const,
      title: `System Alert: ${inc.title}`,
      message: inc.description || 'Abnormal metric detected on host',
      timestamp: new Date(inc.detectedAt).toLocaleTimeString(),
      read: inc.status === 'resolved',
    })),
    ...deployments.slice(0, 3).map((dep) => ({
      id: `dep-${dep.id}`,
      type: 'deployment' as const,
      title: `Deployment: ${dep.appName}`,
      message: `Status: ${dep.status.toUpperCase()} (${dep.branch})`,
      timestamp: new Date(dep.createdAt).toLocaleTimeString(),
      read: true,
    })),
    ...proposals.slice(0, 2).map((p) => ({
      id: `prop-${p.id}`,
      type: 'ai' as const,
      title: `AI Action Proposal Ready`,
      message: `Action: ${p.actionType} (Risk: ${p.riskLevel})`,
      timestamp: new Date(p.createdAt).toLocaleTimeString(),
      read: p.status !== 'pending',
    })),
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-start justify-end p-4 z-50 animate-in fade-in">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl h-[90vh] flex flex-col overflow-hidden mr-2 mt-2">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-400" />
            <span className="font-bold text-sm text-white">Notifications Center</span>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-mono border border-blue-500/20">
              {notifications.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-50" />
              All notifications caught up.
            </div>
          ) : (
            notifications.map((item) => {
              const iconMap = {
                incident: <AlertTriangle className="h-4 w-4 text-amber-400" />,
                deployment: <Rocket className="h-4 w-4 text-blue-400" />,
                security: <Shield className="h-4 w-4 text-rose-400" />,
                ai: <Bot className="h-4 w-4 text-purple-400" />,
              };

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition ${
                    item.read
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-80'
                      : 'bg-slate-900 border-slate-700/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {iconMap[item.type]}
                      <span className="font-semibold text-xs text-white">{item.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 pl-6">{item.message}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-center">
          <span className="text-[11px] text-slate-500">
            Real-time alert streaming via NEXUS Agent telemetry
          </span>
        </div>
      </div>
    </div>
  );
};
