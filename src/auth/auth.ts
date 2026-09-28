import type { Client } from '@libsql/client';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/libsql';
import { betterAuth } from 'better-auth';
import { APIError, addOAuthServerContext, createAuthMiddleware, getAuthoritativeSessionFromCtx, getOAuthState, isAPIError } from 'better-auth/api';
import { expo } from '@better-auth/expo';
import * as authSchema from '../persistence/auth-schema.js';
import { authHTTPPolicy, secureAuthHandler, type AuthHTTPOptions } from './http-security.js';
import { createSessionLifecycle, type SessionInvalidator } from './session-lifecycle.js';
import { createUsageLimits, type UsageLimitOptions } from './usage-limits.js';

export const INITIAL_PROFILE = Object.freeze({
  settingsVersion: '1',
  timezone: 'UTC',
  newLinesPerDay: 6,
  movesPerBlock: 4,
  accountRevision: '1',
});

const profileInitializations = new WeakMap<Client, Map<string, Promise<void>>>();
const LINK_SESSION_MAX_AGE_MS = 5 * 60 * 1000;

function isRecentLinkSession(createdAt: number, now: number) {
  return createdAt <= now && now - createdAt < LINK_SESSION_MAX_AGE_MS;
}

/** Ensure the product rows for one Better Auth user exist without replacing established state. */
export function ensureAccountProfile(client: Client, userId: string): Promise<void> {
  if (userId.length === 0) throw new TypeError('userId must not be empty');
  let byUser = profileInitializations.get(client);
  if (!byUser) {
    byUser = new Map();
    profileInitializations.set(client, byUser);
  }
  const pending = byUser.get(userId);
  if (pending) return pending;

  const initialization = initializeAccountProfile(client, userId).finally(() => {
    byUser?.delete(userId);
  });
  byUser.set(userId, initialization);
  return initialization;
}

async function initializeAccountProfile(client: Client, userId: string): Promise<void> {
  const transaction = await client.transaction('write');
  try {
    await transaction.execute({
      sql: `insert into profiles
        (user_id, settings_version, timezone, new_lines_per_day, moves_per_block)
        values (?, ?, ?, ?, ?) on conflict(user_id) do nothing`,
      args: [userId, INITIAL_PROFILE.settingsVersion, INITIAL_PROFILE.timezone,
        INITIAL_PROFILE.newLinesPerDay, INITIAL_PROFILE.movesPerBlock],
    });
    await transaction.execute({
      sql: `insert into settings_revisions
        (user_id, version, timezone, new_lines_per_day, moves_per_block)
        values (?, ?, ?, ?, ?) on conflict(user_id, version) do nothing`,
      args: [userId, INITIAL_PROFILE.settingsVersion, INITIAL_PROFILE.timezone,
        INITIAL_PROFILE.newLinesPerDay, INITIAL_PROFILE.movesPerBlock],
    });
    await transaction.execute({
      sql: 'insert into account_revisions (user_id, revision) values (?, ?) on conflict(user_id) do nothing',
      args: [userId, INITIAL_PROFILE.accountRevision],
    });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/** Sensitive delivery data: capture only in tests; never write URLs or tokens to logs. */
export interface AuthEmail {
  user: { id: string; email: string; name: string };
  url: string;
  token: string;
}

export interface AuthOptions extends AuthHTTPOptions {
  secret: string;
  onSessionInvalidated?: SessionInvalidator;
  limits?: UsageLimitOptions;
  google?: { clientId: string; clientSecret: string };
  sendVerificationEmail: (message: AuthEmail) => Promise<void>;
  sendResetPassword: (message: AuthEmail) => Promise<void>;
}

export function createZephyriovAuth(client: Client, options: AuthOptions) {
  const policy = authHTTPPolicy(options);
  const sessionLifecycle = createSessionLifecycle(client, options.onSessionInvalidated);
  const usageLimits = createUsageLimits(client, options.secret, options.limits);
  const db = drizzle({ client, schema: authSchema });
  const auth = betterAuth({
    appName: 'Zephyriov',
    baseURL: options.baseURL,
    secret: options.secret,
    session: { expiresIn: 604800, updateAge: 86400, cookieCache: { enabled: false } },
    // Replaced by atomic durable admission below; no in-memory/IP fallback.
    rateLimit: { enabled: false },
    // Provider errors may contain token-endpoint data. Never log those payloads.
    logger: { disabled: true },
    // Throw only safe API errors: the router otherwise prints raw DB parameters.
    onAPIError: { onError: (error) => {
      if (isAPIError(error)) return;
      for (let cause = error; cause instanceof Error; cause = cause.cause) {
        if (cause.message.includes('UNIQUE constraint failed: account.provider_id, account.account_id')) {
          throw new APIError('CONFLICT', { code: 'ACCOUNT_ALREADY_LINKED', message: 'Provider account already linked' });
        }
      }
      throw new APIError('INTERNAL_SERVER_ERROR', { code: 'AUTH_INTERNAL_ERROR', message: 'Authentication failed' });
    } },
    socialProviders: options.google ? {
      google: {
        ...options.google,
        scope: ['openid', 'email', 'profile'],
        disableDefaultScope: true,
        disableIdTokenSignIn: true,
        requireEmailVerification: true,
        accessType: 'online',
        includeGrantedScopes: false,
      },
    } : {},
    account: { accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      requireLocalEmailVerified: true,
      allowDifferentEmails: false,
      trustedProviders: [],
    } },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        usageLimits.requireAdmission(context.path);
        if (context.path !== '/link-social') return;
        const session = await getAuthoritativeSessionFromCtx(context);
        if (!session) throw new APIError('UNAUTHORIZED', { code: 'AUTH_REQUIRED' });
        if (!session.user.emailVerified) throw new APIError('FORBIDDEN', { code: 'EMAIL_UNVERIFIED' });
        if (!isRecentLinkSession(session.session.createdAt.getTime(), Date.now())) {
          throw new APIError('UNAUTHORIZED', { code: 'LINK_REAUTHENTICATION_REQUIRED' });
        }
        // This server-only state survives the browser redirect without trusting additionalData.
        await addOAuthServerContext({ linkSessionId: session.session.id });
      }),
    },
    user: options.google ? {
      validateUserInfo: async ({ user, source }) => {
        if (source.action !== 'link-account') return;
        const state = await getOAuthState();
        const sessionId = state?.serverContext?.linkSessionId;
        if (!state?.link || typeof sessionId !== 'string' || state.link.userId !== user.id) {
          return { error: 'LINK_REAUTHENTICATION_REQUIRED' };
        }
        const result = await client.execute({
          sql: `select s.user_id, s.created_at, s.expires_at, u.email_verified, u.email
            from session s join user u on u.id = s.user_id where s.id = ?`,
          args: [sessionId],
        });
        const row = result.rows[0];
        const now = Date.now();
        if (!row || row.user_id !== user.id || row.email_verified !== 1 ||
          row.email !== state.link.email || Number(row.expires_at) <= now ||
          !isRecentLinkSession(Number(row.created_at), now)) {
          return { error: 'LINK_REAUTHENTICATION_REQUIRED' };
        }
      },
    } : undefined,
    trustedOrigins: [...policy.origins, ...policy.nativeOrigins],
    plugins: policy.nativeOrigins.size ? [expo({ disableOriginOverride: true })] : [],
    advanced: {
      ipAddress: { disableIpTracking: true },
      useSecureCookies: options.baseURL.startsWith('https://'),
      crossSubDomainCookies: { enabled: false },
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      // Auth sessions can manage verification; business access has a separate gate.
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: (message) => usageLimits.sendEmail('reset', message, options.sendResetPassword),
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: 3600,
      autoSignInAfterVerification: false,
      sendVerificationEmail: (message) => usageLimits.sendEmail('verification', message, options.sendVerificationEmail),
    },
    databaseHooks: {
      session: {
        delete: {
          after: async (session) => sessionLifecycle.deleted({ userId: session.userId, sessionId: session.id }),
        },
      },
      user: {
        create: {
          after: async (user) => ensureAccountProfile(client, user.id),
        },
      },
    },
  });
  const handler = auth.handler;
  auth.handler = secureAuthHandler((request) => usageLimits.handleAuth(request, handler), policy);
  return Object.assign(auth, { sessionLifecycle, usageLimits });
}
