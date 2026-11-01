import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  MessageSquare,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  User,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import type { Task } from '../../types';
import { getPriorityConfig, isOverdue, formatDate, formatDateTime } from '../../utils/helpers';
import { Badge } from '../ui/Badge';

interface ChecklistItemProps {
  task: Task;
  canEditStatus: boolean;
  canManageTasks: boolean;
  onToggleStatus: (taskId: string, newStatus: 'Pending' | 'Completed') => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onOpenRemarks?: (task: Task) => void;
  onMoveUp?: (taskId: string) => void;
  onMoveDown?: (taskId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  task,
  canEditStatus,
  canManageTasks,
  onToggleStatus,
  onEditTask,
  onDeleteTask,
  onOpenRemarks,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  const isCompleted = task.status === 'Completed';
  const priorityConfig = getPriorityConfig(task.priority);
  const overdue = isOverdue(task.deadline, task.status);

  return (
    <div
      className={`group rounded-xl border transition-all ${
        isCompleted
          ? 'bg-slate-50/70 border-slate-200 opacity-90'
          : 'bg-white border-slate-200/80 shadow-subtle hover:border-slate-300 hover:shadow-card'
      }`}
    >
      <div className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Checkbox & Display Order */}
        <div className="flex items-center gap-3">
          {/* Touch-friendly checkbox target (min 44x44px container) */}
          <button
            type="button"
            disabled={!canEditStatus}
            onClick={() => onToggleStatus(task.id, isCompleted ? 'Pending' : 'Completed')}
            className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              canEditStatus ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-60'
            }`}
            title={canEditStatus ? (isCompleted ? 'Mark as incomplete' : 'Mark as complete') : 'Read-only access'}
          >
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                isCompleted
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border-2 border-slate-300 bg-white group-hover:border-primary-500'
              }`}
            >
              {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </button>

          <span className="text-xs font-semibold text-slate-400 font-mono w-6 text-center hidden sm:inline-block">
            #{task.displayOrder}
          </span>
        </div>

        {/* Center: Title, Meta, Badges */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`text-sm sm:text-base font-semibold leading-snug break-words ${
                isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
              }`}
            >
              {task.title}
            </span>

            <Badge className={priorityConfig.bg}>
              <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
              {priorityConfig.label}
            </Badge>

            {task.category && (
              <Badge variant="outline" className="text-slate-600 bg-slate-50 text-[10px]">
                {task.category}
              </Badge>
            )}

            {task.isMandatory === false && (
              <Badge variant="outline" className="text-slate-500 text-[10px] border-dashed">
                Optional
              </Badge>
            )}

            {overdue && (
              <Badge variant="danger" className="text-[10px]">
                <AlertCircle className="w-3 h-3 mr-0.5" />
                Overdue
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {task.deadline && (
              <span className={`flex items-center gap-1 ${overdue ? 'text-rose-600 font-semibold' : ''}`}>
                <Clock className="w-3 h-3" />
                Due {formatDate(task.deadline)}
              </span>
            )}
            {task.assignedTo && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                {task.assignedTo}
              </span>
            )}
            {task.remarks && (
              <button
                onClick={() => onOpenRemarks && onOpenRemarks(task)}
                className="flex items-center gap-1 text-primary-600 hover:underline max-w-xs truncate"
              >
                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                <span className="truncate italic">"{task.remarks}"</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions & Expand Button */}
        <div className="flex items-center gap-1.5">
          {onOpenRemarks && (
            <button
              onClick={() => onOpenRemarks(task)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Add or view remarks"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}

          {canManageTasks && (
            <div className="relative">
              <button
                onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Admin actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {actionsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setActionsMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white border border-slate-200 shadow-hover py-1 z-30 text-xs">
                    {onEditTask && (
                      <button
                        onClick={() => {
                          setActionsMenuOpen(false);
                          onEditTask(task);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        Edit Task
                      </button>
                    )}
                    {onMoveUp && !isFirst && (
                      <button
                        onClick={() => {
                          setActionsMenuOpen(false);
                          onMoveUp(task.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                        Move Up
                      </button>
                    )}
                    {onMoveDown && !isLast && (
                      <button
                        onClick={() => {
                          setActionsMenuOpen(false);
                          onMoveDown(task.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                        Move Down
                      </button>
                    )}
                    {onDeleteTask && (
                      <button
                        onClick={() => {
                          setActionsMenuOpen(false);
                          if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Task
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Always-Visible Expand / Collapse Chevron Button */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={`p-2 rounded-lg transition-all ${
              expanded
                ? 'bg-slate-100 text-slate-800 shadow-xs'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title={expanded ? 'Collapse task details' : 'Expand task details'}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-primary-600" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Rich Expandable Deliverable Details Drawer */}
      {expanded && (
        <div className="px-4 sm:px-6 pb-5 pt-3 border-t border-slate-100 bg-slate-50/70 rounded-b-xl space-y-3.5 text-xs text-slate-600 animate-in fade-in slide-in-from-top-1">
          {/* Section 1: Detailed Description / Scope */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary-600" />
                <span>Deliverable Scope & Specifications</span>
              </span>
              {canManageTasks && onEditTask && (
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="text-primary-600 hover:text-primary-800 font-semibold text-[11px] flex items-center gap-1 hover:underline"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            {task.description?.trim() ? (
              <div className="p-3 rounded-lg bg-white border border-slate-200/80 text-slate-700 leading-relaxed whitespace-pre-line shadow-2xs">
                {task.description}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-white/70 border border-dashed border-slate-200 text-slate-400 italic flex items-center justify-between text-xs">
                <span>No extended description provided for this deliverable.</span>
                {canManageTasks && onEditTask && (
                  <button
                    type="button"
                    onClick={() => onEditTask(task)}
                    className="text-xs font-semibold text-primary-600 hover:underline not-italic"
                  >
                    + Add Scope Notes
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Task Identifier</span>
              <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block truncate">{task.id}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Milestone Type</span>
              <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                {task.isMandatory === false ? 'Optional Task' : 'Mandatory (Required)'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Owner</span>
              <span className="font-semibold text-slate-800 text-xs mt-0.5 block truncate" title={task.assignedTo || 'Unassigned'}>
                {task.assignedTo || 'Unassigned'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Deadline</span>
              <span className={`font-semibold text-xs mt-0.5 block ${overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatDate(task.deadline)} {overdue ? '(Overdue)' : ''}
              </span>
            </div>
          </div>

          {/* Section 3: Audit Remarks & Lifecycle Timestamps Footer */}
          <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Created {formatDateTime(task.createdAt)}</span>
              {task.completedAt ? (
                <>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Completed {formatDateTime(task.completedAt)}
                  </span>
                </>
              ) : (
                <>
                  <span>•</span>
                  <span className="text-amber-700 font-medium">Pending Execution</span>
                </>
              )}
            </div>

            {task.remarks && (
              <div className="flex items-center gap-1 text-slate-700">
                <span className="font-semibold text-slate-500">Remarks:</span>
                <span className="italic">"{task.remarks}"</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
