import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceAdmin } from '../../_lib/auth';
import { getGoogleSheetsClient, getMasterSpreadsheetId, getTeamSpreadsheetMap, fetchMasterTeamOverview } from '../../_lib/sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);

    const startTime = Date.now();
    const sheets = getGoogleSheetsClient();
    const masterId = getMasterSpreadsheetId();

    // Check Master sheet connection
    await sheets.spreadsheets.get({ spreadsheetId: masterId, fields: 'spreadsheetId,properties.title' });
    const latencyMs = Date.now() - startTime;

    const teamMap = getTeamSpreadsheetMap();
    const teams = await fetchMasterTeamOverview();

    return res.status(200).json({
      success: true,
      data: {
        status: 'CONNECTED',
        latencyMs,
        masterSpreadsheetId: masterId,
        configuredTeamSheets: Object.keys(teamMap).length,
        trackedTeamsInMaster: teams.length,
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error checking sync status:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Sync status check failed.',
    });
  }
}
