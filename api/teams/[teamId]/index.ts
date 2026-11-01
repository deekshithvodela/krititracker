import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceTeamAccess } from '../../_lib/auth';
import { fetchMasterTeamOverview } from '../../_lib/sheets';

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

    // Enforce team access: Super Admin or assigned Team Head/Viewer
    enforceTeamAccess(user, teamId);

    const allTeams = await fetchMasterTeamOverview();
    const team = allTeams.find(t => t.id === teamId);

    if (!team) {
      return res.status(404).json({ success: false, error: `Team ${teamId} not found.` });
    }

    return res.status(200).json({
      success: true,
      data: team,
    });
  } catch (err: any) {
    console.error('Error fetching team overview:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Failed to fetch team details.',
    });
  }
}
