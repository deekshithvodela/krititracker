import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceAdmin } from '../_lib/auth';
import { fetchMasterTeamOverview, fetchGlobalActivityLog } from '../_lib/sheets';
import type { AdminDashboardMetrics } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    const user = await authenticateSession(req);
    enforceAdmin(user); // Super Admin only

    const teams = await fetchMasterTeamOverview();
    const recentActivity = await fetchGlobalActivityLog(20);

    const activeTeams = teams.filter(t => t.status !== 'Archived');
    const totalTeams = activeTeams.length;

    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    let teamsWithPendingTasks = 0;
    let teamsWithAllTasksCompleted = 0;

    activeTeams.forEach(team => {
      totalTasks += team.totalTasks;
      completedTasks += team.completedTasks;
      pendingTasks += team.pendingTasks;

      if (team.totalTasks > 0 && team.pendingTasks === 0) {
        teamsWithAllTasksCompleted++;
      }
      if (team.pendingTasks > 0) {
        teamsWithPendingTasks++;
      }
    });

    const overallCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const metrics: AdminDashboardMetrics = {
      totalTeams,
      teamsWithPendingTasks,
      teamsWithAllTasksCompleted,
      totalTasks,
      completedTasks,
      pendingTasks,
      overallCompletionPercentage,
      teamsWithOverdueTasks: 0, // Enhanced dynamically on client or query
    };

    return res.status(200).json({
      success: true,
      data: {
        metrics,
        teams,
        recentActivity,
      },
    });
  } catch (err: any) {
    console.error('Error loading admin dashboard:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Failed to load dashboard data.',
    });
  }
}
