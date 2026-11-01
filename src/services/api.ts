import type {
  ApiResponse,
  Task,
  TaskStatus,
  TeamOverview,
  UserProfile,
  AdminDashboardMetrics,
  GlobalActivityItem,
  ActivityLogItem,
  AppConfig,
  SyncResult,
} from '../types';
import { mockApi, isDevBypassEnabled } from './mockApi';

let cachedCsrfToken: string | null = null;

export function setCsrfToken(token: string) {
  cachedCsrfToken = token;
}

export function getCsrfToken(): string | null {
  return cachedCsrfToken;
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers || {});

  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
    if (cachedCsrfToken) {
      headers.set('x-csrf-token', cachedCsrfToken);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (data?.data?.csrfToken) {
    setCsrfToken(data.data.csrfToken);
  }

  if (!res.ok) {
    let errorMsg = data?.error;
    if (!errorMsg) {
      if (contentType.includes('text/plain') || contentType.includes('text/html')) {
        const text = await res.text().catch(() => '');
        if (text && text.trim().length > 0) {
          const cleanText = text.trim();
          errorMsg = cleanText.length < 200 ? cleanText : cleanText.slice(0, 200) + '...';
        }
      }
    }
    errorMsg = errorMsg || res.statusText || 'An unexpected error occurred.';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  async loginWithGoogle(credential: string): Promise<{ user: UserProfile; csrfToken: string }> {
    const res = await apiFetch<{ user: UserProfile; csrfToken: string }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    return res.data!;
  },

  async loginWithDevPersona(personaKey: string): Promise<{ user: UserProfile; csrfToken: string }> {
    if (!isDevBypassEnabled()) {
      throw new Error('Dev login bypass is disabled.');
    }

    try {
      const res = await apiFetch<{ user: UserProfile; csrfToken: string }>('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ persona: personaKey }),
      });
      if (res.data) {
        mockApi.loginWithDevPersona(personaKey);
        return res.data;
      }
    } catch (e) {
      // Local preview or offline fallback
    }

    const mockRes = mockApi.loginWithDevPersona(personaKey);
    setCsrfToken(mockRes.csrfToken);
    return mockRes;
  },

  async getSession(): Promise<{ user: UserProfile; csrfToken: string }> {
    if (isDevBypassEnabled()) {
      const mockUser = mockApi.getCurrentUser();
      if (mockUser) {
        return { user: mockUser, csrfToken: 'mock-csrf-token' };
      }
    }

    try {
      const res = await apiFetch<{ user: UserProfile; csrfToken: string }>('/api/auth/session');
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        const mockUser = mockApi.getCurrentUser();
        if (mockUser) {
          return { user: mockUser, csrfToken: 'mock-csrf-token' };
        }
      }
      throw err;
    }
  },

  async logout(): Promise<void> {
    if (isDevBypassEnabled()) {
      mockApi.clearSession();
    }
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore if dev/preview server without proxy
    }
    cachedCsrfToken = null;
  },

  // ---------------------------------------------------------------------------
  // Teams & Checklists
  // ---------------------------------------------------------------------------
  async getTeams(): Promise<TeamOverview[]> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.getTeams();
    }
    try {
      const res = await apiFetch<TeamOverview[]>('/api/teams');
      return res.data || [];
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.getTeams();
      }
      throw err;
    }
  },

  async getTeamOverview(teamId: string): Promise<TeamOverview> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.getTeamOverview(teamId);
    }
    try {
      const res = await apiFetch<TeamOverview>(`/api/teams/${teamId}`);
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.getTeamOverview(teamId);
      }
      throw err;
    }
  },

  async getTeamTasks(teamId: string): Promise<{
    teamId: string;
    tasks: Task[];
    metrics: {
      totalTasks: number;
      completedTasks: number;
      pendingTasks: number;
      completionPercentage: number;
      latestPendingTask: string;
    };
    activity: ActivityLogItem[];
  }> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.getTeamTasks(teamId);
    }
    try {
      const res = await apiFetch<any>(`/api/teams/${teamId}/tasks`);
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.getTeamTasks(teamId);
      }
      throw err;
    }
  },

  // ---------------------------------------------------------------------------
  // Tasks (Status Toggle, CRUD, Reorder)
  // ---------------------------------------------------------------------------
  async updateTaskStatus(
    teamId: string,
    taskId: string,
    status: TaskStatus,
    remarks?: string
  ): Promise<{ task?: Task; metrics?: any; sync: SyncResult }> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      const sync = mockApi.updateTaskStatus(teamId, taskId, status, remarks);
      return { sync };
    }
    try {
      const res = await apiFetch<any>(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ teamId, status, remarks }),
      });
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        const sync = mockApi.updateTaskStatus(teamId, taskId, status, remarks);
        return { sync };
      }
      throw err;
    }
  },

  async createTask(teamId: string, taskData: Partial<Task>): Promise<{ task: Task; sync: SyncResult }> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      const task = mockApi.createTask(teamId, taskData);
      const team = mockApi.getTeamTasks(teamId);
      return {
        task,
        sync: {
          teamId,
          totalTasks: team.metrics.totalTasks,
          completedTasks: team.metrics.completedTasks,
          pendingTasks: team.metrics.pendingTasks,
          completionPercentage: team.metrics.completionPercentage,
          latestPendingTask: team.metrics.latestPendingTask,
          masterSynced: true,
        },
      };
    }
    try {
      const res = await apiFetch<any>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ teamId, ...taskData }),
      });
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        const task = mockApi.createTask(teamId, taskData);
        const team = mockApi.getTeamTasks(teamId);
        return {
          task,
          sync: {
            teamId,
            totalTasks: team.metrics.totalTasks,
            completedTasks: team.metrics.completedTasks,
            pendingTasks: team.metrics.pendingTasks,
            completionPercentage: team.metrics.completionPercentage,
            latestPendingTask: team.metrics.latestPendingTask,
            masterSynced: true,
          },
        };
      }
      throw err;
    }
  },

  async editTask(teamId: string, taskId: string, taskData: Partial<Task>): Promise<{ task: Task; sync: SyncResult }> {
    const res = await apiFetch<any>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ teamId, ...taskData }),
    });
    return res.data!;
  },

  async deleteTask(teamId: string, taskId: string): Promise<void> {
    await apiFetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      body: JSON.stringify({ teamId }),
    });
  },

  async reorderTasks(teamId: string, orderedTaskIds: string[]): Promise<{ tasks?: Task[]; sync?: SyncResult }> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      mockApi.reorderTasks(teamId, orderedTaskIds);
      return {};
    }
    try {
      const res = await apiFetch<any>('/api/tasks/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ teamId, orderedTaskIds }),
      });
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        mockApi.reorderTasks(teamId, orderedTaskIds);
        return {};
      }
      throw err;
    }
  },

  // ---------------------------------------------------------------------------
  // Admin Operations (Whitelist & Metrics)
  // ---------------------------------------------------------------------------
  async getAdminDashboard(): Promise<{
    metrics: AdminDashboardMetrics;
    teams: TeamOverview[];
    recentActivity: GlobalActivityItem[];
    config?: AppConfig;
  }> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.getAdminDashboard();
    }
    try {
      const res = await apiFetch<any>('/api/admin/dashboard');
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.getAdminDashboard();
      }
      throw err;
    }
  },

  async getAdminActivity(limit = 50): Promise<GlobalActivityItem[]> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.getGlobalActivity().slice(0, limit);
    }
    try {
      const res = await apiFetch<GlobalActivityItem[]>(`/api/admin/activity?limit=${limit}`);
      return res.data || [];
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.getGlobalActivity().slice(0, limit);
      }
      throw err;
    }
  },

  async getUsers(): Promise<UserProfile[]> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.getUsers();
    }
    try {
      const res = await apiFetch<UserProfile[]>('/api/admin/users');
      return res.data || [];
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.getUsers();
      }
      throw err;
    }
  },

  async saveUser(user: Partial<UserProfile>): Promise<UserProfile> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      if (user.id) {
        return mockApi.updateUser(user.id, user);
      }
      return mockApi.createUser(user);
    }
    try {
      const method = user.id ? 'PATCH' : 'POST';
      const res = await apiFetch<UserProfile>('/api/admin/users', {
        method,
        body: JSON.stringify(user),
      });
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        if (user.id) return mockApi.updateUser(user.id, user);
        return mockApi.createUser(user);
      }
      throw err;
    }
  },

  async deleteUser(userIdOrEmail: string): Promise<void> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      mockApi.deleteUser(userIdOrEmail);
      return;
    }
    try {
      await apiFetch('/api/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ email: userIdOrEmail }),
      });
    } catch (err) {
      if (isDevBypassEnabled()) {
        mockApi.deleteUser(userIdOrEmail);
        return;
      }
      throw err;
    }
  },

  async getSyncStatus(): Promise<any> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.getSyncStatus();
    }
    try {
      const res = await apiFetch<any>('/api/admin/sync-status');
      return res.data;
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.getSyncStatus();
      }
      throw err;
    }
  },

  async reconcile(): Promise<SyncResult[]> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.reconcileAll();
    }
    try {
      const res = await apiFetch<SyncResult[]>('/api/admin/reconcile', {
        method: 'POST',
      });
      return res.data || [];
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.reconcileAll();
      }
      throw err;
    }
  },

  // ---------------------------------------------------------------------------
  // Dynamic Configuration & Control Centre
  // ---------------------------------------------------------------------------
  async getAppConfig(): Promise<AppConfig> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.getConfig();
    }
    try {
      const res = await apiFetch<AppConfig>('/api/admin/config');
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.getConfig();
      }
      throw err;
    }
  },

  async saveAppConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.updateConfig(config);
    }
    try {
      const res = await apiFetch<AppConfig>('/api/admin/config', {
        method: 'PATCH',
        body: JSON.stringify(config),
      });
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.updateConfig(config);
      }
      throw err;
    }
  },

  async saveTeam(team: Partial<TeamOverview>): Promise<TeamOverview> {
    if (isDevBypassEnabled() && mockApi.getCurrentUser()) {
      return mockApi.saveTeam(team);
    }
    try {
      const existingTeams = await this.getTeams().catch(() => []);
      const exists = Boolean(team.id && existingTeams.some(t => t.id === team.id));
      const method = exists ? 'PATCH' : 'POST';
      const res = await apiFetch<TeamOverview>('/api/admin/teams', {
        method,
        body: JSON.stringify(team),
      });
      return res.data!;
    } catch (err) {
      if (isDevBypassEnabled()) {
        return mockApi.saveTeam(team);
      }
      throw err;
    }
  },

};
