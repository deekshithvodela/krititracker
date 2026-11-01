import type { VercelRequest, VercelResponse } from '@vercel/node';

// Auth Handlers
import handleAuthGoogle from './_handlers/auth/google';
import handleAuthDevLogin from './_handlers/auth/dev-login';
import handleAuthSession from './_handlers/auth/session';
import handleAuthLogout from './_handlers/auth/logout';

// Admin Handlers
import handleAdminDashboard from './_handlers/admin/dashboard';
import handleAdminSyncStatus from './_handlers/admin/sync-status';
import handleAdminUsers from './_handlers/admin/users';
import handleAdminTeams from './_handlers/admin/teams';
import handleAdminConfig from './_handlers/admin/config';
import handleAdminActivity from './_handlers/admin/activity';
import handleAdminReconcile from './_handlers/admin/reconcile';

// Teams Handlers
import handleTeamsIndex from './_handlers/teams/index';
import handleTeamDetail from './_handlers/teams/detail';
import handleTeamTasks from './_handlers/teams/tasks';

// Tasks Handlers
import handleTasksIndex from './_handlers/tasks/index';
import handleTasksReorder from './_handlers/tasks/reorder';
import handleTaskItem from './_handlers/tasks/item';
import handleTaskStatus from './_handlers/tasks/status';

/**
 * Normalizes and extracts the target sub-route from the incoming Vercel request.
 * Handles both Vercel rewrite format (`/api?path=...`) and direct URL invocation (`/api/...`).
 */
function extractRoutePath(req: VercelRequest): string {
  let rawPath = '';

  if (typeof req.query.path === 'string') {
    rawPath = req.query.path;
  } else if (Array.isArray(req.query.path)) {
    rawPath = req.query.path.join('/');
  }

  if (rawPath) {
    return rawPath.split('?')[0].replace(/^\/+|\/+$/g, '');
  }

  if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const qPath = parsed.searchParams.get('path');
      if (qPath) {
        return qPath.split('?')[0].replace(/^\/+|\/+$/g, '');
      }
      return parsed.pathname.replace(/^\/api\/?/, '').replace(/^\/+|\/+$/g, '');
    } catch {
      return req.url.replace(/^\/api\/?/, '').split('?')[0].replace(/^\/+|\/+$/g, '');
    }
  }

  return '';
}

/**
 * Unified Serverless Router for Vercel Hobby Plan (1 Lambda for all API endpoints)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = extractRoutePath(req);

  // Health / Root check
  if (!path || path === 'health') {
    return res.status(200).json({
      success: true,
      service: 'KRITI Tracker Unified Serverless API',
      status: 'healthy',
      version: '1.0.0',
      plan: 'Vercel Hobby Optimized (1 Function)',
      timestamp: new Date().toISOString(),
    });
  }

  // 1. Auth routes
  if (path === 'auth/google') {
    return handleAuthGoogle(req, res);
  }
  if (path === 'auth/dev-login') {
    return handleAuthDevLogin(req, res);
  }
  if (path === 'auth/session') {
    return handleAuthSession(req, res);
  }
  if (path === 'auth/logout') {
    return handleAuthLogout(req, res);
  }

  // 2. Admin routes
  if (path === 'admin/dashboard') {
    return handleAdminDashboard(req, res);
  }
  if (path === 'admin/sync-status') {
    return handleAdminSyncStatus(req, res);
  }
  if (path === 'admin/users') {
    return handleAdminUsers(req, res);
  }
  if (path === 'admin/teams') {
    return handleAdminTeams(req, res);
  }
  if (path === 'admin/config') {
    return handleAdminConfig(req, res);
  }
  if (path === 'admin/activity') {
    return handleAdminActivity(req, res);
  }
  if (path === 'admin/reconcile') {
    return handleAdminReconcile(req, res);
  }

  // 3. Teams routes
  if (path === 'teams') {
    return handleTeamsIndex(req, res);
  }

  const teamTasksMatch = path.match(/^teams\/([^/]+)\/tasks$/);
  if (teamTasksMatch) {
    req.query.teamId = teamTasksMatch[1];
    return handleTeamTasks(req, res);
  }

  const teamDetailMatch = path.match(/^teams\/([^/]+)$/);
  if (teamDetailMatch) {
    req.query.teamId = teamDetailMatch[1];
    return handleTeamDetail(req, res);
  }

  // 4. Tasks routes
  if (path === 'tasks') {
    return handleTasksIndex(req, res);
  }
  if (path === 'tasks/reorder') {
    return handleTasksReorder(req, res);
  }

  const taskStatusMatch = path.match(/^tasks\/([^/]+)\/status$/);
  if (taskStatusMatch) {
    req.query.taskId = taskStatusMatch[1];
    return handleTaskStatus(req, res);
  }

  const taskItemMatch = path.match(/^tasks\/([^/]+)$/);
  if (taskItemMatch) {
    req.query.taskId = taskItemMatch[1];
    return handleTaskItem(req, res);
  }

  // 5. 404 Not Found fallback
  return res.status(404).json({
    success: false,
    error: `Endpoint not found: /api/${path}`,
  });
}
