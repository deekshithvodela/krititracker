import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FolderKanban,
  Plus,
  FileSpreadsheet,
} from 'lucide-react';
import type { TeamOverview } from '../../types';
import { getProgressBarColor, getTeamStatusConfig, formatDateTime } from '../../utils/helpers';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface TeamOverviewTableProps {
  teams: TeamOverview[];
  visibleFields?: string[];
  onAddTaskForTeam?: (teamId: string) => void;
  onAddTeam?: () => void;
}

export const TeamOverviewTable: React.FC<TeamOverviewTableProps> = ({
  teams,
  visibleFields,
  onAddTaskForTeam,
  onAddTeam,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      // Search query
      const matchesSearch =
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.latestPendingTask.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (team.department && team.department.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filters
      if (filterType === 'completed') {
        return team.totalTasks > 0 && team.completedTasks === team.totalTasks;
      }
      if (filterType === 'in_progress') {
        return team.completedTasks > 0 && team.completedTasks < team.totalTasks;
      }
      if (filterType === 'not_started') {
        return team.completedTasks === 0;
      }

      return true;
    });
  }, [teams, searchQuery, filterType]);

  const getTeamMonogram = (team: TeamOverview) => {
    const numMatch = team.name.match(/\b(?:Team\s*)?(\d{1,3})\b/i) || team.id.match(/(\d{1,3})/);
    if (numMatch && numMatch[1]) {
      return numMatch[1].padStart(2, '0');
    }
    const clean = team.id.replace(/^team-/, '').replace(/[^a-zA-Z]/g, '');
    return (clean.slice(0, 2) || team.name.slice(0, 2) || 'TM').toUpperCase();
  };

  const filterTabs = [
    { id: 'all', label: `All Teams (${teams.length})` },
    {
      id: 'in_progress',
      label: `In Progress (${teams.filter(t => t.completedTasks > 0 && t.completedTasks < t.totalTasks).length})`,
    },
    {
      id: 'completed',
      label: `Completed (${teams.filter(t => t.totalTasks > 0 && t.completedTasks === t.totalTasks).length})`,
    },
    {
      id: 'not_started',
      label: `Not Started (${teams.filter(t => t.completedTasks === 0).length})`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Controls: Search, Filter Tabs and Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterTabs.map(tab => {
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar & Quick Add */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search team name, department..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {onAddTeam && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddTeam}
              className="hidden md:flex items-center gap-1.5 text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Add Team & Sheet</span>
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Team</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4 w-44">Progress</th>
              <th className="py-3 px-4 text-center">Tasks</th>
              <th className="py-3 px-4">Latest Pending Deliverable</th>
              <th className="py-3 px-4">Last Synced</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600 font-normal">
            {filteredTeams.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <FolderKanban className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No teams found matching search criteria</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting your filter or search term.</p>
                </td>
              </tr>
            ) : (
              filteredTeams.map(team => {
                const isCompleted = team.totalTasks > 0 && team.completedTasks === team.totalTasks;

                return (
                  <tr
                    key={team.id}
                    onClick={() => navigate(`/teams/${team.id}`)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                  >
                    {/* Team Name */}
                    <td className="py-4 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 font-bold flex items-center justify-center text-xs font-mono group-hover:bg-primary-600 group-hover:text-white transition-all flex-shrink-0 select-none overflow-hidden">
                          {getTeamMonogram(team)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors truncate">
                            {team.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{team.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                        {team.department || 'General'}
                      </span>
                    </td>

                    {/* Progress Bar & Percentage */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span className="font-mono text-slate-900">{team.completionPercentage}%</span>
                          {isCompleted && (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase">Done</span>
                          )}
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                              team.completionPercentage
                            )}`}
                            style={{ width: `${team.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Tasks Count */}
                    <td className="py-4 px-4 text-center font-mono">
                      <span className="font-semibold text-slate-800">{team.completedTasks}</span>
                      <span className="text-slate-400"> / {team.totalTasks}</span>
                    </td>

                    {/* Latest Pending Task */}
                    <td className="py-4 px-4 max-w-xs">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> All tasks completed
                        </span>
                      ) : team.totalTasks === 0 ? (
                        <span className="text-slate-400 italic text-[11px]">No tasks assigned</span>
                      ) : (
                        <span className="font-medium text-slate-800 line-clamp-1 group-hover:text-primary-700">
                          {team.latestPendingTask}
                        </span>
                      )}
                    </td>

                    {/* Last Updated */}
                    <td className="py-4 px-4 text-slate-500 text-[11px]">
                      {formatDateTime(team.lastUpdated)}
                    </td>

                    {/* Actions: + Task and View Checklist */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        {onAddTaskForTeam && (
                          <button
                            type="button"
                            onClick={() => onAddTaskForTeam(team.id)}
                            className="px-2 py-1 rounded-md text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 flex items-center gap-1 transition-colors"
                            title="Add task to this team"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Task</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/teams/${team.id}`)}
                          className="p-1.5 rounded-lg text-slate-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-colors"
                          title="View checklist"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Dynamic Scaling Banner: Extend to any number of teams & sheets */}
      {onAddTeam && (
        <div className="p-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs">Dynamic Multi-Team & Google Sheets Scaling</p>
              <p className="text-[11px] text-slate-500">
                Currently tracking <span className="font-bold text-indigo-700">{teams.length} teams</span> across individual Google Spreadsheets. Extend the system to any number of teams dynamically.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onAddTeam}
            className="border-indigo-300 text-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 bg-white text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add Another Team & Sheet</span>
          </Button>
        </div>
      )}

      {/* Mobile Card View (Optimized for small screens) */}
      <div className="lg:hidden space-y-3">
        {filteredTeams.length === 0 ? (
          <div className="py-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            <p className="text-sm font-semibold">No teams found</p>
          </div>
        ) : (
          filteredTeams.map(team => {
            const isCompleted = team.totalTasks > 0 && team.completedTasks === team.totalTasks;
            return (
              <Card
                key={team.id}
                onClick={() => navigate(`/teams/${team.id}`)}
                className="p-4 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 font-bold flex items-center justify-center text-xs font-mono flex-shrink-0 select-none">
                      {getTeamMonogram(team)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                          {team.id}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{team.department || 'General'}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-0.5 truncate">{team.name}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {onAddTaskForTeam && (
                      <button
                        type="button"
                        onClick={() => onAddTaskForTeam(team.id)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 flex items-center gap-1 transition-colors active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Task</span>
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Completion Progress</span>
                    <span className="font-mono font-bold text-slate-800">
                      {team.completedTasks} / {team.totalTasks} ({team.completionPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getProgressBarColor(team.completionPercentage)}`}
                      style={{ width: `${team.completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex-1 min-w-0 truncate">
                    <span className="font-medium text-slate-700">Next: </span>
                    <span className="truncate">{team.latestPendingTask}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                    {formatDateTime(team.lastUpdated)}
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
