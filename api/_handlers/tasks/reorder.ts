import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceAdmin } from '../../_lib/auth';
import { validateCsrfToken } from '../../_lib/csrf';
import { parseJsonBody } from '../../_lib/validation';
import { fetchTeamTasks, batchUpdateTaskRows } from '../../_lib/sheets';
import { syncTeamProgress, logActivity } from '../../_lib/sync';
import type { Task } from '../../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use PATCH.' });
  }

  try {
    const user = await authenticateSession(req);
    enforceAdmin(user); // Super Admin only can reorder tasks

    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: 'Invalid or missing CSRF token.' });
    }

    const body = parseJsonBody(req);
    const teamId = String(body.teamId || '').trim();
    const orderedTaskIds: string[] = Array.isArray(body.orderedTaskIds) ? body.orderedTaskIds : [];

    if (!teamId || orderedTaskIds.length === 0) {
      return res.status(400).json({ success: false, error: 'teamId and orderedTaskIds array are required.' });
    }

    const existingTasks = await fetchTeamTasks(teamId);
    const taskMap = new Map<string, Task>();
    existingTasks.forEach(t => taskMap.set(t.id, t));

    const reordered: Task[] = [];
    const now = new Date().toISOString();

    // Reassign displayOrder sequentially
    orderedTaskIds.forEach((id, index) => {
      const task = taskMap.get(id);
      if (task) {
        reordered.push({
          ...task,
          displayOrder: index + 1,
          updatedAt: now,
        });
        taskMap.delete(id);
      }
    });

    // Append any tasks that weren't in the ordered list at the end
    taskMap.forEach(task => {
      reordered.push({
        ...task,
        displayOrder: reordered.length + 1,
        updatedAt: now,
      });
    });

    // 1. Batch update spreadsheet
    await batchUpdateTaskRows(teamId, reordered);

    // 2. Synchronize Master Spreadsheet (recalculates latest pending task based on new displayOrder!)
    const syncResult = await syncTeamProgress(teamId);

    // 3. Log activity
    await logActivity(
      teamId,
      'ALL',
      'TASKS_REORDERED',
      user.email,
      undefined,
      `Reordered ${reordered.length} tasks`
    );

    return res.status(200).json({
      success: true,
      data: {
        tasks: reordered,
        sync: syncResult,
      },
    });
  } catch (err: any) {
    console.error('Error reordering tasks:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Failed to reorder tasks.',
    });
  }
}
