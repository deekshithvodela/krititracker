import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  Sliders,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Database,
  ArrowRight,
  Plus,
  CheckSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { api } from '../services/api';
import type { AdminDashboardMetrics, TeamOverview, GlobalActivityItem } from '../types';
import { MetricCard } from '../components/dashboard/MetricCard';
import { TeamOverviewTable } from '../components/dashboard/TeamOverviewTable';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { SyncHealthCard } from '../components/dashboard/SyncHealthCard';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { AdminAddTaskModal } from '../components/checklist/AdminAddTaskModal';
import { AddTeamSheetModal } from '../components/control-centre/AddTeamSheetModal';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [teams, setTeams] = useState<TeamOverview[]>([]);
  const [recentActivity, setRecentActivity] = useState<GlobalActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals for Task and Team/Sheet Creation
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [selectedTeamForTask, setSelectedTeamForTask] = useState<string | undefined>(undefined);
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getAdminDashboard();
      setMetrics(data.metrics);
      setTeams(data.teams);
      setRecentActivity(data.recentActivity);
    } catch (err: any) {
      console.error('Failed to load admin dashboard:', err);
      setError(err.message || 'Failed to connect to Google Sheets backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddTaskForTeam = (teamId: string) => {
    setSelectedTeamForTask(teamId);
    setAddTaskModalOpen(true);
  };

  const widgets = config.dashboardWidgets;

  if (isLoading && !metrics) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Executive Dashboard
            </h1>
            <span className="text-xs px-2 py-0.5 font-bold uppercase rounded-md bg-emerald-100 text-emerald-800">
              Live
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Centralised monitoring across all company teams and Google Sheets checklists.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Add Task Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedTeamForTask(undefined);
              setAddTaskModalOpen(true);
            }}
            className="flex items-center gap-1.5 shadow-sm bg-gradient-to-r from-primary-600 to-indigo-600"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </Button>

          {/* 2. Add Team & Sheet Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddTeamModalOpen(true)}
            className="flex items-center gap-1.5 border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/80"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add Team & Sheet</span>
          </Button>

          {/* 3. Control Centre Navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/control-centre')}
            className="flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Control Centre</span>
            <span className="sm:hidden">Control Centre</span>
          </Button>

          {/* 4. Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="flex items-center gap-1.5"
            title="Refresh dashboard data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadData}>
            Retry Connection
          </Button>
        </div>
      )}

      {/* KPI Metric Cards (Rendered if enabled in Dynamic Control Centre) */}
      {widgets.showKpiMetrics && metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Overall Completion"
            value={`${metrics.overallCompletionPercentage}%`}
            subtitle={`${metrics.completedTasks} of ${metrics.totalTasks} total tasks completed`}
            icon={TrendingUp}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
          />

          <MetricCard
            title="Teams Monitored"
            value={metrics.totalTeams}
            subtitle={`${metrics.teamsWithAllTasksCompleted} completed • ${metrics.teamsWithPendingTasks} in progress`}
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />

          <MetricCard
            title="Completed Deliverables"
            value={metrics.completedTasks}
            subtitle="Verified across individual team sheets"
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />

          <MetricCard
            title="Pending Items"
            value={metrics.pendingTasks}
            subtitle="Immediate priority tasks remaining"
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>
      )}

      {/* Centralised Overview Table (Rendered if enabled) */}
      {widgets.showTeamOverviewTable && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Team Progress Overview</h2>
            <span className="text-xs text-slate-400 font-medium">Click any row to open team checklist</span>
          </div>
          <TeamOverviewTable
            teams={teams}
            visibleFields={config.visibleTeamFields}
            onAddTaskForTeam={handleOpenAddTaskForTeam}
            onAddTeam={() => setAddTeamModalOpen(true)}
          />
        </div>
      )}

      {/* Grid: Global Activity & Sync Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {widgets.showGlobalActivityFeed && (
          <div className="lg:col-span-2">
            <ActivityFeed activities={recentActivity} />
          </div>
        )}

        {widgets.showSyncHealthStatus && (
          <div className={widgets.showGlobalActivityFeed ? 'lg:col-span-1' : 'lg:col-span-3'}>
            <SyncHealthCard onReconcileComplete={loadData} />
          </div>
        )}
      </div>

      {/* Global Add Task Modal */}
      <AdminAddTaskModal
        isOpen={addTaskModalOpen}
        onClose={() => setAddTaskModalOpen(false)}
        teams={teams}
        initialTeamId={selectedTeamForTask}
        onTaskCreated={loadData}
      />

      {/* Global Add Team & Sheet Modal */}
      <AddTeamSheetModal
        isOpen={addTeamModalOpen}
        onClose={() => setAddTeamModalOpen(false)}
        currentTeamCount={teams.length}
        onTeamCreated={loadData}
      />
    </div>
  );
};
