import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createLogoutCookies } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  // Clear HTTP-only session cookies
  res.setHeader('Set-Cookie', createLogoutCookies());

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}
