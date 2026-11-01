import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSessionToken, createAuthCookies } from '../_lib/auth';
import { generateCsrfToken } from '../_lib/csrf';
import type { UserProfile, UserRole } from '../../src/types';

export const DEV_PERSONAS: Record<string, UserProfile> = {
  admin: {
    id: 'USR-DEV-ADMIN-001',
    name: 'Dr. Robert Hayes (Congress Director)',
    email: 'admin.qa@company.com',
    role: 'admin',
    teamId: 'all',
    active: true,
  },
  team_head_eng: {
    id: 'USR-DEV-ENG-002',
    name: 'Dr. Alex Rivera (Scientific Head)',
    email: 'lead.eng@company.com',
    role: 'team_head',
    teamId: 'team-scientific',
    active: true,
  },
  team_head_ops: {
    id: 'USR-DEV-OPS-003',
    name: 'Dr. Jordan Lee (CME Director)',
    email: 'lead.ops@company.com',
    role: 'team_head',
    teamId: 'team-cme-workshops',
    active: true,
  },
  viewer: {
    id: 'USR-DEV-VIEWER-004',
    name: 'Dr. Sam Morgan (Ethics Officer)',
    email: 'auditor.qa@company.com',
    role: 'viewer',
    teamId: 'all',
    active: true,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 🛡️ TRIPWIRE 1: Hard 404 in production environments (Zero-Leak Guarantee)
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Endpoint not found.' });
  }

  // 🛡️ TRIPWIRE 2: Explicit feature flag or dev mode required
  const isDevAllowed =
    process.env.ENABLE_DEV_LOGIN === 'true' ||
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test';

  if (!isDevAllowed) {
    return res.status(403).json({ success: false, error: 'Dev login bypass is disabled.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const personaKey = body.persona || 'admin';
    const persona = DEV_PERSONAS[personaKey];

    const user: UserProfile = persona || {
      id: body.id || `USR-DEV-${Date.now().toString().slice(-4)}`,
      name: body.name || 'Custom Dev User',
      email: (body.email || 'dev.user@company.com').toLowerCase().trim(),
      role: (body.role as UserRole) || 'admin',
      teamId: body.teamId || 'all',
      active: true,
    };

    const sessionToken = await createSessionToken(user);
    const csrfToken = generateCsrfToken();
    const cookies = createAuthCookies(sessionToken, csrfToken);

    res.setHeader('Set-Cookie', cookies);
    return res.status(200).json({
      success: true,
      data: {
        user,
        csrfToken,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Dev login bypass failed.',
    });
  }
}
