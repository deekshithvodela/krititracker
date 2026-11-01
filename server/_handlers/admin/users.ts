import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceAdmin } from '../../_lib/auth';
import { validateCsrfToken } from '../../_lib/csrf';
import { parseJsonBody, validateUserInput } from '../../_lib/validation';
import { fetchUsersList, upsertUser, deleteUser, appendGlobalActivityLog } from '../../_lib/sheets';
import { getDriveFolderId, shareDriveFolderWithUser, removeDriveFolderUser } from '../../_lib/drive';
import type { UserProfile } from '../../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method?.toUpperCase();
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method || '')) {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const user = await authenticateSession(req);
    enforceAdmin(user); // Super Admin only can manage whitelist

    // GET all authorized users
    if (method === 'GET') {
      const users = await fetchUsersList();
      return res.status(200).json({
        success: true,
        data: users,
      });
    }

    // Mutating actions require CSRF validation
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: 'Invalid or missing CSRF token.' });
    }

    const body = parseJsonBody(req);

    // DELETE: Revoke user authorization
    if (method === 'DELETE') {
      const targetEmail = String(body.email || req.query.email || '').toLowerCase().trim();
      if (!targetEmail) {
        return res.status(400).json({ success: false, error: 'Email parameter is required to revoke user.' });
      }

      // Self-protection guard: Admin cannot delete their own account
      if (user.email.toLowerCase() === targetEmail) {
        return res.status(400).json({ success: false, error: 'You cannot revoke or delete your own administrator account.' });
      }

      await deleteUser(targetEmail);

      // Auto-revoke Google Drive folder access if Drive integration is configured
      const driveFolderId = getDriveFolderId();
      if (driveFolderId) {
        try {
          await removeDriveFolderUser(driveFolderId, targetEmail);
        } catch (driveErr: any) {
          console.warn(`Drive folder revocation warning for ${targetEmail}:`, driveErr.message);
        }
      }

      await appendGlobalActivityLog({
        id: `act-usr-del-${Date.now()}`,
        teamId: 'MASTER',
        taskId: 'USER_REVOKED',
        action: `Revoked whitelist authorization for ${targetEmail}`,
        user: user.email,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        message: `User ${targetEmail} authorization has been revoked.`,
      });
    }

    // POST / PATCH: Add or update authorized user
    const validated = validateUserInput(body);

    // Self-modification protection guard: Admin cannot demote or deactivate themselves
    if (user.email.toLowerCase() === validated.email) {
      if (validated.role !== 'admin' || !validated.active) {
        return res.status(400).json({
          success: false,
          error: 'You cannot remove your own administrator privileges or deactivate your own account.',
        });
      }
    }

    const existingUsers = await fetchUsersList();
    const existing = existingUsers.find(u => u.email.toLowerCase() === validated.email);

    const userProfile: UserProfile = {
      id: existing ? existing.id : `USR-${Date.now().toString().slice(-4)}`,
      name: validated.name,
      email: validated.email,
      role: validated.role,
      teamId: validated.teamId,
      active: validated.active,
    };

    await upsertUser(userProfile);

    // Auto-sync Google Drive folder permissions with user's role
    const driveFolderId = getDriveFolderId();
    if (driveFolderId) {
      try {
        if (userProfile.active) {
          const driveRole = (userProfile.role === 'admin' || userProfile.role === 'team_head') ? 'writer' : 'reader';
          await shareDriveFolderWithUser(driveFolderId, userProfile.email, driveRole);
        } else {
          await removeDriveFolderUser(driveFolderId, userProfile.email);
        }
      } catch (driveErr: any) {
        console.warn(`Drive folder permission sync warning for ${userProfile.email}:`, driveErr.message);
      }
    }

    await appendGlobalActivityLog({
      id: `act-usr-${Date.now()}`,
      teamId: userProfile.teamId,
      taskId: 'USER_MGMT',
      action: existing
        ? `Updated user ${userProfile.email} (Role: ${userProfile.role}, Active: ${userProfile.active})`
        : `Whitelisted new user ${userProfile.email} (${userProfile.role}, Team: ${userProfile.teamId})`,
      user: user.email,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (err: any) {
    console.error('Error in user management:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'User operation failed.',
    });
  }
}
