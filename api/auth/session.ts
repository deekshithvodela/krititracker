import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateSession } from '../_lib/auth';
import { parseCookies, generateCsrfToken, CSRF_COOKIE_NAME } from '../_lib/csrf';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    const user = await authenticateSession(req);

    // Retrieve or refresh CSRF token
    const cookies = parseCookies(req.headers.cookie || '');
    let csrfToken = cookies[CSRF_COOKIE_NAME];
    if (!csrfToken) {
      csrfToken = generateCsrfToken();
      const isProd = process.env.NODE_ENV === 'production';
      res.setHeader('Set-Cookie', `kriti_csrf_token=${csrfToken}; Path=/; SameSite=Lax; Max-Age=604800${isProd ? '; Secure' : ''}`);
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
        csrfToken,
      },
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: err.message || 'Session not found or expired.',
    });
  }
}
