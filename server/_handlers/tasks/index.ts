import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceAdmin } from '../../_lib/auth';
import { validateCsrfToken } from '../../_lib/csrf';
import { parseJsonBody, validateTaskInput } from '../../_lib/validation';
import { fetchTeamTasks, appendTaskRow } from '../../_lib/sheets';
import { syncTeamProgress, logActivity } from '../../_lib/sync';
import type { Task } from '../../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const user = await authenticateSession(req);
    enforceAdmin(user); // Super Admin only can create tasks

    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: 'Invalid or missing CSRF token.' });
    }

    const body = parseJsonBody(req);
    const teamId = String(body.teamId || '').trim();
    if (!teamId) {
      return res.status(400).json({ success: false, error: 'teamId is required to create a task.' });
    }

    const taskData = validateTaskInput(body);
    const existingTasks = await fetchTeamTasks(teamId);

    const now = new Date().toISOString();
    const cleanTeamNum = teamId.replace('team-', '');
    const taskId = `TASK-${cleanTeamNum}-${Date.now().toString().slice(-4)}`;

    const newTask: Task = {
      id: taskId,
      title: taskData.title,
      description: taskData.description,
      assignedTo: taskData.assignedTo,
      priority: taskData.priority,
      deadline: taskData.deadline,
      status: taskData.status || 'Pending',
      remarks: taskData.remarks || '',
      displayOrder: existingTasks.length + 1,
      createdAt: now,
      updatedAt: now,
      completedAt: taskData.status === 'Completed' ? now : undefined,
      category: taskData.category,
      isMandatory: taskData.isMandatory,
    };

    // 1. Append to team spreadsheet
    await appendTaskRow(teamId, newTask);

    // 2. Synchronize progress with Master Spreadsheet
    const syncResult = await syncTeamProgress(teamId);

    // 3. Record in activity logs
    await logActivity(
      teamId,
      newTask.id,
      'TASK_CREATED',
      user.email,
      undefined,
      `Created task "${newTask.title}" (${newTask.priority})`
    );

    return res.status(201).json({
      success: true,
      data: {
        task: newTask,
        sync: syncResult,
      },
    });
  } catch (err: any) {
    console.error('Error creating task:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Failed to create task.',
    });
  }
}
