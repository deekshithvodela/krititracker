import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Users,
  Layers,
  LayoutGrid,
  Settings,
  History,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import type { TeamOverview, GlobalActivityItem } from '../types';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { TeamManager } from '../components/control-centre/TeamManager';
import { CategoryManager } from '../components/control-centre/CategoryManager';
import { WidgetCustomiser } from '../components/control-centre/WidgetCustomiser';
import { AppSettingsForm } from '../components/control-centre/AppSettingsForm';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';

export const AdminControlCentre: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState<TeamOverview[]>([]);
  const [auditLogs, setAuditLogs] = useState<GlobalActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [teamsData, logsData] = await Promise.all([
        api.getTeams(),
        api.getAdminActivity(100),
      ]);
      setTeams(teamsData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error('Error loading Control Centre data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { id: 'teams', label: 'Teams Registry', icon: <Users className="w-4 h-4" />, badge: teams.length },
    { id: 'categories', label: 'Checklist Categories', icon: <Layers className="w-4 h-4" /> },
    { id: 'widgets', label: 'Dashboard Layout', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'settings', label: 'Governance & Branding', icon: <Settings className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" />, badge: auditLogs.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Control Centre
            </h1>
            <span className="text-xs px-2 py-0.5 font-bold uppercase rounded-md bg-purple-100 text-purple-800">
              Config-Driven
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage teams, checklist categories, dashboard widgets, and application governance without modifying source code.
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'teams' && (
          <TeamManager teams={teams} onTeamUpdated={loadData} />
        )}

        {activeTab === 'categories' && <CategoryManager />}

        {activeTab === 'widgets' && <WidgetCustomiser />}

        {activeTab === 'settings' && <AppSettingsForm />}

        {activeTab === 'audit' && (
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Administrative Audit Trail</h3>
                <p className="text-xs text-slate-500">
                  Chronological record of task updates, configuration edits, and team adjustments across all spreadsheets.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={loadData}>
                Refresh Logs
              </Button>
            </div>
            <ActivityFeed activities={auditLogs} />
          </div>
        )}
      </div>
    </div>
  );
};
