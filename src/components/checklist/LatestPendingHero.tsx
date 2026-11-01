import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Sparkles, Check } from 'lucide-react';
import type { Task } from '../../types';
import { getPriorityConfig, isOverdue, formatDate } from '../../utils/helpers';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface LatestPendingHeroProps {
  latestPendingTask: string;
  taskDetails?: Task;
  onComplete?: (taskId: string) => void;
  isUpdating?: boolean;
}

export const LatestPendingHero: React.FC<LatestPendingHeroProps> = ({
  latestPendingTask,
  taskDetails,
  onComplete,
  isUpdating,
}) => {
  const isAllCompleted = latestPendingTask === 'All tasks completed.';
  const isNoTasks = latestPendingTask === 'No tasks assigned yet.';

  if (isAllCompleted) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-card p-4 sm:p-7 min-h-[125px] flex flex-col justify-center">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-15 pointer-events-none">
          <CheckCircle2 className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-semibold">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span>Milestone Achieved</span>
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-100 font-mono">
                100% Completed
              </span>
            </div>
            <h2 className="text-base sm:text-2xl font-bold tracking-tight">All Tasks Completed!</h2>
            <p className="text-emerald-100 text-xs sm:text-sm max-w-xl leading-relaxed">
              Every checklist item for this team has been verified and marked as complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isNoTasks) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center space-y-1.5 min-h-[125px] flex flex-col items-center justify-center">
        <Clock className="w-7 h-7 text-slate-400 mx-auto" />
        <h3 className="text-sm sm:text-base font-semibold text-slate-700">No Tasks Assigned Yet</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md">
          The team checklist is currently empty. An administrator can add tasks via the control actions.
        </p>
      </div>
    );
  }

  const priorityConfig = taskDetails ? getPriorityConfig(taskDetails.priority) : null;
  const overdue = taskDetails ? isOverdue(taskDetails.deadline, taskDetails.status) : false;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary-200/80 bg-gradient-to-br from-white via-indigo-50/30 to-blue-50/40 shadow-card">
      {/* 📱 MOBILE VIEW (< 640px): Ultra-Compact, Fixed-Height Layout (~135px, Zero Layout Shift) */}
      <div className="block sm:hidden p-3.5 space-y-2">
        {/* Top Row: Next Priority Tag + Action Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-600 text-white flex items-center gap-1 uppercase tracking-wider flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Next Priority
            </span>
            {priorityConfig && (
              <Badge className={`${priorityConfig.bg} text-[10px] py-0 px-1.5 flex-shrink-0`}>
                <span className={`w-1 h-1 rounded-full ${priorityConfig.dot}`} />
                {priorityConfig.label}
              </Badge>
            )}
            {overdue && (
              <Badge variant="danger" className="text-[10px] py-0 px-1.5 animate-pulse flex items-center gap-0.5 flex-shrink-0">
                <AlertCircle className="w-2.5 h-2.5" />
                Overdue
              </Badge>
            )}
          </div>

          {taskDetails && onComplete && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onComplete(taskDetails.id)}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              title="Mark this task complete"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Complete</span>
            </button>
          )}
        </div>

        {/* Title: Predictable 2-Line Height Container to Prevent Jumps */}
        <div className="min-h-[2.5rem] flex items-center">
          <h2 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
            {latestPendingTask}
          </h2>
        </div>

        {/* Metadata Footer: Clean Single Row */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
          <div className="flex items-center gap-2 truncate">
            {taskDetails?.deadline && (
              <span className="flex items-center gap-1 text-slate-600">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formatDate(taskDetails.deadline)}</span>
              </span>
            )}
            {taskDetails?.category && (
              <span className="text-slate-400 truncate">
                • {taskDetails.category}
              </span>
            )}
          </div>
          {taskDetails?.assignedTo && (
            <span className="text-slate-600 truncate max-w-[120px] text-right">
              {taskDetails.assignedTo.split('@')[0]}
            </span>
          )}
        </div>
      </div>

      {/* 🖥️ DESKTOP VIEW (>= 640px): Full Spacious Hero Layout */}
      <div className="hidden sm:block p-6 sm:p-7">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary-600 text-white flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Next Priority Task
              </span>
              {priorityConfig && (
                <Badge className={priorityConfig.bg}>
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
                  {priorityConfig.label} Priority
                </Badge>
              )}
              {taskDetails?.category && (
                <Badge variant="outline" className="text-slate-600">
                  {taskDetails.category}
                </Badge>
              )}
              {overdue && (
                <Badge variant="danger" className="animate-pulse flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Overdue
                </Badge>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {latestPendingTask}
            </h2>

            {taskDetails?.description && (
              <p className="text-sm text-slate-600 line-clamp-2">
                {taskDetails.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              {taskDetails?.deadline && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deadline: <strong className="text-slate-700">{formatDate(taskDetails.deadline)}</strong></span>
                </div>
              )}
              {taskDetails?.assignedTo && (
                <div>
                  Assignee: <span className="font-medium text-slate-700">{taskDetails.assignedTo}</span>
                </div>
              )}
            </div>
          </div>

          {taskDetails && onComplete && (
            <div className="flex-shrink-0 w-full md:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-md flex items-center justify-center gap-2"
                onClick={() => onComplete(taskDetails.id)}
                isLoading={isUpdating}
              >
                <Check className="w-4 h-4" />
                <span>Mark This Task Complete</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
