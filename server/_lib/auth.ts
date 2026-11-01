import { OAuth2Client } from 'google-auth-library';
import * as jose from 'jose';
import type { IncomingMessage, ServerResponse } from 'http';
import type { UserProfile, UserRole } from '../../src/types';
import type { AuthUserContext } from './types';
import { findUserByEmail, upsertUser, fetchUsersList } from './sheets';
import { parseCookies } from './csrf';

export const SESSION_COOKIE_NAME = 'kriti_session';
const SESSION_EXPIRY = '7d';

let oauthClient: OAuth2Client | null = null;

function getOAuthClient(): OAuth2Client {
  if (!oauthClient) {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is missing.');
    }
    oauthClient = new OAuth2Client(clientId);
  }
  return oauthClient;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'kriti-tracker-super-secure-default-secret-32-chars-long';
  return new TextEncoder().encode(secret);
}

/**
 * Verifies a Google ID Token sent from the frontend Google Sign-In button
 * Validates signature, issuer, audience, expiration, and asserts email_verified
 */
export async function verifyGoogleToken(idToken: string): Promise<{ email: string; name: string }> {
  const client = getOAuthClient();
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid Google credential: email not found in token payload.');
  }

  // 1. Mandatory email_verified assertion
  if (!payload.email_verified) {
    throw new Error('Access Denied: Google email address is not verified by Google.');
  }

  // 2. Validate token issuer
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!payload.iss || !validIssuers.includes(payload.iss)) {
    throw new Error(`Access Denied: Untrusted token issuer: ${payload.iss}`);
  }

  return {
    email: payload.email.toLowerCase().trim(),
    name: payload.name || payload.email.split('@')[0],
  };
}

/**
 * Resolves user from the Master Spreadsheet Users sheet (Authorised Whitelist).
 * Strict: Public registration or automatic account creation is NEVER permitted.
 */
export async function resolveAuthorizedUser(email: string, name: string): Promise<UserProfile> {
  const normalizedEmail = email.toLowerCase().trim();
  let user = await findUserByEmail(normalizedEmail);

  // Initial bootstrap check: if Users sheet is completely empty or initial admin not initialized
  if (!user) {
    const initialAdmin = (process.env.INITIAL_ADMIN_EMAIL || '').toLowerCase().trim();
    if (initialAdmin && normalizedEmail === initialAdmin) {
      const allUsers = await fetchUsersList();
      if (allUsers.length === 0 || !allUsers.some(u => u.email.toLowerCase() === initialAdmin)) {
        user = {
          id: `USR-ADMIN-${Date.now().toString().slice(-4)}`,
          name: name || 'System Administrator',
          email: normalizedEmail,
          role: 'admin',
          teamId: 'all',
          active: true,
        };
        await upsertUser(user);
      }
    }
  }

  if (!user) {
    throw new Error(
      `Access Denied: Your email (${normalizedEmail}) has not been authorised. Please contact your system administrator to be added to the whitelist.`
    );
  }

  if (!user.active) {
    throw new Error(
      `Access Denied: Your account (${normalizedEmail}) has been deactivated. Please contact your administrator.`
    );
  }

  return user;
}

/**
 * Creates a signed JWT session token
 */
export async function createSessionToken(user: UserProfile): Promise<string> {
  const secret = getJwtSecret();
  const token = await new jose.SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(secret);

  return token;
}

/**
 * Validates a session token string
 */
export async function verifySessionToken(token: string): Promise<AuthUserContext> {
  const secret = getJwtSecret();
  const { payload } = await jose.jwtVerify(token, secret);

  return {
    id: String(payload.id),
    name: String(payload.name),
    email: String(payload.email).toLowerCase().trim(),
    role: payload.role as UserRole,
    teamId: String(payload.teamId),
  };
}

/**
 * Authenticates request from cookie header AND dynamically re-validates whitelist
 * status against the Master Spreadsheet on EVERY authenticated backend request.
 */
export async function authenticateSession(req: any): Promise<AuthUserContext> {
  const cookieHeader = req.headers.cookie || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) {
    throw new Error('Unauthorized: No active session found.');
  }

  let sessionContext: AuthUserContext;
  try {
    sessionContext = await verifySessionToken(token);
  } catch (err) {
    throw new Error('Unauthorized: Session expired or invalid.');
  }

  // 🛡️ Request-Time Whitelist Revalidation:
  // Query Master Users sheet to confirm user is still on whitelist and still active
  const liveUser = await findUserByEmail(sessionContext.email);

  if (!liveUser) {
    throw new Error('Access Revoked: Your email is no longer on the authorised user whitelist.');
  }

  if (!liveUser.active) {
    throw new Error('Access Revoked: Your account has been deactivated by an administrator.');
  }

  // Return live up-to-date role and team assignment
  return {
    id: liveUser.id,
    name: liveUser.name,
    email: liveUser.email,
    role: liveUser.role,
    teamId: liveUser.teamId,
  };
}

/**
 * Enforces Super Admin role
 */
export function enforceAdmin(user: AuthUserContext): void {
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Super Administrator access required.');
  }
}

/**
 * Enforces Team Access (Super Admin or assigned Team Head/Viewer)
 */
export function enforceTeamAccess(user: AuthUserContext, targetTeamId: string): void {
  if (user.role === 'admin') {
    return;
  }

  if (user.teamId !== targetTeamId) {
    throw new Error(`Forbidden: You are not authorized to access ${targetTeamId}.`);
  }
}

/**
 * Enforces Write Access (Super Admin or assigned Team Head; Viewers cannot write)
 */
export function enforceWriteAccess(user: AuthUserContext, targetTeamId: string): void {
  if (user.role === 'viewer') {
    throw new Error('Forbidden: Read-only accounts cannot modify checklist data.');
  }

  enforceTeamAccess(user, targetTeamId);
}

/**
 * Generates Set-Cookie headers for session and CSRF
 */
export function createAuthCookies(sessionToken: string, csrfToken: string): string[] {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = 7 * 24 * 60 * 60; // 7 days

  const sessionCookie = `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`;
  const csrfCookie = `kriti_csrf_token=${csrfToken}; Path=/; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`;

  return [sessionCookie, csrfCookie];
}

/**
 * Generates deletion headers for session and CSRF cookies
 */
export function createLogoutCookies(): string[] {
  const isProd = process.env.NODE_ENV === 'production';
  return [
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`,
    `kriti_csrf_token=; Path=/; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`,
  ];
}
