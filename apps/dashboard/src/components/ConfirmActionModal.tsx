import React from 'react';
import { AlertTriangle, ShieldCheck, X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  impactDescription?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmActionModal: React.FC<Props> = ({
  isOpen,
  title,
  description,
  riskLevel = 'medium',
  impactDescription,
  confirmLabel = 'Confirm & Authorize',
  loading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const riskColors = {
    low: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    medium: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    high: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    critical: 'bg-rose-600/20 border-rose-600/40 text-rose-300 font-bold',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase ${riskColors[riskLevel]}`}>
                Risk Level: {riskLevel}
              </span>
              <span className="text-slate-500 text-xs">• Zero Remote Shell Execution</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">{description}</p>

        {impactDescription && (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 mb-6 space-y-1">
            <span className="font-semibold text-slate-200">Expected System Impact:</span>
            <p>{impactDescription}</p>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{loading ? 'Executing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
