import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceWriteAccess } from '../../_lib/auth';
import { validateCsrfToken } from '../../_lib/csrf';
import { parseJsonBody, validateStatusUpdate } from '../../_lib/validation';
import { fetchTeamTasks, findTaskRowIndex, updateTaskRow, fetchAppConfig } from '../../_lib/sheets';
import { syncTeamProgress, logActivity } from '../../_lib/sync';
import type { Task } from '../../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use PATCH.' });
  }

  try {
    const user = await authenticateSession(req);

    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: 'Invalid or missing CSRF token.' });
    }

    const taskId = String(req.query.taskId || '').trim();
    const body = parseJsonBody(req);
    const teamId = String(body.teamId || '').trim();

    if (!taskId || !teamId) {
      return res.status(400).json({ success: false, error: 'taskId and teamId are required.' });
    }

    // RBAC: Verify write access to this team (Super Admin or assigned Team Head; Viewers rejected)
    enforceWriteAccess(user, teamId);

    const { status, remarks } = validateStatusUpdate(body);

    const tasks = await fetchTeamTasks(teamId);
    const existingTask = tasks.find(t => t.id === taskId);
    if (!existingTask) {
      return res.status(404).json({ success: false, error: `Task ${taskId} not found in team ${teamId}.` });
    }

    // Check if reopening is permitted
    if (existingTask.status === 'Completed' && status === 'Pending') {
      const config = await fetchAppConfig();
      if (!config.appSettings.allowTeamHeadReopen && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Reopening completed tasks requires Super Administrator permission.',
        });
      }
    }

    const rowIndex = await findTaskRowIndex(teamId, taskId);
    if (rowIndex === -1) {
      return res.status(404).json({ success: false, error: `Task row not found in sheet for ${taskId}.` });
    }

    const now = new Date().toISOString();
    const isCompleted = status === 'Completed';

    const updatedTask: Task = {
      ...existingTask,
      status,
      remarks: remarks !== undefined ? remarks : existingTask.remarks,
      updatedAt: now,
      completedAt: isCompleted ? (existingTask.completedAt || now) : undefined,
    };

    // 1. Update task row in team spreadsheet
    await updateTaskRow(teamId, rowIndex, updatedTask);

    // 2. Synchronize progress with Master Spreadsheet (recalculates %, pending count, latest pending task)
    const syncResult = await syncTeamProgress(teamId);

    // 3. Log to Activity_Log and Global_Activity
    const actionDesc = isCompleted ? 'Completed' : 'Reopened';
    await logActivity(
      teamId,
      taskId,
      'STATUS_CHANGED',
      user.email,
      existingTask.status,
      status
    );

    if (remarks && remarks !== existingTask.remarks) {
      await logActivity(
        teamId,
        taskId,
        'REMARKS_UPDATED',
        user.email,
        existingTask.remarks,
        remarks
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        task: updatedTask,
        metrics: {
          totalTasks: syncResult.totalTasks,
          completedTasks: syncResult.completedTasks,
          pendingTasks: syncResult.pendingTasks,
          completionPercentage: syncResult.completionPercentage,
          latestPendingTask: syncResult.latestPendingTask,
        },
        sync: syncResult,
      },
    });
  } catch (err: any) {
    console.error('Error updating task status:', err.message);
    const statusCode = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'Failed to update task status.',
    });
  }
}
