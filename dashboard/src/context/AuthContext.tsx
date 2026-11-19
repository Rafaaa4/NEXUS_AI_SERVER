import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, User, Organization } from '../services/api';

interface AuthContextType {
  user: User | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  login: (token: string, refresh: string, user: User, orgs: Organization[]) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexus_access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .getMe()
      .then((data) => {
        setUser(data.user);
        setOrganizations(data.organizations);
        const savedOrgId = localStorage.getItem('nexus_current_org_id');
        const found = data.organizations.find((o) => o.id === savedOrgId) || data.organizations[0];
        if (found) {
          setCurrentOrgState(found);
          localStorage.setItem('nexus_current_org_id', found.id);
        }
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const setCurrentOrg = (org: Organization) => {
    setCurrentOrgState(org);
    localStorage.setItem('nexus_current_org_id', org.id);
  };

  const login = (token: string, refresh: string, userData: User, orgs: Organization[]) => {
    localStorage.setItem('nexus_access_token', token);
    localStorage.setItem('nexus_refresh_token', refresh);
    setUser(userData);
    setOrganizations(orgs);
    if (orgs.length > 0) {
      setCurrentOrgState(orgs[0]);
      localStorage.setItem('nexus_current_org_id', orgs[0].id);
    }
  };

  const logout = () => {
    localStorage.removeItem('nexus_access_token');
    localStorage.removeItem('nexus_refresh_token');
    localStorage.removeItem('nexus_current_org_id');
    setUser(null);
    setOrganizations([]);
    setCurrentOrgState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        setCurrentOrg,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
