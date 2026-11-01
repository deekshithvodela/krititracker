import type {
  Task,
  ActivityLogItem,
  GlobalActivityItem,
  TeamOverview,
  UserProfile,
  UserRole,
  TeamStatus,
  AppConfig,
} from '../../src/types';

export interface SheetRowTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: string;
  deadline: string;
  status: string;
  remarks: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
  category: string;
  isMandatory: boolean;
}

export interface SheetRowTeamOverview {
  teamId: string;
  teamName: string;
  spreadsheetId: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  latestPendingTask: string;
  lastUpdated: string;
  status: TeamStatus;
  department: string;
  headEmail: string;
  description: string;
}

export interface SheetRowUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  teamId: string;
  active: boolean;
}

export interface SheetRowConfig {
  key: string;
  value: string;
  description: string;
  lastUpdated: string;
  updatedBy: string;
}

export interface AuthUserContext {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string;
}

export interface SyncResult {
  teamId: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  latestPendingTask: string;
  masterSynced: boolean;
  error?: string;
}
