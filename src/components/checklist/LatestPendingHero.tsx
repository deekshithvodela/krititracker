import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, Sparkles, Check } from 'lucide-react';
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white p-6 sm:p-8 shadow-card">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-15">
          <CheckCircle2 className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Milestone Achieved</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">All Tasks Completed!</h2>
            <p className="text-emerald-100 text-sm max-w-xl">
              Every checklist item for this team has been verified and marked as complete. Great execution!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isNoTasks) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-2">
        <Clock className="w-8 h-8 text-slate-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-700">No Tasks Assigned Yet</h3>
        <p className="text-sm text-slate-500">
          The team checklist is currently empty. An administrator can add tasks via the control actions.
        </p>
      </div>
    );
  }

  const priorityConfig = taskDetails ? getPriorityConfig(taskDetails.priority) : null;
  const overdue = taskDetails ? isOverdue(taskDetails.deadline, taskDetails.status) : false;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary-200/80 bg-gradient-to-br from-white via-indigo-50/30 to-blue-50/40 p-6 sm:p-7 shadow-card">
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
  );
};
