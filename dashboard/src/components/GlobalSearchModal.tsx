import React, { useState, useEffect } from 'react';
import { Search, X, Server, AppWindow, AlertTriangle, Bot, Shield, Rocket, Command } from 'lucide-react';
import { NavSection } from './Sidebar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: NavSection) => void;
  servers: any[];
  applications: any[];
  incidents: any[];
}

export const GlobalSearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onNavigate,
  servers,
  applications,
  incidents,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    (s.hostname && s.hostname.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredApps = applications.filter((a) =>
    a.appName.toLowerCase().includes(query.toLowerCase()) ||
    (a.repositoryUrl && a.repositoryUrl.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredIncidents = incidents.filter((i) =>
    i.title.toLowerCase().includes(query.toLowerCase()) ||
    (i.description && i.description.toLowerCase().includes(query.toLowerCase()))
  );

  const quickNav = [
    { label: 'AI Command Center', section: 'ai' as NavSection, icon: Bot, desc: 'Ask virtual DevOps engineer' },
    { label: 'Infrastructure & Servers', section: 'infrastructure' as NavSection, icon: Server, desc: 'Manage host machines & baseline stacks' },
    { label: 'Applications & Services', section: 'applications' as NavSection, icon: AppWindow, desc: 'Monitor running web apps' },
    { label: 'Security Center & Firewall', section: 'security' as NavSection, icon: Shield, desc: 'UFW rules, audit log & posture' },
    { label: 'Deployments & CI/CD', section: 'deployments' as NavSection, icon: Rocket, desc: 'Build logs & auto git webhooks' },
  ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.desc.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 z-50">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-900/60">
          <Search className="h-5 w-5 text-blue-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search servers, applications, incidents, or jump to section..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Quick Navigation Items */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Navigation & Views
            </div>
            <div className="space-y-1">
              {quickNav.map((nav, idx) => {
                const Icon = nav.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onNavigate(nav.section);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 text-left transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition">
                          {nav.label}
                        </div>
                        <div className="text-[11px] text-slate-400">{nav.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Jump →</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Servers Match */}
          {filteredServers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Matching Servers ({filteredServers.length})
              </div>
              <div className="space-y-1">
                {filteredServers.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => {
                      onNavigate('infrastructure');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 text-left transition"
                  >
                    <div className="flex items-center space-x-3">
                      <Server className="h-4 w-4 text-emerald-400" />
                      <div>
                        <div className="text-xs font-semibold text-white">{srv.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{srv.hostname || 'VPS'} • {srv.provider}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                      {srv.status.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Applications Match */}
          {filteredApps.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Matching Applications ({filteredApps.length})
              </div>
              <div className="space-y-1">
                {filteredApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      onNavigate('applications');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 text-left transition"
                  >
                    <div className="flex items-center space-x-3">
                      <AppWindow className="h-4 w-4 text-blue-400" />
                      <div>
                        <div className="text-xs font-semibold text-white">{app.appName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{app.repositoryUrl || 'Docker stack'}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono">
                      {app.status.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Incidents Match */}
          {filteredIncidents.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Matching Incidents ({filteredIncidents.length})
              </div>
              <div className="space-y-1">
                {filteredIncidents.map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => {
                      onNavigate('monitoring');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 text-left transition"
                  >
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <div>
                        <div className="text-xs font-semibold text-white">{inc.title}</div>
                        <div className="text-[10px] text-slate-400">{inc.description}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">
                      {inc.severity.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredServers.length === 0 && filteredApps.length === 0 && filteredIncidents.length === 0 && quickNav.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No results found for "{query}". Try searching for servers, apps, or sections.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
