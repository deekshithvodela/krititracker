import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceWriteAccess } from '../../_lib/auth';
import { validateCsrfToken } from '../../_lib/csrf';
import { parseJsonBody, validateTaskInput } from '../../_lib/validation';
import { fetchTeamTasks, findTaskRowIndex, updateTaskRow, batchUpdateTaskRows } from '../../_lib/sheets';
import { syncTeamProgress, logActivity } from '../../_lib/sync';
import type { Task } from '../../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method?.toUpperCase();
  if (!['PATCH', 'DELETE'].includes(method || '')) {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use PATCH or DELETE.' });
  }

  try {
    const user = await authenticateSession(req);

    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: 'Invalid or missing CSRF token.' });
    }

    const taskId = String(req.query.taskId || '').trim();
    const body = parseJsonBody(req);
    const teamId = String(body.teamId || req.query.teamId || '').trim();

    if (!taskId || !teamId) {
      return res.status(400).json({ success: false, error: 'taskId and teamId parameters are required.' });
    }

    // RBAC: Verify write access to this team (Super Admin or assigned Team Head; Viewers rejected)
    enforceWriteAccess(user, teamId);

    const tasks = await fetchTeamTasks(teamId);
    const existingIndex = tasks.findIndex(t => t.id === taskId);
    if (existingIndex === -1) {
      return res.status(404).json({ success: false, error: `Task ${taskId} not found in team ${teamId}.` });
    }

    const existingTask = tasks[existingIndex];

    // Handle DELETE
    if (method === 'DELETE') {
      const remainingTasks = tasks.filter(t => t.id !== taskId);
      // Re-index display orders
      const reindexed = remainingTasks.map((t, idx) => ({
        ...t,
        displayOrder: idx + 1,
      }));

      await batchUpdateTaskRows(teamId, reindexed);
      const syncResult = await syncTeamProgress(teamId);

      await logActivity(
        teamId,
        taskId,
        'TASK_DELETED',
        user.email,
        existingTask.title,
        'Deleted'
      );

      return res.status(200).json({
        success: true,
        message: `Task ${taskId} deleted successfully.`,
        data: { sync: syncResult },
      });
    }

    // Handle PATCH (Edit Task Details)
    const taskData = validateTaskInput({ ...existingTask, ...body });
    const rowIndex = await findTaskRowIndex(teamId, taskId);

    if (rowIndex === -1) {
      return res.status(404).json({ success: false, error: `Task row not found in sheet for ${taskId}.` });
    }

    const now = new Date().toISOString();
    const updatedTask: Task = {
      ...existingTask,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      deadline: taskData.deadline,
      assignedTo: taskData.assignedTo,
      category: taskData.category,
      isMandatory: taskData.isMandatory,
      remarks: typeof body.remarks === 'string' ? body.remarks.trim() : existingTask.remarks,
      updatedAt: now,
    };

    await updateTaskRow(teamId, rowIndex, updatedTask);
    const syncResult = await syncTeamProgress(teamId);

    await logActivity(
      teamId,
      taskId,
      'TASK_EDITED',
      user.email,
      existingTask.title,
      updatedTask.title
    );

    return res.status(200).json({
      success: true,
      data: {
        task: updatedTask,
        sync: syncResult,
      },
    });
  } catch (err: any) {
    console.error('Error modifying task:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Failed to update/delete task.',
    });
  }
}
