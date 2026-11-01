import type { Task, ActivityLogItem, GlobalActivityItem, TeamOverview } from '../../src/types';
import type { SheetRowTeamOverview, SyncResult } from './types';
import {
  fetchTeamTasks,
  updateMasterTeamOverviewRow,
  appendTeamActivityLog,
  appendGlobalActivityLog,
  getTeamSpreadsheetId,
  getMasterSpreadsheetId,
  fetchMasterTeamOverview,
} from './sheets';

/**
 * Calculates progress metrics and identifies the latest pending task
 */
export function calculateTeamMetrics(tasks: Task[]): {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  latestPendingTask: string;
} {
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      completionPercentage: 0,
      latestPendingTask: 'No tasks assigned yet.',
    };
  }

  // Ensure tasks are sorted by displayOrder
  const sortedTasks = [...tasks].sort((a, b) => a.displayOrder - b.displayOrder);
  const completedTasks = sortedTasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

  let latestPendingTask = 'All tasks completed.';
  const firstIncomplete = sortedTasks.find(t => t.status !== 'Completed');
  if (firstIncomplete) {
    latestPendingTask = firstIncomplete.title;
  }

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    completionPercentage,
    latestPendingTask,
  };
}

/**
 * Synchronizes a team's current state with the master spreadsheet
 */
export async function syncTeamProgress(
  teamId: string,
  teamName?: string
): Promise<SyncResult> {
  try {
    const tasks = await fetchTeamTasks(teamId);
    const metrics = calculateTeamMetrics(tasks);
    const spreadsheetId = await getTeamSpreadsheetId(teamId);

    let existingMeta: any = null;
    try {
      const overviews = await fetchMasterTeamOverview();
      existingMeta = overviews.find(o => o.id === teamId);
    } catch {}

    const name = teamName || existingMeta?.name || `Team ${teamId.replace('team-', '')}`;

    const rowOverview: SheetRowTeamOverview = {
      teamId,
      teamName: name,
      spreadsheetId,
      totalTasks: metrics.totalTasks,
      completedTasks: metrics.completedTasks,
      pendingTasks: metrics.pendingTasks,
      completionPercentage: metrics.completionPercentage,
      latestPendingTask: metrics.latestPendingTask,
      lastUpdated: new Date().toISOString(),
      status: existingMeta?.status || 'Active',
      department: existingMeta?.department || 'General',
      headEmail: existingMeta?.headEmail || '',
      description: existingMeta?.description || '',
    };

    let masterSynced = false;
    let syncError: string | undefined;

    try {
      await updateMasterTeamOverviewRow(rowOverview);
      masterSynced = true;
    } catch (err: any) {
      console.error(`Master overview sync failed for team ${teamId}:`, err);
      syncError = err?.message || 'Failed to update Master spreadsheet';
    }

    return {
      teamId,
      totalTasks: metrics.totalTasks,
      completedTasks: metrics.completedTasks,
      pendingTasks: metrics.pendingTasks,
      completionPercentage: metrics.completionPercentage,
      latestPendingTask: metrics.latestPendingTask,
      masterSynced,
      error: syncError,
    };
  } catch (err: any) {
    console.error(`Error calculating/syncing team progress for ${teamId}:`, err);
    throw err;
  }
}

/**
 * Records activity in both the individual team log and the master global activity log
 */
export async function logActivity(
  teamId: string,
  taskId: string,
  action: ActivityLogItem['action'],
  performedBy: string,
  previousValue?: string,
  newValue?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const activityId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Append to team activity log
  try {
    await appendTeamActivityLog(teamId, {
      id: activityId,
      taskId,
      action,
      previousValue,
      newValue,
      performedBy,
      timestamp,
    });
  } catch (err) {
    console.warn(`Failed to write to team activity log (${teamId}):`, err);
  }

  // Append to global activity log in master spreadsheet
  try {
    await appendGlobalActivityLog({
      id: activityId,
      teamId,
      taskId,
      action: `${action}: ${newValue || previousValue || taskId}`,
      user: performedBy,
      timestamp,
    });
  } catch (err) {
    console.warn(`Failed to write to global activity log:`, err);
  }
}

/**
 * Reconciles all 12 teams between their respective team sheets and the master sheet
 */
export async function reconcileAllTeams(teamMap: Record<string, string>): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const teamIds = Object.keys(teamMap);

  for (const teamId of teamIds) {
    try {
      const res = await syncTeamProgress(teamId);
      results.push(res);
    } catch (err: any) {
      results.push({
        teamId,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionPercentage: 0,
        latestPendingTask: 'Error reading tasks',
        masterSynced: false,
        error: err?.message || 'Reconciliation failed',
      });
    }
  }

  return results;
}
