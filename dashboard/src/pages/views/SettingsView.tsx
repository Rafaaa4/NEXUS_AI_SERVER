import React from 'react';
import { Sliders, Building, Key, Shield, AlertTriangle, Briefcase, Terminal } from 'lucide-react';
import { Organization } from '../../services/api';
import { useMode } from '../../context/ModeContext';

interface Props {
  currentOrg: Organization | null;
}

export const SettingsView: React.FC<Props> = ({ currentOrg }) => {
  const { mode, toggleMode, isBusiness } = useMode();

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
            <Sliders className="h-4 w-4" />
            <span>Tenant & Platform Configuration</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Organization Settings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your organization profile, default dashboard mode, and API access tokens.
          </p>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white">Company & Organization Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-400 mb-1">Organization Name</label>
            <input
              type="text"
              readOnly
              value={currentOrg?.name || ''}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-400 mb-1">Organization Slug</label>
            <input
              type="text"
              readOnly
              value={currentOrg?.slug || ''}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-400 mb-1">Tenant ID (UUID)</label>
            <input
              type="text"
              readOnly
              value={currentOrg?.id || ''}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-mono text-[11px]"
            />
          </div>
        </div>
      </div>

      {/* Mode Preferences */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white">Interface Experience Mode</h3>
        <p className="text-xs text-slate-400">
          Choose between Business Owner Mode (simplified, plain English) and Advanced Mode (raw metrics and terminal logs).
        </p>

        <div className="flex items-center space-x-4 pt-2">
          <button
            onClick={toggleMode}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold border flex items-center space-x-2 transition ${
              isBusiness
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {isBusiness ? <Briefcase className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
            <span>Active: {isBusiness ? 'Business Owner Mode' : 'Technical Advanced Mode'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
