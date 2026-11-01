import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppConfig } from '../types';
import { api } from '../services/api';

const DEFAULT_CONFIG: AppConfig = {
  dashboardWidgets: {
    showKpiMetrics: true,
    showTeamOverviewTable: true,
    showGlobalActivityFeed: true,
    showOverdueAlerts: true,
    showSyncHealthStatus: true,
  },
  visibleTeamFields: ['teamName', 'progress', 'tasksCount', 'latestPending', 'lastUpdated', 'status'],
  categories: [
    'Scientific & Clinical Program',
    'Continuing Medical Education (CME)',
    'Surgical Simulators & Wet-Labs',
    'Medical Exhibition & Pharma Compliance',
    'Venue, Bio-Safety & Infection Control',
    'Delegate Operations & Triage',
  ],
  appSettings: {
    companyName: 'KRITI Medical Congress & Healthcare Summit Operations',
    announcementBanner: '',
    allowTeamHeadReopen: true,
    requireRemarksOnCompletion: false,
  },
};

interface ConfigContextType {
  config: AppConfig;
  isLoading: boolean;
  reloadConfig: () => Promise<void>;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<AppConfig>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getAppConfig();
      if (data) {
        setConfig(data);
      }
    } catch (err) {
      console.warn('Could not fetch app config, falling back to defaults:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = async (partialConfig: Partial<AppConfig>) => {
    const updated = await api.saveAppConfig(partialConfig);
    setConfig(updated);
    return updated;
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        isLoading,
        reloadConfig: fetchConfig,
        updateConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
