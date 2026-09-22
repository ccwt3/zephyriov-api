import { APIError } from 'better-auth/api';
import type { createZephyriovAuth } from './auth.js';

/** Business handlers must pass the request headers here before reading or writing account data. */
export async function requireVerifiedSession(
  auth: ReturnType<typeof createZephyriovAuth>,
  headers: Headers,
) {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    throw new APIError('UNAUTHORIZED', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
  }
  if (!session.user.emailVerified) {
    throw new APIError('FORBIDDEN', { code: 'EMAIL_UNVERIFIED', message: 'Email verification required' });
  }
  return session;
}
