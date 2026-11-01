export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Pending' | 'Completed';
export type UserRole = 'admin' | 'team_head' | 'viewer';
export type TeamStatus = 'Active' | 'Deactivated' | 'Archived';

export interface Task {
  id: string;             // e.g. TASK-01-001
  title: string;
  description: string;
  assignedTo?: string;
  priority: TaskPriority;
  deadline: string;       // YYYY-MM-DD
  status: TaskStatus;
  remarks: string;
  displayOrder: number;
  createdAt: string;      // ISO string
  updatedAt: string;      // ISO string
  completedAt?: string;   // ISO string or empty
  category?: string;      // e.g. "Core Deliverables", "Quality Assurance", "Deployment"
  isMandatory?: boolean;  // Default true
}

export interface ActivityLogItem {
  id: string;
  taskId: string;
  action: 'TASK_CREATED' | 'STATUS_CHANGED' | 'TASK_EDITED' | 'REMARKS_UPDATED' | 'TASK_DELETED' | 'TASKS_REORDERED';
  previousValue?: string;
  newValue?: string;
  performedBy: string;
  timestamp: string;      // ISO string
}

export interface GlobalActivityItem {
  id: string;
  teamId: string;
  teamName?: string;
  taskId: string;
  action: string;
  user: string;
  timestamp: string;
}

export interface TeamOverview {
  id: string;             // e.g. team-01
  name: string;           // e.g. Engineering
  spreadsheetId: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  latestPendingTask: string;
  lastUpdated: string;
  status: TeamStatus;
  department?: string;
  headEmail?: string;
  description?: string;
  hasOverdueTasks?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string;         // 'all' for admin, or 'team-01'..'team-12'
  active: boolean;
}

export interface AuthSession {
  user: UserProfile;
  expiresAt: number;
}

export interface AdminDashboardMetrics {
  totalTeams: number;
  teamsWithPendingTasks: number;
  teamsWithAllTasksCompleted: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overallCompletionPercentage: number;
  teamsWithOverdueTasks: number;
}

// -----------------------------------------------------------------------------
// Dynamic Configuration Types
// -----------------------------------------------------------------------------

export interface DashboardWidgetsConfig {
  showKpiMetrics: boolean;
  showTeamOverviewTable: boolean;
  showGlobalActivityFeed: boolean;
  showOverdueAlerts: boolean;
  showSyncHealthStatus: boolean;
}

export interface AppSettings {
  companyName: string;
  announcementBanner?: string;
  allowTeamHeadReopen: boolean;
  requireRemarksOnCompletion: boolean;
}

export interface AppConfig {
  dashboardWidgets: DashboardWidgetsConfig;
  visibleTeamFields: string[]; // e.g. ['teamName', 'progress', 'tasksCount', 'latestPending', 'lastUpdated', 'status']
  categories: string[];        // Task categories/sections
  appSettings: AppSettings;
  lastUpdated?: string;
  updatedBy?: string;
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
