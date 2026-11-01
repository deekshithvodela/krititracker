import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TaskPriority, TaskStatus, TeamStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isOverdue(deadline: string, status: TaskStatus): boolean {
  if (!deadline || status === 'Completed') return false;
  const deadlineDate = new Date(deadline);
  // Compare against beginning of today in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function getPriorityConfig(priority: TaskPriority) {
  switch (priority) {
    case 'Critical':
      return {
        label: 'Critical',
        bg: 'bg-rose-50 border-rose-200 text-rose-700',
        dot: 'bg-rose-500',
      };
    case 'High':
      return {
        label: 'High',
        bg: 'bg-amber-50 border-amber-200 text-amber-700',
        dot: 'bg-amber-500',
      };
    case 'Medium':
      return {
        label: 'Medium',
        bg: 'bg-blue-50 border-blue-200 text-blue-700',
        dot: 'bg-blue-500',
      };
    case 'Low':
    default:
      return {
        label: 'Low',
        bg: 'bg-slate-50 border-slate-200 text-slate-600',
        dot: 'bg-slate-400',
      };
  }
}

export function getTeamStatusConfig(status?: TeamStatus) {
  switch (status) {
    case 'Active':
      return {
        label: 'Active',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'Deactivated':
      return {
        label: 'Deactivated',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'Archived':
      return {
        label: 'Archived',
        bg: 'bg-slate-100 text-slate-600 border-slate-300',
        dot: 'bg-slate-400',
      };
    default:
      return {
        label: 'Active',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
  }
}

export function getProgressBarColor(percentage: number): string {
  if (percentage === 100) return 'bg-emerald-500';
  if (percentage >= 70) return 'bg-indigo-600';
  if (percentage >= 35) return 'bg-blue-500';
  if (percentage > 0) return 'bg-amber-500';
  return 'bg-slate-300';
}
