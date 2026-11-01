import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceAdmin } from '../../_lib/auth';
import { fetchGlobalActivityLog } from '../../_lib/sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);

    const limit = parseInt(String(req.query.limit || '50'), 10);
    const activity = await fetchGlobalActivityLog(limit);

    return res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (err: any) {
    console.error('Error fetching global activity:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Failed to fetch activity log.',
    });
  }
}
