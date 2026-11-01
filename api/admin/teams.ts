import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceAdmin } from '../_lib/auth';
import { validateCsrfToken } from '../_lib/csrf';
import { parseJsonBody, validateTeamInput } from '../_lib/validation';
import { fetchMasterTeamOverview, updateMasterTeamOverviewRow, appendGlobalActivityLog, ensureTeamSpreadsheetInitialized } from '../_lib/sheets';
import type { SheetRowTeamOverview } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method?.toUpperCase();
  if (!['POST', 'PATCH'].includes(method || '')) {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST or PATCH.' });
  }

  try {
    const user = await authenticateSession(req);
    enforceAdmin(user); // Super Admin only

    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: 'Invalid or missing CSRF token.' });
    }

    const body = parseJsonBody(req);
    const validated = validateTeamInput(body);

    const existingTeams = await fetchMasterTeamOverview();
    const existing = existingTeams.find(t => t.id === validated.id);

    if (method === 'POST' && existing) {
      return res.status(409).json({ success: false, error: `Team ID "${validated.id}" already exists.` });
    }

    const now = new Date().toISOString();

    const rowData: SheetRowTeamOverview = {
      teamId: validated.id,
      teamName: validated.name,
      spreadsheetId: validated.spreadsheetId || (existing?.spreadsheetId || ''),
      totalTasks: existing ? existing.totalTasks : 0,
      completedTasks: existing ? existing.completedTasks : 0,
      pendingTasks: existing ? existing.pendingTasks : 0,
      completionPercentage: existing ? existing.completionPercentage : 0,
      latestPendingTask: existing ? existing.latestPendingTask : 'No tasks assigned yet.',
      lastUpdated: now,
      status: validated.status,
      department: validated.department || '',
      headEmail: validated.headEmail || '',
      description: validated.description || '',
    };

    await updateMasterTeamOverviewRow(rowData);

    // Proactively initialize blank Google Spreadsheets (auto-provisions Tasks & Activity_Log)
    if (rowData.spreadsheetId) {
      try {
        await ensureTeamSpreadsheetInitialized(rowData.spreadsheetId);
      } catch (sheetErr: any) {
        console.warn(`Proactive sheet initialization warning for ${rowData.spreadsheetId}:`, sheetErr.message);
      }
    }

    await appendGlobalActivityLog({
      id: `act-tm-${Date.now()}`,
      teamId: rowData.teamId,
      taskId: 'TEAM_MGMT',
      action: existing ? `Updated team "${rowData.teamName}" (Status: ${rowData.status})` : `Created new team "${rowData.teamName}" (${rowData.teamId})`,
      user: user.email,
      timestamp: now,
    });

    return res.status(200).json({
      success: true,
      data: rowData,
      message: existing ? 'Team updated successfully.' : 'Team created successfully.',
    });
  } catch (err: any) {
    console.error('Error in team management endpoint:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Team management operation failed.',
    });
  }
}
