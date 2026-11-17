import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Server, Building, LogOut, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, organizations, currentOrg, setCurrentOrg, logout } = useAuth();

  return (
    <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
          <Server className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-wide text-white">NEXUS</span>
          <span className="text-blue-500 font-semibold ml-1 text-sm bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            AI
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Organization Switcher */}
        {currentOrg && (
          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm">
            <Building className="h-4 w-4 text-slate-400" />
            <select
              value={currentOrg.id}
              onChange={(e) => {
                const found = organizations.find((o) => o.id === e.target.value);
                if (found) setCurrentOrg(found);
              }}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id} className="bg-slate-900 text-slate-200">
                  {org.name} ({org.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-200">{user?.fullName || user?.email}</div>
            <div className="text-xs text-slate-400 flex items-center justify-end space-x-1">
              <Shield className="h-3 w-3 text-emerald-400" />
              <span>{currentOrg?.role?.toUpperCase() || 'MEMBER'}</span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};
