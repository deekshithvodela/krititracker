import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceTeamAccess } from '../../_lib/auth';
import { fetchTeamTasks, fetchTeamActivityLog } from '../../_lib/sheets';
import { calculateTeamMetrics } from '../../_lib/sync';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    const user = await authenticateSession(req);
    const teamId = String(req.query.teamId || '').trim();

    if (!teamId) {
      return res.status(400).json({ success: false, error: 'Missing teamId parameter.' });
    }

    // RBAC: Verify user has access to this specific team
    enforceTeamAccess(user, teamId);

    // Fetch tasks from team's individual spreadsheet
    const tasks = await fetchTeamTasks(teamId);

    // Compute progress & identify latest pending task
    const metrics = calculateTeamMetrics(tasks);

    // Fetch recent activity for this team
    const activity = await fetchTeamActivityLog(teamId, 25);

    return res.status(200).json({
      success: true,
      data: {
        teamId,
        tasks,
        metrics,
        activity,
      },
    });
  } catch (err: any) {
    console.error('Error fetching team tasks:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Failed to fetch team tasks.',
    });
  }
}
