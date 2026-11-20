import React, { useState } from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Rocket,
  Shield,
  Bot,
  Trash2,
  CheckCheck,
  ExternalLink,
  Users,
  Server,
  Activity,
  Info,
  Building,
} from 'lucide-react';
import { AppNotification } from '../services/api';
import { NavSection } from './Sidebar';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClearRead: () => Promise<void>;
  onNavigate?: (section: NavSection) => void;
}

type TabType = 'all' | 'unread' | 'incident' | 'deployment' | 'security' | 'system';

export const NotificationsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearRead,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { currentOrg, organizations, setCurrentOrg, refreshUserOrgs } = useAuth();

  if (!isOpen) return null;

  const handleSwitchOrgAndNavigate = async (e: React.MouseEvent, orgId: string, item: AppNotification) => {
    e.stopPropagation();
    await onMarkRead(item.id);
    const updatedOrgs = await refreshUserOrgs();
    const target = updatedOrgs.find((o) => o.id === orgId) || organizations.find((o) => o.id === orgId);
    if (target) {
      setCurrentOrg(target);
    }
    if (onNavigate) {
      onNavigate('team');
    }
    onClose();
  };

  // Filter based on active tab
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !item.read;
    if (activeTab === 'incident') return item.type === 'incident';
    if (activeTab === 'deployment') return item.type === 'deployment';
    if (activeTab === 'security') return item.type === 'security';
    if (activeTab === 'system') return ['system', 'ai', 'member', 'server'].includes(item.type);
    return true;
  });

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return dateStr;
    }
  };

  const handleItemClick = async (item: AppNotification) => {
    if (!item.read) {
      await onMarkRead(item.id);
    }
    if (item.link && onNavigate) {
      onNavigate(item.link as NavSection);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    setLoadingAction('markAll');
    try {
      await onMarkAllRead();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClearRead = async () => {
    setLoadingAction('clearRead');
    try {
      await onClearRead();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await onDelete(id);
  };

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'incident':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'deployment':
        return <Rocket className="h-4 w-4 text-cyan-400" />;
      case 'security':
        return <Shield className="h-4 w-4 text-rose-400" />;
      case 'ai':
        return <Bot className="h-4 w-4 text-purple-400" />;
      case 'member':
        return <Users className="h-4 w-4 text-emerald-400" />;
      case 'server':
        return <Server className="h-4 w-4 text-blue-400" />;
      default:
        return <Activity className="h-4 w-4 text-blue-400" />;
    }
  };

  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            CRITICAL
          </span>
        );
      case 'warning':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            WARN
          </span>
        );
      case 'success':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SUCCESS
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-start justify-end p-4 z-50 animate-in fade-in">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl h-[92vh] flex flex-col overflow-hidden mr-2 mt-2">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white">Notifications Center</span>
                {unreadCount > 0 ? (
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-mono font-bold border border-rose-500/30 animate-pulse">
                    {unreadCount} NEW
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                    All caught up
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Live alerts, infrastructure events, and deployment streams
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loadingAction === 'markAll'}
                className="p-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center space-x-1"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] hidden sm:inline">Mark all</span>
              </button>
            )}
            <button
              onClick={handleClearRead}
              disabled={loadingAction === 'clearRead'}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Clear all read notifications"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center space-x-1 p-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto text-xs font-semibold scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center space-x-1 ${
              activeTab === 'unread'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            )}
            <span className="text-[10px] font-mono">({unreadCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('incident')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'incident'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Alerts
          </button>
          <button
            onClick={() => setActiveTab('deployment')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'deployment'
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Deployments
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            AI & System
          </button>
        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-slate-300 text-sm">No notifications found</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                {activeTab === 'unread'
                  ? 'All notifications have been reviewed and marked as read.'
                  : 'New alerts, events, and deployment notifications will appear here in real time.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 rounded-xl border transition cursor-pointer relative group ${
                  item.read
                    ? 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700/80 hover:bg-slate-900/60 opacity-80 hover:opacity-100'
                    : 'bg-slate-900/90 border-slate-700/80 hover:border-blue-500/60 shadow-lg'
                }`}
              >
                {/* Unread indicator bar */}
                {!item.read && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full"></div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 pl-1.5">
                    <div className="p-1 rounded-lg bg-slate-800/80 border border-slate-700/50">
                      {renderTypeIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-white group-hover:text-blue-300 transition">
                          {item.title}
                        </span>
                        {renderSeverityBadge(item.severity)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
                    <span>{formatTimeAgo(item.createdAt)}</span>
                    <button
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition rounded"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-1.5 pl-8 leading-relaxed">
                  {item.message}
                </p>

                {item.organizationId && currentOrg?.id !== item.organizationId && (
                  <div className="mt-2.5 pl-8 flex items-center">
                    <button
                      onClick={(e) => handleSwitchOrgAndNavigate(e, item.organizationId, item)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition"
                    >
                      <Building className="h-3.5 w-3.5" />
                      <span>Switch to this Team Workspace</span>
                    </button>
                  </div>
                )}

                {item.link && (
                  <div className="mt-2 pl-8 flex items-center justify-between text-[11px] text-blue-400/90 hover:text-blue-300">
                    <span className="flex items-center space-x-1">
                      <span>View in {item.link.toUpperCase()}</span>
                      <ExternalLink className="h-3 w-3" />
                    </span>
                    {!item.read && (
                      <span className="text-[10px] text-slate-500">Click to view & mark read</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>NEXUS Real-time Notification Engine</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {notifications.length} Total • {unreadCount} Unread
          </span>
        </div>
      </div>
    </div>
  );
};
