import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceAdmin } from '../../_lib/auth';
import { validateCsrfToken } from '../../_lib/csrf';
import { getTeamSpreadsheetMap, appendGlobalActivityLog } from '../../_lib/sheets';
import { reconcileAllTeams } from '../../_lib/sync';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);

    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: 'Invalid or missing CSRF token.' });
    }

    const teamMap = getTeamSpreadsheetMap();
    const results = await reconcileAllTeams(teamMap);

    await appendGlobalActivityLog({
      id: `act-rec-${Date.now()}`,
      teamId: 'ALL',
      taskId: 'RECONCILIATION',
      action: `Triggered full synchronization across ${results.length} teams`,
      user: user.email,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `Reconciled ${results.length} teams successfully.`,
      data: results,
    });
  } catch (err: any) {
    console.error('Error during reconciliation:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Reconciliation failed.',
    });
  }
}
