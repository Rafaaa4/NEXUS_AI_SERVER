import React, { createContext, useContext, useState, useEffect } from 'react';

export type DashboardMode = 'business' | 'advanced';

interface ModeContextType {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  toggleMode: () => void;
  isBusiness: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<DashboardMode>(() => {
    const saved = localStorage.getItem('nexus_dashboard_mode');
    return (saved as DashboardMode) || 'business'; // Defaults to Business Mode for Company Owners
  });

  const setMode = (newMode: DashboardMode) => {
    setModeState(newMode);
    localStorage.setItem('nexus_dashboard_mode', newMode);
  };

  const toggleMode = () => {
    setMode(mode === 'business' ? 'advanced' : 'business');
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode, isBusiness: mode === 'business' }}>
      {children}
    </ModeContext.Provider>
  );
};

export const useMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};
