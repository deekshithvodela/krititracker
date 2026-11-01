import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession } from '../_lib/auth';
import { fetchMasterTeamOverview } from '../_lib/sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    const user = await authenticateSession(req);
    const allTeams = await fetchMasterTeamOverview();

    // If Admin, return all teams (or all active/archived)
    if (user.role === 'admin') {
      return res.status(200).json({
        success: true,
        data: allTeams,
      });
    }

    // If Team Head or Viewer, filter strictly to user's assigned team ID
    const userTeams = allTeams.filter(t => t.id === user.teamId);

    return res.status(200).json({
      success: true,
      data: userTeams,
    });
  } catch (err: any) {
    console.error('Error fetching teams:', err.message);
    const status = err.message?.includes('Unauthorized') ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || 'Failed to fetch teams.',
    });
  }
}
