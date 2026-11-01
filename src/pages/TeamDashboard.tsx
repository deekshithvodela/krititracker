import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  History,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import type { Task, ActivityLogItem, TeamOverview } from '../types';
import { getProgressBarColor } from '../utils/helpers';
import { LatestPendingHero } from '../components/checklist/LatestPendingHero';
import { ChecklistItem } from '../components/checklist/ChecklistItem';
import { TaskFormModal } from '../components/checklist/TaskFormModal';
import { RemarksModal } from '../components/checklist/RemarksModal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

export const TeamDashboard: React.FC = () => {
  const { teamId: paramTeamId } = useParams<{ teamId: string }>();
  const { user, isAdmin, isViewer, assignedTeamId } = useAuth();
  const navigate = useNavigate();

  // If user is a Team Head or Viewer, ensure they can only view their assigned team
  const targetTeamId = paramTeamId || assignedTeamId || 'team-01';

  const [teamMeta, setTeamMeta] = useState<TeamOverview | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<{
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionPercentage: number;
    latestPendingTask: string;
  } | null>(null);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedTaskForRemarks, setSelectedTaskForRemarks] = useState<Task | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const canEditStatus = !isViewer && (isAdmin || assignedTeamId === targetTeamId);
  const canManageTasks = !isViewer && (isAdmin || assignedTeamId === targetTeamId);

  const loadTeamData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [overviewData, tasksData] = await Promise.all([
        api.getTeamOverview(targetTeamId).catch(() => null),
        api.getTeamTasks(targetTeamId),
      ]);
      setTeamMeta(overviewData);
      setTasks(tasksData.tasks);
      setMetrics(tasksData.metrics);
      setActivity(tasksData.activity || []);
    } catch (err: any) {
      console.error('Error fetching team checklist:', err);
      setError(err.message || 'Failed to fetch team data.');
    } finally {
      setIsLoading(false);
    }
  }, [targetTeamId]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  // Handle task status toggle (Pending <-> Completed) with optimistic UI update
  const handleToggleStatus = async (taskId: string, newStatus: 'Pending' | 'Completed') => {
    if (!canEditStatus) return;

    // Optimistic UI update
    const previousTasks = [...tasks];
    const target = tasks.find(t => t.id === taskId);
    if (!target) return;

    const updatedTasks = tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            status: newStatus,
            completedAt: newStatus === 'Completed' ? new Date().toISOString() : undefined,
          }
        : t
    );
    setTasks(updatedTasks);
    setIsUpdatingStatus(true);

    try {
      const response = await api.updateTaskStatus(targetTeamId, taskId, newStatus);
      // Update with server confirmed data
      setMetrics(response.metrics);
      loadTeamData(); // Refresh to catch fresh activity and latest pending task
    } catch (err: any) {
      // Rollback on failure
      setTasks(previousTasks);
      alert(`Status update failed: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Reordering: Move up or down
  const handleMove = async (taskId: string, direction: 'up' | 'down') => {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === tasks.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...tasks];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);

    const orderedIds = reordered.map(t => t.id);
    setTasks(reordered);

    try {
      await api.reorderTasks(targetTeamId, orderedIds);
      loadTeamData();
    } catch (err: any) {
      alert(`Reordering failed: ${err.message}`);
      loadTeamData();
    }
  };

  // Save / Update Remarks
  const handleSaveRemarks = async (newRemarks: string) => {
    if (!selectedTaskForRemarks) return;
    try {
      await api.updateTaskStatus(
        targetTeamId,
        selectedTaskForRemarks.id,
        selectedTaskForRemarks.status,
        newRemarks
      );
      loadTeamData();
    } catch (err: any) {
      alert(`Failed to save remarks: ${err.message}`);
    }
  };

  // Save / Create Task (Admin only)
  const handleSaveTask = async (data: Partial<Task>) => {
    if (selectedTaskForEdit) {
      await api.editTask(targetTeamId, selectedTaskForEdit.id, data);
    } else {
      await api.createTask(targetTeamId, data);
    }
    loadTeamData();
  };

  // Delete Task (Admin only)
  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(targetTeamId, taskId);
      loadTeamData();
    } catch (err: any) {
      alert(`Failed to delete task: ${err.message}`);
    }
  };

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Status
      if (statusFilter === 'pending' && t.status !== 'Pending') return false;
      if (statusFilter === 'completed' && t.status !== 'Completed') return false;

      // Category
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          (t.assignedTo && t.assignedTo.toLowerCase().includes(query)) ||
          t.remarks.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, categoryFilter, searchQuery]);

  // Identify categories present in tasks
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    tasks.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [tasks]);

  // Find taskDetails for the latest pending task
  const latestPendingTaskObj = useMemo(() => {
    return tasks.find(t => t.status === 'Pending');
  }, [tasks]);

  if (isLoading && tasks.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-40 bg-slate-200 rounded-2xl" />
        <div className="h-80 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation & Header */}
      <div>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Dashboard</span>
          </button>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-800 uppercase">
                {targetTeamId}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {teamMeta?.name || `Team ${targetTeamId.replace('team-', '')}`}
              </h1>
            </div>
            {teamMeta?.description && (
              <p className="text-sm text-slate-500 mt-1">{teamMeta.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTeamData}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh</span>
            </Button>

            {canManageTasks && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedTaskForEdit(null);
                  setTaskFormOpen(true);
                }}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadTeamData}>
            Retry
          </Button>
        </div>
      )}

      {/* Progress Bar Summary Card */}
      {metrics && (
        <Card className="p-5 bg-white border border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Team Completion Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {metrics.completionPercentage}%
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({metrics.completedTasks} of {metrics.totalTasks} items completed)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{metrics.completedTasks} Completed</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{metrics.pendingTasks} Pending</span>
              </div>
            </div>
          </div>

          <div className="mt-4 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                metrics.completionPercentage
              )}`}
              style={{ width: `${metrics.completionPercentage}%` }}
            />
          </div>
        </Card>
      )}

      {/* 🎯 Prominent Latest Pending Task Hero Card */}
      <LatestPendingHero
        latestPendingTask={metrics?.latestPendingTask || 'No tasks assigned yet.'}
        taskDetails={latestPendingTaskObj}
        onComplete={canEditStatus ? id => handleToggleStatus(id, 'Completed') : undefined}
        isUpdating={isUpdatingStatus}
      />

      {/* Checklist Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">Task Deliverables</h2>
            <Badge variant="outline" className="font-mono text-xs">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </Badge>
            {canManageTasks && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedTaskForEdit(null);
                  setTaskFormOpen(true);
                }}
                className="flex items-center gap-1.5 py-1 px-3 text-xs shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </Button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold mr-2 uppercase">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pending ({tasks.filter(t => t.status === 'Pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Completed ({tasks.filter(t => t.status === 'Completed').length})
          </button>

          {/* Category Dropdown if categories exist */}
          {availableCategories.length > 1 && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="ml-auto text-xs py-1 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Checklist List */}
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
              <div>
                <p className="font-semibold text-slate-700">No tasks found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {tasks.length === 0 ? 'This team checklist has no tasks yet.' : 'Try resetting the filter or search query.'}
                </p>
              </div>
              {canManageTasks && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedTaskForEdit(null);
                    setTaskFormOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Task</span>
                </Button>
              )}
            </div>
          ) : (
            filteredTasks.map((task, idx) => (
              <ChecklistItem
                key={task.id}
                task={task}
                canEditStatus={canEditStatus}
                canManageTasks={canManageTasks}
                onToggleStatus={handleToggleStatus}
                onEditTask={t => {
                  setSelectedTaskForEdit(t);
                  setTaskFormOpen(true);
                }}
                onDeleteTask={handleDeleteTask}
                onOpenRemarks={t => {
                  setSelectedTaskForRemarks(t);
                  setRemarksModalOpen(true);
                }}
                onMoveUp={canManageTasks ? id => handleMove(id, 'up') : undefined}
                onMoveDown={canManageTasks ? id => handleMove(id, 'down') : undefined}
                isFirst={idx === 0}
                isLast={idx === filteredTasks.length - 1}
              />
            ))
          )}
        </div>
      </div>

      {/* Task Creation & Editing Modal (Admin only) */}
      <TaskFormModal
        isOpen={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        task={selectedTaskForEdit}
        onSave={handleSaveTask}
      />

      {/* Remarks Modal */}
      <RemarksModal
        isOpen={remarksModalOpen}
        onClose={() => setRemarksModalOpen(false)}
        taskTitle={selectedTaskForRemarks?.title || ''}
        initialRemarks={selectedTaskForRemarks?.remarks}
        onSave={handleSaveRemarks}
      />
    </div>
  );
};
