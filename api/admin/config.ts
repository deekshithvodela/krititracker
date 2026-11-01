import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession, enforceAdmin } from '../_lib/auth';
import { validateCsrfToken } from '../_lib/csrf';
import { parseJsonBody } from '../_lib/validation';
import { fetchAppConfig, saveAppConfig, appendGlobalActivityLog } from '../_lib/sheets';
import type { AppConfig } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method?.toUpperCase();
  if (!['GET', 'PATCH'].includes(method || '')) {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const user = await authenticateSession(req);

    // GET is available to any authenticated user to dynamically configure their view
    if (method === 'GET') {
      const config = await fetchAppConfig();
      return res.status(200).json({
        success: true,
        data: config,
      });
    }

    // PATCH is strictly Super Admin only
    enforceAdmin(user);

    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: 'Invalid or missing CSRF token.' });
    }

    const body = parseJsonBody(req);
    const updated = await saveAppConfig(body, user.email);

    await appendGlobalActivityLog({
      id: `act-cfg-${Date.now()}`,
      teamId: 'MASTER',
      taskId: 'CONFIG_UPDATE',
      action: 'Updated dashboard and application configuration settings',
      user: user.email,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Configuration saved successfully.',
    });
  } catch (err: any) {
    console.error('Error in config endpoint:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : (err.message?.includes('Unauthorized') ? 401 : 500);
    return res.status(status).json({
      success: false,
      error: err.message || 'Configuration request failed.',
    });
  }
}
