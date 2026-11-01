import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_COOKIE_NAME = 'kriti_csrf_token';

/**
 * Generates a random cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Verifies that the incoming mutating request includes a valid CSRF token matching the CSRF cookie
 */
export function validateCsrfToken(req: any): boolean {
  // Safe HTTP methods do not require CSRF token
  const method = (req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[CSRF_HEADER_NAME.toLowerCase()];
  
  // Extract CSRF cookie
  const cookieHeader = req.headers.cookie || '';
  const cookies = parseCookies(cookieHeader);
  const cookieToken = cookies[CSRF_COOKIE_NAME];

  if (!headerToken || !cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));
  } catch {
    return false;
  }
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('=').trim());
    }
  });

  return list;
}
