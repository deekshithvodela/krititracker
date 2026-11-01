import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyGoogleToken, resolveAuthorizedUser, createSessionToken, createAuthCookies } from '../../_lib/auth';
import { generateCsrfToken } from '../../_lib/csrf';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const { credential } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    if (!credential) {
      return res.status(400).json({ success: false, error: 'Missing Google ID credential.' });
    }

    // 1. Verify Google ID token
    const tokenPayload = await verifyGoogleToken(credential);

    // 2. Authorize user against Users sheet in Master Spreadsheet
    const user = await resolveAuthorizedUser(tokenPayload.email, tokenPayload.name);

    // 3. Generate session JWT and CSRF token
    const sessionToken = await createSessionToken(user);
    const csrfToken = generateCsrfToken();

    // 4. Set HTTP-only cookies
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
    console.error('Authentication error:', err.message);
    let errorMsg = err.message || 'Authentication failed.';
    if (errorMsg.includes('DECODER routines::unsupported')) {
      errorMsg = 'Google Service Account Private Key format error: Ensure GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is set in Vercel without surrounding quotes.';
    }
    const status = err.message?.includes('Access Denied') ? 403 : 401;
    return res.status(status).json({
      success: false,
      error: errorMsg,
    });
  }
}

