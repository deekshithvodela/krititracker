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
  const query = req.query || {};
  let rawPath = '';

  if (typeof query.path === 'string') {
    rawPath = query.path;
  } else if (Array.isArray(query.path)) {
    rawPath = query.path.join('/');
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
  try {
    req.query = req.query || {};
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
      return await handleAuthGoogle(req, res);
    }
    if (path === 'auth/dev-login') {
      return await handleAuthDevLogin(req, res);
    }
    if (path === 'auth/session') {
      return await handleAuthSession(req, res);
    }
    if (path === 'auth/logout') {
      return await handleAuthLogout(req, res);
    }

    // 2. Admin routes
    if (path === 'admin/dashboard') {
      return await handleAdminDashboard(req, res);
    }
    if (path === 'admin/sync-status') {
      return await handleAdminSyncStatus(req, res);
    }
    if (path === 'admin/users') {
      return await handleAdminUsers(req, res);
    }
    if (path === 'admin/teams') {
      return await handleAdminTeams(req, res);
    }
    if (path === 'admin/config') {
      return await handleAdminConfig(req, res);
    }
    if (path === 'admin/activity') {
      return await handleAdminActivity(req, res);
    }
    if (path === 'admin/reconcile') {
      return await handleAdminReconcile(req, res);
    }

    // 3. Teams routes
    if (path === 'teams') {
      return await handleTeamsIndex(req, res);
    }

    const teamTasksMatch = path.match(/^teams\/([^/]+)\/tasks$/);
    if (teamTasksMatch) {
      req.query.teamId = teamTasksMatch[1];
      return await handleTeamTasks(req, res);
    }

    const teamDetailMatch = path.match(/^teams\/([^/]+)$/);
    if (teamDetailMatch) {
      req.query.teamId = teamDetailMatch[1];
      return await handleTeamDetail(req, res);
    }

    // 4. Tasks routes
    if (path === 'tasks') {
      return await handleTasksIndex(req, res);
    }
    if (path === 'tasks/reorder') {
      return await handleTasksReorder(req, res);
    }

    const taskStatusMatch = path.match(/^tasks\/([^/]+)\/status$/);
    if (taskStatusMatch) {
      req.query.taskId = taskStatusMatch[1];
      return await handleTaskStatus(req, res);
    }

    const taskItemMatch = path.match(/^tasks\/([^/]+)$/);
    if (taskItemMatch) {
      req.query.taskId = taskItemMatch[1];
      return await handleTaskItem(req, res);
    }

    // 5. 404 Not Found fallback
    return res.status(404).json({
      success: false,
      error: `Endpoint not found: /api/${path}`,
    });
  } catch (err: any) {
    console.error('Unhandled Serverless Router Exception:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal Server Error',
    });
  }
}

