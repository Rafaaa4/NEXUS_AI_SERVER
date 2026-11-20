import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useMode } from '../context/ModeContext';
import {
  Building,
  LogOut,
  Shield,
  Search,
  Bell,
  Briefcase,
  Terminal,
  Bot,
  Command,
} from 'lucide-react';
import { NavSection } from './Sidebar';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onNavigate: (section: NavSection) => void;
  notificationsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenNotifications,
  onNavigate,
  notificationsCount,
}) => {
  const { user, organizations, currentOrg, setCurrentOrg, logout } = useAuth();
  const { mode, isBusiness, toggleMode } = useMode();

  return (
    <nav className="h-16 border-b border-slate-800/80 bg-[#0d1424]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left Area: Organization Switcher & Search Bar */}
      <div className="flex items-center space-x-4">
        {/* Organization Switcher */}
        {currentOrg && (
          <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs shadow-sm">
            <Building className="h-3.5 w-3.5 text-blue-400" />
            <select
              value={currentOrg.id}
              onChange={(e) => {
                const found = organizations.find((o) => o.id === e.target.value);
                if (found) setCurrentOrg(found);
              }}
              className="bg-transparent text-slate-200 font-semibold outline-none cursor-pointer text-xs"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id} className="bg-slate-900 text-slate-200">
                  {org.name} ({org.role?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Global Search Trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden md:flex items-center space-x-2.5 bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-slate-400 transition"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span>Search resources, apps, logs...</span>
          <kbd className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Area: Mode Switch, AI Quick Button, Notifications, User */}
      <div className="flex items-center space-x-3">
        {/* Dual Mode Switch Button */}
        <button
          onClick={toggleMode}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-sm ${
            isBusiness
              ? 'bg-blue-600/10 border-blue-500/30 text-blue-300 hover:bg-blue-600/20'
              : 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20'
          }`}
          title="Toggle between Business Owner Mode and Technical Advanced Mode"
        >
          {isBusiness ? (
            <>
              <Briefcase className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden sm:inline">Business Mode</span>
            </>
          ) : (
            <>
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Advanced Mode</span>
            </>
          )}
        </button>

        {/* Quick Ask AI button */}
        <button
          onClick={() => onNavigate('ai')}
          className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition"
        >
          <Bot className="h-3.5 w-3.5 text-purple-400" />
          <span>Ask AI DevOps</span>
        </button>

        {/* Notifications Center Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition group"
          title={`Notifications Center (${notificationsCount} unread)`}
        >
          <Bell className="h-4 w-4 group-hover:text-white transition" />
          {notificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-600 border-2 border-[#0d1424] text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center animate-pulse shadow-lg">
              {notificationsCount > 99 ? '99+' : notificationsCount}
            </span>
          )}
        </button>

        {/* User Profile Pill & Logout */}
        <div className="flex items-center space-x-3 border-l border-slate-800/80 pl-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white leading-tight">
              {user?.fullName || user?.email?.split('@')[0]}
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-end space-x-1">
              <Shield className="h-3 w-3 text-emerald-400" />
              <span>{currentOrg?.role?.toUpperCase() || 'MEMBER'}</span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};
