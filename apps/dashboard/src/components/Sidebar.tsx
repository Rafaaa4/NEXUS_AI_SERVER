import React from 'react';
import { useMode } from '../context/ModeContext';
import {
  LayoutDashboard,
  Bot,
  Server,
  Boxes,
  Database,
  AppWindow,
  Rocket,
  Activity,
  Shield,
  Zap,
  Users,
  DollarSign,
  Archive,
  BarChart3,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Terminal,
  ExternalLink,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'ai'
  | 'infrastructure'
  | 'docker'
  | 'databases'
  | 'applications'
  | 'deployments'
  | 'monitoring'
  | 'security'
  | 'automation'
  | 'team'
  | 'cost'
  | 'backups'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavSection;
  onSelectTab: (tab: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  incidentsCount?: number;
  pendingProposalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  incidentsCount = 0,
  pendingProposalsCount = 0,
}) => {
  const { mode, isBusiness, toggleMode } = useMode();

  const navGroups = [
    {
      label: 'EXECUTIVE',
      items: [
        { id: 'overview' as NavSection, label: 'Overview', icon: LayoutDashboard },
        {
          id: 'ai' as NavSection,
          label: 'AI Command Center',
          icon: Bot,
          badge: pendingProposalsCount > 0 ? pendingProposalsCount : undefined,
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        },
      ],
    },
    {
      label: 'INFRASTRUCTURE & APPS',
      items: [
        { id: 'infrastructure' as NavSection, label: 'Servers & Stacks', icon: Server },
        { id: 'docker' as NavSection, label: 'Docker Containers', icon: Boxes },
        { id: 'databases' as NavSection, label: 'Databases', icon: Database },
        { id: 'applications' as NavSection, label: 'Applications', icon: AppWindow },
        { id: 'deployments' as NavSection, label: 'Deployments & CI/CD', icon: Rocket },
      ],
    },
    {
      label: 'HEALTH & SECURITY',
      items: [
        {
          id: 'monitoring' as NavSection,
          label: 'Live Telemetry & Logs',
          icon: Activity,
          badge: incidentsCount > 0 ? incidentsCount : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        },
        { id: 'security' as NavSection, label: 'Security Center', icon: Shield },
      ],
    },
    {
      label: 'OPERATIONS & BUSINESS',
      items: [
        { id: 'automation' as NavSection, label: 'Automations & Crons', icon: Zap },
        { id: 'team' as NavSection, label: 'Team & Access', icon: Users },
        { id: 'cost' as NavSection, label: 'Cost & Cloud Spending', icon: DollarSign },
        { id: 'backups' as NavSection, label: 'Backups & Recovery', icon: Archive },
        { id: 'reports' as NavSection, label: 'Reports & Analytics', icon: BarChart3 },
        { id: 'settings' as NavSection, label: 'Organization Settings', icon: Sliders },
      ],
    },
  ];

  return (
    <aside
      className={`bg-[#0d1424] border-r border-slate-800/80 transition-all duration-300 flex flex-col shrink-0 relative z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand & Collapse Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
        {!collapsed ? (
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/30 border border-blue-400/30">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wide text-white">NEXUS</span>
              <span className="text-blue-400 font-bold ml-1 text-xs bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
                ENTERPRISE
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/30">
            <Server className="h-5 w-5" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Mode Banner inside Sidebar */}
      {!collapsed && (
        <div className="p-3 border-b border-slate-800/60">
          <button
            onClick={toggleMode}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              isBusiness
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            <div className="flex items-center space-x-2">
              {isBusiness ? <Briefcase className="h-3.5 w-3.5 text-blue-400" /> : <Terminal className="h-3.5 w-3.5 text-emerald-400" />}
              <span>{isBusiness ? 'Business Mode' : 'Advanced Mode'}</span>
            </div>
            <span className="text-[10px] uppercase font-mono opacity-70">Switch</span>
          </button>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Agent v0.1.0</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Platform 2.0</span>
        </div>
      )}
    </aside>
  );
};
